import { prisma } from "../db"
import type { ExtractedArticle } from "./types"
import crypto from "crypto"
import { logger } from "@/lib/logger"
import { computeSourceKey, keyTag, appendKeyTag } from "./source-key"
import { isGenericImageUrl, tagValue } from "@/lib/post-dedup"

function generateContentHash(article: ExtractedArticle): string {
  const content = `${article.title}|${article.excerpt}|${article.sourceUrl}`
  return crypto.createHash("sha256").update(content).digest("hex").slice(0, 16)
}

function generateSlug(title: string): string {
  return title
    .trim()
    .replace(/[^\w\s\u0600-\u06FF-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase()
    .slice(0, 80)
    .replace(/^-|-$/g, "")
}

/**
 * يولّد ملخّصاً عربياً موجزاً (٢-٣ جمل) عبر مزوّد الذكاء الاصطناعي.
 * يُرجِع null عند أي فشل أو إن خرج الناتج عن العزل اللغوي العربي،
 * حتى لا نُدخل نصاً غير عربي إلى القسم العربي ولا نُفشل المزامنة.
 */
async function generatePostSummary(
  title: string,
  content: string,
  excerpt?: string | null
): Promise<string | null> {
  try {
    // نلخّص العنوان + النص المتاح — نأخذ الأطول بين المقتطف والجسم (مُنزَّعَين من HTML).
    const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    const ex = strip(excerpt || "")
    const body = strip(content || "")
    const plain = body.length > ex.length ? body : ex
    if (plain.length < 300) return null
    const { generateSummary } = await import("@/lib/ai/text")
    const summary = (await generateSummary(title, plain.slice(0, 2000), "ar")).trim()
    return /[\u0600-\u06FF]/.test(summary) ? summary : null
  } catch (err) {
    logger.warn("Sync", "AI summary failed:", err instanceof Error ? err.message : err)
    return null
  }
}

async function getOrCreateSyncUser(): Promise<string> {
  let user = await prisma.user.findFirst({
    where: { role: "admin" },
    orderBy: { id: "asc" },
  })

  if (!user) {
    user = await prisma.user.findFirst({
      orderBy: { id: "asc" },
    })
  }

  if (!user) {
    user = await prisma.user.create({
      data: {
        name: "System Sync",
        email: "sync@sy-nl.local",
        role: "admin",
        password: crypto.randomBytes(32).toString("hex"),
      },
    })
  }

  return user.id
}

async function findExistingBySourceInfo(source: string, url: string, locale: string) {
  return await prisma.post.findFirst({
    where: { tags: { contains: `__source:${source}:${url}` }, locale },
    select: { id: true, category: true, tags: true, image: true }
  })
}

async function findExistingByContentHash(hash: string, locale: string) {
  return await prisma.post.findFirst({
    where: { tags: { contains: `__hash:${hash}` }, locale },
    select: { id: true, category: true, tags: true, image: true }
  })
}

async function findExistingByStableKey(sourceKey: string, locale: string) {
  return await prisma.post.findFirst({
    where: { tags: { contains: keyTag(sourceKey) }, locale },
    select: { id: true, category: true, tags: true, image: true }
  })
}

/**
 * صورة قناة/موقع عامة تُستخدم لعدة أخبار مختلفة ليست صورة للخبر.
 * نكتشفها بمقارنة الوسوم: إن كانت مستخدمة من خبر آخر (مفتاح مختلف)
 * فهي صورة مشتركة ولا يجوز حفظها كصورة لهذا الخبر.
 */
async function isSharedImage(
  image: string,
  sourceKey: string,
  sourceTag: string
): Promise<boolean> {
  if (isGenericImageUrl(image)) return true
  try {
    const rows = await prisma.post.findMany({
      where: { image },
      select: { tags: true },
      take: 60,
    })
    for (const row of rows) {
      const key = tagValue(row.tags, "__key:")
      if (key) {
        if (key !== sourceKey) return true
        continue
      }
      // صف قديم بلا مفتاح: نفس الخبر له وسم مصدر مطابق تماماً
      const otherSource = tagValue(row.tags, "__source:")
      if (otherSource && otherSource !== sourceTag) return true
    }
  } catch (err) {
    logger.warn("Sync", "image ownership check failed:", err instanceof Error ? err.message : err)
  }
  return false
}

export async function syncArticleToDb(
  article: ExtractedArticle,
  category: string,
  locale: string = "ar"
): Promise<{ status: "new" | "updated" | "skipped"; id?: string }> {
  const contentHash = generateContentHash(article)

  const sourceInfo = `${article.source || "unknown"}:${article.sourceUrl}`
  const sourceKey = computeSourceKey({
    source: article.source || "unknown",
    sourceUrl: article.sourceUrl,
    stableId: article.stableId,
    videoId: article.videoId,
  })
  const existingByKey = await findExistingByStableKey(sourceKey, locale)
  const existingByUrl = await findExistingBySourceInfo(article.source || "unknown", article.sourceUrl, locale)
  const existingByHash = await findExistingByContentHash(contentHash, locale)

  const existing = existingByKey || existingByUrl || existingByHash
  if (existing) {
    const updates: Record<string, unknown> = {}
    if (existing.category !== category) updates.category = category

    // نمنح الصفوف القديمة هوية ثابتة حتى تتوقف إعادة المزامنة عن تكرارها
    if (!tagValue(existing.tags, "__key:")) {
      updates.tags = appendKeyTag(existing.tags, sourceKey)
    }

    // لا نكتب صورة عامة/مشتركة فوق صورة موجودة، ولا نستبدل صورة حقيقية بصورة قناة
    if (
      article.image &&
      isGenericImageUrl(existing.image) &&
      !(await isSharedImage(article.image, sourceKey, sourceInfo))
    ) {
      updates.image = article.image
    }

    if (Object.keys(updates).length > 0) {
      await prisma.post.update({
        where: { id: existing.id },
        data: updates as any,
      })
      return { status: "updated", id: existing.id }
    }
    return { status: "skipped" }
  }

  const baseSlug = generateSlug(article.title)
  const slug = locale === "ar" ? baseSlug : `${baseSlug}-${locale}`
  
  if (slug) {
    const existingSlug = await prisma.post.findUnique({ where: { slug } })
    if (existingSlug) return { status: "skipped" }
  }

  const authorId = await getOrCreateSyncUser()

  const tags = appendKeyTag(
    [
      ...article.tags,
      `__hash:${contentHash}`,
      `__source:${sourceInfo}`,
    ].join(","),
    sourceKey
  )

  let finalContent = article.content
  let finalImage = article.image || null

  try {
    const { processArticleMedia, downloadMedia } = await import("./media")
    // Process content (download any images in content)
    const mediaResult = await processArticleMedia(article.content, article.sourceUrl)
    finalContent = mediaResult.content

    // Process main article.image
    if (article.image) {
      const localImage = await downloadMedia(article.image, article.sourceUrl)
      if (localImage) {
        finalImage = localImage
      }
    } else if (mediaResult.thumbnail) {
      finalImage = mediaResult.thumbnail
    }
  } catch (err) {
    logger.error("Sync", "Error downloading media in syncArticleToDb:", err)
  }

  // صورة مشتركة بين أخبار مختلفة = صورة قناة/شعار، ليست صورة هذا الخبر.
  // نتركها فارغة ليعرض الواجهةPlaceholder فريداً بعنوان المقال.
  if (finalImage && (await isSharedImage(finalImage, sourceKey, sourceInfo))) {
    finalImage = null
  }

  const post = await prisma.post.create({
    data: {
      title: article.title,
      content: finalContent,
      excerpt: article.excerpt || null,
      image: finalImage,
      videoId: article.videoId || null,
      category,
      tags,
      source: article.source || article.sourceUrl,
      featured: false,
      published: true,
      slug: slug || undefined,
      authorId,
      locale,
      createdAt: article.publishedAt,
    },
  })

  // 🤖 ملخّص ذكي (٢-٣ جمل) للخبر العربي — يُعرض في بطاقات قسم الأخبار.
  // غير حرج: أي فشل هنا لا يجوز أن يُسقط المزامنة أو يمنع حفظ الخبر.
  if (locale === "ar") {
    const summary = await generatePostSummary(article.title, finalContent, article.excerpt)
    if (summary) {
      await prisma.post.update({ where: { id: post.id }, data: { summary } })
    }
  }

  return { status: "new", id: post.id }
}
