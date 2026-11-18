import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getApiMessage } from "@/lib/api-messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// 🔐 حماية من تخمين توكن إعادة تعيين كلمة السر
const resetLimiter = createRateLimiter({ maxRequests: 10, windowMs: 15 * 60_000, name: "reset-password" });

function t(req: Request, key: string) {
  const locale = (req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
  return getApiMessage(locale, key);
}

export async function POST(req: Request) {
  const limited = tooMany(resetLimiter, clientKey(req));
  if (limited) return limited;

  try {
    const { token, password } = await req.json();
    if (!token || !password) return NextResponse.json({ error: t(req, 'api.incompleteData') }, { status: 400 });
    if (password.length < 8) return NextResponse.json({ error: t(req, 'api.passwordMinLength') }, { status: 400 });

    const resetToken = await prisma.passwordResetToken.findUnique({ where: { token } });
    if (!resetToken) return NextResponse.json({ error: t(req, 'api.invalidLink') }, { status: 400 });
    if (resetToken.used) return NextResponse.json({ error: t(req, 'api.linkUsed') }, { status: 400 });
    if (resetToken.expires < new Date()) return NextResponse.json({ error: t(req, 'api.linkExpired') }, { status: 400 });

    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { email: resetToken.email }, data: { password: hashed } });
    await prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { used: true } });

    return NextResponse.json({ message: t(req, 'api.passwordChanged') });
  } catch {
    return NextResponse.json({ error: t(req, 'api.genericError') }, { status: 500 });
  }
}
