import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";

/** رد المشرف على تعليق — يُنشر باسمه، ويُمنع للزوار والمستخدمين العاديين. */
export async function POST(req: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId || !(await requireAuthorize(userId, "comments.manage"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const locale = (req as any).cookies?.get?.("NEXT_LOCALE")?.value || "ar";
  const t = (key: string) => getApiMessage(locale, key);

  const { id } = await context.params;
  const body = await req.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 2000) {
    return NextResponse.json({ error: t("api.allFieldsRequired") }, { status: 400 });
  }

  try {
    const parent = await prisma.comment.findUnique({
      where: { id },
      select: { id: true, postId: true, parentId: true },
    });
    if (!parent) return NextResponse.json({ error: "not found" }, { status: 404 });

    const comment = await prisma.comment.create({
      data: {
        postId: parent.postId,
        parentId: parent.parentId || parent.id,
        author: session?.user?.name || "SGN",
        content,
        approved: true,
        userId,
      },
    });
    return NextResponse.json({ comment });
  } catch {
    return NextResponse.json({ error: t("api.internalError") }, { status: 500 });
  }
}
