import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";

const LOCALES = ["ar", "en", "nl"] as const;
type Locale = (typeof LOCALES)[number];

export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || !(await requireAuthorize(userId, "users.edit_role"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const decision = body.decision === "confirmed" ? "confirmed" : body.decision === "rejected" ? "rejected" : "";
  if (!decision) return NextResponse.json({ error: "invalid decision" }, { status: 400 });

  const approval = await prisma.aIApproval.findFirst({
    where: { id, kind: "identity_review", status: "pending" },
    select: { id: true },
  });
  if (!approval) return NextResponse.json({ error: "not found" }, { status: 404 });

  const localeCookie = (req as any).cookies?.get?.("NEXT_LOCALE")?.value;
  const locale: Locale = LOCALES.includes(localeCookie as Locale) ? (localeCookie as Locale) : "ar";
  const label = getApiMessage(locale, `ai.identityDecision.${decision}`);

  await prisma.aIApproval.update({
    where: { id: approval.id },
    data: {
      status: decision === "confirmed" ? "approved" : "rejected",
      reviewedBy: userId,
      reviewedAt: new Date(),
      reviewNote: label,
    },
  });
  await prisma.activityLog.create({
    data: {
      memberId: userId as string,
      userId: userId as string,
      action: getApiMessage(locale, "ai.identityDecisionActivity"),
      details: label.slice(0, 200),
    },
  });

  // Deliberately no member status update: this is a recorded human decision only.
  return NextResponse.json({ ok: true, decision });
}
