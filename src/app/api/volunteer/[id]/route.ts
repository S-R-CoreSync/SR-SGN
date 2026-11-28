import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { logActivity } from "@/lib/activity";

const STATUSES = ["new", "contacted", "approved", "rejected"] as const;
type Status = (typeof STATUSES)[number];

/** تحديث حالة المتطوع — قرار بشري محض، لا أتمتة ولا تغيير في بيانات العضوية. */
export async function PATCH(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || !(await requireAuthorize(userId, "volunteers.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const status = body.status as Status;
  if (!STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const { id } = await context.params;
  try {
    const volunteer = await prisma.volunteer.update({
      where: { id },
      data: { status },
    });
    await logActivity(`volunteer-${id}`, "Volunteer status", `Status set to ${status}`, userId);
    return NextResponse.json({ volunteer });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
