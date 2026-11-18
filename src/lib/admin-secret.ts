import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * تحقّق موحّد لمسارات الإدارة الحسّاسة (sync-local-to-turso, fix-turso-images).
 *
 * - السر يأتي من متغيّر البيئة `SGN_ADMIN_SECRET` — **لا أسرار مكتوبة في الكود**.
 * - يُقبل عبر الهيدر `x-sync-secret` (المفضّل) أو `?secret=` (للتوافق).
 * - المقارنة عبر `timingSafeEqual` لمقاومة هجمات التوقيت.
 *
 * يعيد `NextResponse` عند الفشل، أو `null` عند النجاح.
 */
export const ADMIN_SECRET_ENV = "SGN_ADMIN_SECRET";

function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export function readProvidedSecret(req: NextRequest): string {
  return (
    req.headers.get("x-sync-secret")?.trim() ||
    new URL(req.url).searchParams.get("secret")?.trim() ||
    ""
  );
}

export function verifyAdminSecret(req: NextRequest): NextResponse | null {
  const expected = process.env[ADMIN_SECRET_ENV]?.trim();

  if (!expected) {
    return NextResponse.json(
      { error: `Not configured: ${ADMIN_SECRET_ENV} is missing on the server` },
      { status: 503 }
    );
  }

  const provided = readProvidedSecret(req);
  if (!provided || !safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
