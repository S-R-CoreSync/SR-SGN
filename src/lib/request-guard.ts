import { NextResponse } from "next/server";
import type { RateLimiter } from "@/lib/rate-limit";

/**
 * أدوات مشتركة لحماية المسارات العامة من الإساءة (سبام / استهلاك مفاتيح AI).
 */

/** مفتاح الطلب: IP الحقيقي خلف Vercel، وإلا رأس التحويل، وإلا "unknown". */
export function clientKey(req: Request, extra?: string): string {
  const h = req.headers;
  const ip =
    h.get("x-real-ip")?.trim() ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown";
  return extra ? `${ip}:${extra}` : ip;
}

/** يعيد استجابة 429 إذا تجاوز الطلب الحدّ، أو `null` إذا كان مسموحاً. */
export function tooMany(limiter: RateLimiter, key: string): NextResponse | null {
  if (!limiter.isLimited(key)) return null;
  const retryAfter = Math.max(1, Math.ceil((limiter.getResetTime(key) - Date.now()) / 1000));
  return NextResponse.json(
    { error: `Too many requests. Try again in ${retryAfter}s.` },
    { status: 429, headers: { "Retry-After": String(retryAfter) } }
  );
}
