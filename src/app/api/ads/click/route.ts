import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// 🔐 حماية من تضخيم عدّاد النقرات على الإعلانات بطلبات آلية
const clickLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000, name: "ads-click" });

export async function POST(req: Request) {
  const limited = tooMany(clickLimiter, clientKey(req));
  if (limited) return limited;

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  prisma.ad.update({ where: { id }, data: { clicks: { increment: 1 } } }).catch(() => {});
  return NextResponse.json({ success: true });
}
