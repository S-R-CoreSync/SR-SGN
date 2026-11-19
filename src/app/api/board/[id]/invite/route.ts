import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { sendBoardInviteEmail } from "@/lib/email";
import { sendBoardInviteWhatsApp } from "@/lib/whatsapp";
import { autoLinkByEmail } from "@/lib/board-admin";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;
  try {
    const body = await req.json();
    const channel = body.channel === "whatsapp" ? "whatsapp" : "email";
    const locale = ["ar", "en", "nl"].includes(body.locale) ? body.locale : "ar";

    const member = await (prisma as any).boardMember.findUnique({ where: { id } });
    if (!member) return NextResponse.json({ error: "Member not found" }, { status: 404 });

    // إذا كان العضو سجّل دخوله أصلاً — نربطه الآن ونمنحه دوره قبل الإرسال
    await autoLinkByEmail(id, member.email, member.role);

    let delivered = false;
    if (channel === "email") {
      if (!member.email) {
        return NextResponse.json({ error: "NO_EMAIL" }, { status: 400 });
      }
      delivered = await sendBoardInviteEmail(member.email, member.nameAr, locale);
    } else {
      if (!member.phone) {
        return NextResponse.json({ error: "NO_PHONE" }, { status: 400 });
      }
      delivered = await sendBoardInviteWhatsApp(member.phone, member.nameAr, locale);
    }

    await (prisma as any).boardMember.update({
      where: { id },
      data: { invitedAt: new Date() },
    });

    return NextResponse.json({ success: true, channel, delivered });
  } catch (error) {
    console.error("[Board invite] error:", error);
    return NextResponse.json({ error: "Failed to send invite" }, { status: 500 });
  }
}
