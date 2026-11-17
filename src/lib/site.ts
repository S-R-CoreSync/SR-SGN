/**
 * إعدادات الموقع المركزية (Central site configuration)
 *
 * مصدر واحد للحقيقة بالنسبة لرابط الموقع العام.
 * - في الإنتاج: Vercel → https://sgn-drab.vercel.app
 * - محلياً: يمكن تجاوزه عبر NEXT_PUBLIC_APP_URL=http://localhost:3000
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "https://sgn-drab.vercel.app"
).replace(/\/+$/, "");

/** يبني رابطاً مطلقاً انطلاقاً من مسار داخلي */
export function siteUrl(path = "/"): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
