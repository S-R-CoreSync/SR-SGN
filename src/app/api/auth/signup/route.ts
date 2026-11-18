import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { getApiMessage } from "@/lib/api-messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// 🔐 حماية من إنشاء حسابات وهمية بالجملة
const signupLimiter = createRateLimiter({ maxRequests: 5, windowMs: 60 * 60_000, name: "auth-signup" });

function t(req: Request, key: string) {
  const locale = (req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
  return getApiMessage(locale, key);
}

export async function POST(req: Request) {
  const limited = tooMany(signupLimiter, clientKey(req));
  if (limited) return limited;

  try {
    const { name, email, password } = await req.json();
    if (!name || !email || !password) return NextResponse.json({ error: t(req, 'api.allFieldsRequired') }, { status: 400 });
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: t(req, 'api.emailInUse') }, { status: 400 });
    const hashed = await bcrypt.hash(password, 12);
    await prisma.user.create({ data: { name, email, password: hashed } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: t(req, 'api.internalError') }, { status: 500 });
  }
}
