import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  autoLinkByEmail,
  linkBoardMemberToUser,
  sanitizeBoardInput,
  type LinkedAccount,
} from "@/lib/board-admin";
import { logger } from "@/lib/logger";

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
}

function parseLists(record: any) {
  return {
    ...record,
    committees: (() => { try { return JSON.parse(record.committees || "[]"); } catch { return []; } })(),
    bioPoints: (() => { try { return JSON.parse(record.bioPoints || "[]"); } catch { return []; } })(),
  };
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return unauthorized();

  const { id } = await params;
  try {
    const body = await req.json();
    const data = sanitizeBoardInput(body);
    const explicitLink = "userId" in data;

    // الربط اليدوي يتم بمنطق منفصل لضمان تحديث دور الحساب
    const requestedUserId = data.userId as string | null | undefined;
    delete data.userId;

    const updated = await (prisma as any).boardMember.update({
      where: { id },
      data,
    });

    let account: LinkedAccount | null = null;
    if (explicitLink) {
      if (requestedUserId) {
        account = await linkBoardMemberToUser(
          id,
          requestedUserId,
          String(data.role || updated.role || "member")
        );
      } else {
        // فك الربط: لا نغيّر دور الحساب، فقط نزيل الرابط
        await (prisma as any).boardMember.update({ where: { id }, data: { userId: null } });
      }
    } else {
      account = await autoLinkByEmail(id, data.email as string | null | undefined, String(data.role || updated.role || "member"));
    }

    const fresh = await (prisma as any).boardMember.findUnique({ where: { id } });
    return NextResponse.json({ ...parseLists(fresh), account });
  } catch (error) {
    logger.error("API/board", "error:", error);
    return NextResponse.json({ error: "Failed to update member" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user || (session.user as any).role !== "admin") return unauthorized();

  const { id } = await params;
  try {
    await (prisma as any).boardMember.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("API/board", "error:", error);
    return NextResponse.json({ error: "Failed to delete member" }, { status: 500 });
  }
}
