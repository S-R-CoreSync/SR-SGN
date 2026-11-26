import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isPureLocaleText, localizeCategory } from "@/lib/language-guard";
import { dedupePosts } from "@/lib/post-dedup";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 50);
  const cursor = searchParams.get("cursor");
  const locale = searchParams.get("locale") || "ar";

  try {
    const where: Record<string, unknown> = { published: true, locale };
    if (category) where.category = category;

    // نافذة أوسع لأن الفلترة اللغوية وإزالة التكرار تأتي بعد الاستعلام،
    // و الكورسر يُحسب بعدهما حتى لا يإشير إلى خبر محذوف من النتيجة.
    const fetchSize = Math.min(Math.max(limit * 3, 30), 200);
    const rawPosts = await prisma.post.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: fetchSize,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        image: true,
        category: true,
        locale: true,
        tags: true,
        createdAt: true,
        views: true,
        author: { select: { name: true } },
      },
    });

    const { resolveApiImage } = await import("@/lib/image-fallback");
    const uniquePosts = dedupePosts(rawPosts.filter((p) => isPureLocaleText(p.title, locale)));
    const filteredPosts = uniquePosts.slice(0, limit).map((p) => ({
      ...p,
      image: resolveApiImage(p.image, p.title, p.category),
      category: localizeCategory(p.category || "", locale),
    }));

    const hasMore = uniquePosts.length > limit || rawPosts.length === fetchSize;
    const nextCursor = hasMore
      ? (filteredPosts[filteredPosts.length - 1]?.id || rawPosts[rawPosts.length - 1]?.id || null)
      : null;

    return NextResponse.json({ posts: filteredPosts, nextCursor });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
