import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin } from "@/lib/auth-helpers";

// The contact inbox is an administrative resource: require an authenticated
// session whose role is admin. Returns an error response when access is denied.
async function requireAdminSession() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!isAdmin((session.user as { role?: string } | undefined)?.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return null;
}

export async function GET() {
  const denied = await requireAdminSession();
  if (denied) return denied;
  const msgs = await prisma.contact.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(msgs);
}

export async function PATCH(req: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;
  const { id, read } = await req.json();
  await prisma.contact.update({ where: { id }, data: { read } });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: Request) {
  const denied = await requireAdminSession();
  if (denied) return denied;
  const { id } = await req.json();
  await prisma.contact.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
