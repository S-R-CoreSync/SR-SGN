import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { sendPasswordResetEmail } from "@/lib/email";
import { getApiMessage } from "@/lib/api-messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// حماية من الإساءة: منع إغراق بريد المستخدمين برسائل إعادة التعيين
const forgotLimiter = createRateLimiter({ maxRequests: 5, windowMs: 15 * 60_000, name: "forgot-password" });

function t(req: Request, key: string) {
  const locale = (req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
  return getApiMessage(locale, key);
}

export async function POST(req: Request) {
  const limited = tooMany(forgotLimiter, clientKey(req));
  if (limited) return limited;

  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: t(req, 'api.emailRequired') }, { status: 400 });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return NextResponse.json({ error: t(req, 'api.noAccount') }, { status: 404 });

    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour

    await prisma.passwordResetToken.create({ data: { email, token, expires } });

    const locale = (req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
    try {
      await sendPasswordResetEmail(email, token, locale);
    } catch {
      return NextResponse.json({ error: t(req, 'api.smtpError') }, { status: 500 });
    }

    return NextResponse.json({ message: t(req, 'api.emailSent') });
  } catch {
    return NextResponse.json({ error: t(req, 'api.genericError') }, { status: 500 });
  }
}
