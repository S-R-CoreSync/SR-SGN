import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";
import { logger } from "@/lib/logger";

// 🔐 منع تضخيم عدّاد المشاهدات وجدول memberView بطلبات آلية
const profileLimiter = createRateLimiter({ maxRequests: 60, windowMs: 60_000, name: "member-profile" });

function t(_req: Request, key: string) {
  const locale = (_req as any).cookies?.get?.('NEXT_LOCALE')?.value || 'ar';
  return getApiMessage(locale, key);
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const limited = tooMany(profileLimiter, clientKey(_req));
  if (limited) return limited;

  const { id } = await params;
  const member = await prisma.member.findUnique({
    where: { id, status: "accepted", showInPublicProfile: true },
    select: {
      id: true, memberNumber: true, nameAr: true, nameNl: true, birthYear: true, gender: true,
      originCity: true, nlProvincie: true, nlCity: true,
      educationLevel: true, profession: true, skills: true, maritalStatus: true,
      expNl: true, expOutside: true, createdAt: true,
      isCvPublic: true, isServiceProvider: true, serviceDescription: true,
    },
  });
  if (!member) {
    return NextResponse.json({ error: t(_req, 'api.notFound') }, { status: 404 });
  }

  // Hide CV details if CV is not public
  if (!member.isCvPublic) {
    member.educationLevel = null;
    member.profession = null;
    member.skills = null;
    member.maritalStatus = null;
    member.expNl = null;
    member.expOutside = null;
  }

  // Increment view count asynchronously
  try {
    await prisma.member.update({
      where: { id: member.id },
      data: { views: { increment: 1 } }
    });
    // Record detailed view
    await prisma.memberView.create({
      data: { memberId: member.id }
    });
  } catch (e) {
    logger.error("API/member", "View increment error:", e);
  }

  return NextResponse.json(member);
}
