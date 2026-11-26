/**
 * منع تكرار الأخبار وقت القراءة (Read-time dedup).
 *
 * الفكرة: كل خبر له هوية ثابتة تُخزَّن في الوسوم كـ __key:<hash>.
 * الصفوف القديمة اللي ما عندها مفتاح تُطابق بوسم المصدر أو بالعنوان،
 * فلا نحتاج حذف أي صف ولا تغيير مخطط قاعدة البيانات.
 *
 * لا تلمس دوال العزل اللغوي هنا — هذه مجرد أداة تجميع/اختيار.
 */

export interface DedupablePost {
  id: string
  title: string
  locale?: string | null
  tags?: string | null
  image?: string | null
  category?: string | null
  source?: string | null
  videoId?: string | null
}

/** قراءة قيمة وسم مخفي من سلسلة الوسوم (__key:xxx,__source:yyy). */
export function tagValue(tags: string | null | undefined, prefix: string): string | null {
  if (!tags) return null
  for (const part of tags.split(",")) {
    const tag = part.trim()
    if (tag.startsWith(prefix)) return tag.slice(prefix.length)
  }
  return null
}

/**
 * الصور العامة (Unsplash / placehold) ما تعتبر صورة حقيقية للخبر،
 * فلا تُستخدم كسبب لإبقاء صف على حساب صف آخر عند الدمج.
 */
export function isGenericImageUrl(image?: string | null): boolean {
  if (!image) return true
  const value = image.trim()
  if (!value) return true
  return (
    value.includes("images.unsplash.com/") ||
    value.includes("source.unsplash.com/") ||
    value.includes("placehold.co/") ||
    value.includes("/api/placeholder")
  )
}

function normalizeTitle(title: string): string {
  return title
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670]/g, "")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .slice(0, 120)
}

/** مفتاح التجميع: اللغة + هوية ثابتة، مع توافق كامل مع البيانات القديمة. */
export function postDedupKey(post: DedupablePost): string {
  const locale = post.locale || ""
  const stableKey = tagValue(post.tags, "__key:")
  if (stableKey) return `${locale}|key:${stableKey}`

  const sourceTag = tagValue(post.tags, "__source:")
  if (sourceTag) return `${locale}|source:${sourceTag}`

  if (post.videoId) return `${locale}|video:${post.videoId}`

  return `${locale}|title:${normalizeTitle(post.title)}`
}

/**
 * يرجّع صفاً واحداً لكل خبر. الترتيب الأصلي (الأحدث أولاً) محفوظ،
 * وعند وجود صفين بنفس المفتاح نختار اللي عنده صورة حقيقية.
 */
export function dedupePosts<T extends DedupablePost>(posts: T[]): T[] {
  const picked = new Map<string, T>()

  for (const post of posts) {
    const key = postDedupKey(post)
    const current = picked.get(key)
    if (!current) {
      picked.set(key, post)
      continue
    }
    if (isGenericImageUrl(current.image) && !isGenericImageUrl(post.image)) {
      picked.set(key, post)
    }
  }

  return Array.from(picked.values())
}
