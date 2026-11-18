import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// حماية من تخمين رمز OTP: ١٠ محاولات كل ١٠ دقائق لكل IP + معرّف
const verifyLimiter = createRateLimiter({ maxRequests: 10, windowMs: 10 * 60_000, name: "otp-verify" });

function tReq(req: Request, key: string) {
  const locale = (req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
  return getApiMessage(locale, key);
}

export async function POST(req: Request) {
  try {
    const { identifier, code } = await req.json();

    const limited = tooMany(verifyLimiter, clientKey(req, String(identifier || "")));
    if (limited) return limited;

    if (!identifier || !code) {
      return NextResponse.json({ error: tReq(req, 'api.otpCodeRequired') }, { status: 400 });
    }

    const otp = await prisma.otpCode.findFirst({
      where: {
        identifier,
        code,
        used: false,
        expiresAt: { gte: new Date() },
      },
    });

    if (!otp) {
      return NextResponse.json({ error: tReq(req, 'api.otpInvalid') }, { status: 400 });
    }

    await prisma.otpCode.update({
      where: { id: otp.id },
      data: { used: true },
    });

    return NextResponse.json({ message: tReq(req, 'api.otpVerified'), verified: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}