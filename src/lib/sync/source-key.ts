import crypto from "crypto"

export interface SourceKeyInput {
  source: string
  sourceUrl: string
  stableId?: string | null
  videoId?: string | null
}

/** معرّف منشور فيسبوك من أي صيغة رابط متاحة. */
export function extractFacebookPostId(url: string): string | null {
  const patterns = [
    /\/posts\/(\d+)/,
    /\/photos\/[\w.-]*?(\d{10,})/,
    /[?&](?:story_fbid|fbid|id)=(\d+)/,
    /\/(\d{10,})\/?$/,
  ]
  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match?.[1]) return match[1]
  }
  return null
}

/**
 * هوية ثابتة للخبر قبل الترجمة — ما تتغيّر بتغيير العنوان المترجم.
 * الأولوية: معرّف خارجي (يوتيوب/فيسبوك/RSS guid) ثم رابط المصدر.
 */
export function computeSourceKey(input: SourceKeyInput): string {
  let base: string
  if (input.stableId) {
    base = input.stableId
  } else if (input.videoId) {
    base = `yt:${input.videoId}`
  } else {
    const facebookId = extractFacebookPostId(input.sourceUrl)
    if (input.source === "facebook-sgn" && facebookId) {
      base = `fb:${facebookId}`
    } else {
      base = `${input.source || "unknown"}:${input.sourceUrl || ""}`
    }
  }
  return crypto.createHash("sha256").update(base).digest("hex").slice(0, 24)
}

export function keyTag(key: string): string {
  return `__key:${key}`
}

/** يضيف المفتاح إلى الوسوم ويحذف أي مفتاح قديم، بدون لمس باقي الوسوم. */
export function appendKeyTag(tags: string | null | undefined, key: string): string {
  const parts = (tags || "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean)
    .filter((tag) => !tag.startsWith("__key:"))
  parts.push(keyTag(key))
  return parts.join(",")
}
