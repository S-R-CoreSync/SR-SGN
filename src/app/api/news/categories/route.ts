import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { dedupePosts } from "@/lib/post-dedup";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const locale = searchParams.get("locale") || "ar";
    const { localizeCategory } = await import("@/lib/language-guard");

    // العدّ بعد إزالة التكرار — groupBy كان يحسب نسخ المقال الواحد كأخبار منفصلة
    const rows = await prisma.post.findMany({
      where: { published: true, locale },
      select: { id: true, title: true, category: true, tags: true, locale: true, image: true },
    });
    const counts = new Map<string, number>();
    for (const post of dedupePosts(rows)) {
      const category = post.category || "";
      counts.set(category, (counts.get(category) || 0) + 1);
    }
    const categories = Array.from(counts, ([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);

    return NextResponse.json(
      categories.map(c => ({
        name: localizeCategory(c.category, locale),
        rawName: c.category,
        count: c.count,
      })),
      {
        headers: {
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error) {
    logger.error("API/news/categories", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
