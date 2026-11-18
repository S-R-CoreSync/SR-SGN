import { createHmac, timingSafeEqual } from "crypto";

/**
 * 🔐 توقيع توكن تطبيق الموبايل.
 *
 * المشكلة القديمة: `/api/auth/login` كان يرجّع **معرّف المستخدم نفسه** كتوكن،
 * و`getSessionUser` كان يقبله كما هو — أي أن أي شخص يعرف `user.id` يستطيع
 * انتحال شخصية صاحب الحساب (قراءة/تعديل بياناته، الخزنة، الإشعارات…).
 * معرّف المستخدم ليس سرّاً، لذلك وُجد هذا الملف: التوكن = المعرّف + توقيع HMAC.
 *
 * الصيغة:  v1.<userId>.<sig>     حيث sig = base64url(HMAC-SHA256(userId))
 *
 * السر: `MOBILE_TOKEN_SECRET` (مفضّل)، وإلا `NEXTAUTH_SECRET`، وإلا `SGN_ADMIN_SECRET`.
 * ملاحظة: التطبيق لا يحتاج تعديلاً — يخزّن التوكن كنص ويرسله كما هو.
 * المستخدمون القدامى (توكن = معرّف خام) سيُطلب منهم تسجيل الدخول من جديد.
 */

const VERSION = "v1";

function getSecret(): string {
  return (
    process.env.MOBILE_TOKEN_SECRET?.trim() ||
    process.env.NEXTAUTH_SECRET?.trim() ||
    process.env.SGN_ADMIN_SECRET?.trim() ||
    ""
  );
}

function sign(userId: string, secret: string): string {
  return createHmac("sha256", secret).update(`${VERSION}.${userId}`).digest("base64url");
}

export function signMobileToken(userId: string): string {
  const secret = getSecret();
  if (!secret) {
    // لا نُصدر توكن غير موقَّع أبداً — الخطأ يظهر بالسجل بدل الفشل الصامت.
    throw new Error("MOBILE_TOKEN_SECRET (or NEXTAUTH_SECRET / SGN_ADMIN_SECRET) is not configured");
  }
  return `${VERSION}.${userId}.${sign(userId, secret)}`;
}

/** يعيد `userId` إذا كان التوكن صالحاً، وإلا `null`. */
export function verifyMobileToken(token: string): string | null {
  const secret = getSecret();
  if (!secret || !token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [version, userId, sig] = parts;
  if (version !== VERSION || !userId || !sig) return null;

  const expected = sign(userId, secret);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return null;
  if (!timingSafeEqual(a, b)) return null;

  return userId;
}
