import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";

/**
 * 🔐 صندوق رسائل التواصل — للمشرفين فقط.
 * كان سابقاً يكفي أن يكون الزائر **مسجّلاً** ليقرأ كل رسائل الناس
 * (أسماء، بريد، محتوى) ويحذفها.
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !isAdmin((session.user as any).role)) return null;
  return session;
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const msgs = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(msgs);
}

export async function PATCH(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id, read } = await req.json();
  await prisma.contact.update({ where: { id }, data: { read } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  const { id } = await req.json();
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
