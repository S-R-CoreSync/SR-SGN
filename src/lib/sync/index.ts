import type { SyncSource, ExtractedArticle, SyncResult, SyncConfig } from "./types"
import { DEFAULT_SOURCES } from "./types"
import { extractArticles } from "./extractor"
import { categorizeByMapping, categorizeWithAI } from "./categorizer"
import { processArticleMedia } from "./media"
import { syncArticleToDb } from "./db-sync"
import { prisma } from "../db"

export type { SyncSource, ExtractedArticle, SyncResult, SyncConfig }
export { DEFAULT_SOURCES }
export { extractArticles } from "./extractor"
export { categorizeByMapping, categorizeWithAI } from "./categorizer"
export { downloadMedia, processArticleMedia, extractIframeUrl } from "./media"
export { syncArticleToDb } from "./db-sync"

/** تنفيذ المهام مع حدٍّ أقصى للتوازي (يمنع إغراق مزوّد الذكاء الاصطناعي). */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const index = cursor++
      if (index >= items.length) return
      results[index] = await fn(items[index])
    }
  })
  await Promise.all(workers)
  return results
}

/**
 * يجلب اللغات المنشورة مسبقاً لكل رابط مصدر، بطلب واحد لكل دفعة روابط.
 * الهدف: عدم إعادة ترجمة/تصنيف مقال موجود أصلاً — كان هذا سبب بطء المزامنة
 * (كل تشغيل كان يترجم كل المقالات من جديد لثلاث لغات).
 */
async function getSyncedLocales(sourceName: string, articles: ExtractedArticle[]): Promise<Map<string, Set<string>>> {
  const byUrl = new Map<string, Set<string>>()
  const urls = Array.from(new Set(articles.map((a) => a.sourceUrl).filter(Boolean)))
  if (urls.length === 0) return byUrl

  const CHUNK = 40
  for (let i = 0; i < urls.length; i += CHUNK) {
    const slice = urls.slice(i, i + CHUNK)
    try {
      const rows = await prisma.post.findMany({
        where: { OR: slice.map((url) => ({ tags: { contains: `__source:${sourceName}:${url}` } })) },
        select: { tags: true, locale: true },
      })
      const prefix = `__source:${sourceName}:`
      for (const row of rows) {
        if (!row.tags) continue
        const tag = row.tags.split(",").find((t) => t.startsWith(prefix))
        if (!tag) continue
        const url = tag.slice(prefix.length)
        if (!byUrl.has(url)) byUrl.set(url, new Set())
        byUrl.get(url)!.add(row.locale)
      }
    } catch (err) {
      // الفحص المسبق تحسين أداء فقط — لا يجوز أن يُفشل المزامنة
      console.error("[Sync] pre-check failed:", err)
    }
  }
  return byUrl
}

export async function runSync(
  sources?: SyncSource[],
  config?: Partial<SyncConfig>
): Promise<SyncResult[]> {
  const targets = sources || DEFAULT_SOURCES
  const results: SyncResult[] = []
  const autoCategorize = config?.autoCategorize ?? true
  const downloadMedia = config?.downloadMedia ?? true
  // سقف عدد المقالات لكل مصدر في التشغيل الواحد (يحمي من استهلاك AI غير المحدود)
  const limitPerSource = Math.max(1, Math.min(config?.limit ?? 25, 100))
  const concurrency = Math.max(1, Math.min(config?.concurrency ?? 3, 8))
  // توازي اللغات داخل المقال — يبقى منخفضاً لاحترام حدود المزوّد (RPM)
  const localeConcurrency = 2

  for (const source of targets) {
    if (!source.enabled) {
      results.push({
        success: true,
        source: source.name,
        fetched: 0,
        new: 0,
        updated: 0,
        skipped: 0,
        errors: [],
        duration: 0,
      })
      continue
    }

    const start = Date.now()
    const result: SyncResult = {
      success: true,
      source: source.name,
      fetched: 0,
      new: 0,
      updated: 0,
      skipped: 0,
      errors: [],
      duration: 0,
    }

    try {
      const extracted = await extractArticles(source)
      result.fetched = extracted.length

      // الأحدث أولاً ثم السقف — المزامنة تخدم الجديد أساساً
      const newest = [...extracted]
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())
        .slice(0, limitPerSource)

      // ترتيب تصاعدي للحفظ الزمني الصحيح
      const sortedArticles = newest.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime())

      const syncedLocales = await getSyncedLocales(source.name, sortedArticles)

      await mapLimit(sortedArticles, concurrency, async (article) => {
        const isCommunityNews = !source.translate
        const allLocales = isCommunityNews ? ["ar"] : ["ar", "nl", "en"]
        const already = syncedLocales.get(article.sourceUrl)

        // تجاوز اللغات المنشورة مسبقاً (لا ترجمة ولا تصنيف ولا وسائط)
        const targetLocales = allLocales.filter((l) => !already?.has(l))
        if (targetLocales.length === 0) {
          result.skipped += allLocales.length
          return
        }
        result.skipped += allLocales.length - targetLocales.length

        // اللغات بالتوازي بدل التسلسل
        await mapLimit(targetLocales, localeConcurrency, async (targetLocale) => {
          try {
            let finalArticle = { ...article }
            if (source.translate) {
              const { translateArticleToLocale } = await import("./translator")
              finalArticle = await translateArticleToLocale(article, targetLocale)
            }

            let category: string
            if (source.category) {
              category = source.category
            } else if (autoCategorize) {
              category = await categorizeWithAI(finalArticle)
            } else {
              category = finalArticle.category
            }

            // ملاحظة: معالجة الوسائط تتم داخل syncArticleToDb — لا نكرّرها هنا
            // (كانت تُنفَّذ مرتين لكل مقال، وهذا كان يضاعف زمن المزامنة).
            void downloadMedia

            // Never save untranslated non-Arabic text into Arabic locale
            if (targetLocale === "ar" && !/[\u0600-\u06FF]/.test(finalArticle.title)) {
              console.warn(`[Sync] Skipping untranslated non-Arabic article for locale ar: "${finalArticle.title.slice(0, 40)}"`)
              return
            }

            const syncResult = await syncArticleToDb(finalArticle, category, targetLocale)
            if (syncResult.status === "new") result.new++
            else if (syncResult.status === "updated") result.updated++
            else result.skipped++
          } catch (err) {
            result.errors.push(
              `Locale ${targetLocale} - Article "${article.title.slice(0, 50)}": ${err instanceof Error ? err.message : String(err)}`
            )
          }
        })
      })
    } catch (err) {
      result.success = false
      result.errors.push(
        `Source "${source.name}": ${err instanceof Error ? err.message : String(err)}`
      )
    }

    result.duration = Date.now() - start
    results.push(result)
  }

  return results
}
