import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { signMobileToken } from "@/lib/mobile-token";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// 🔐 حماية من تخمين كلمة السر: ٨ محاولات كل ١٠ دقائق لكل IP + بريد
const loginLimiter = createRateLimiter({ maxRequests: 8, windowMs: 10 * 60_000, name: "mobile-login" });

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const limited = tooMany(loginLimiter, clientKey(req, String(email).toLowerCase()));
    if (limited) return limited;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
      // توكن موقّع بـ HMAC — لا نُعيد معرّف المستخدم الخام أبداً
      token: signMobileToken(user.id),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
