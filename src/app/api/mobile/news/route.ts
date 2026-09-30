import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPureLocaleText, localizeCategory } from "@/lib/language-guard";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const cursor = searchParams.get("cursor");
  const locale = searchParams.get("locale") || "ar";

  try {
    const where: Record<string, unknown> = { published: true, locale };
    if (category) where.category = category;

    const posts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit + 1,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
        category: true,
        createdAt: true,
        views: true,
        author: { select: { name: true } },
      },
    });

    let nextCursor: string | null = null;
    if (posts.length > limit) {
      const next = posts.pop();
      nextCursor = next!.id;
    }

    const filteredPosts = posts
      .filter((p) => isPureLocaleText(p.title, locale))
      .map((p) => ({ ...p, category: localizeCategory(p.category, locale) }));

    return NextResponse.json({ posts: filteredPosts, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
