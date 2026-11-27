import { prisma } from "@/lib/db";
import { HomePageClient } from "./home-page-client";
import { isPureLocaleText, localizeCategory } from "@/lib/language-guard";
import { dedupePosts } from "@/lib/post-dedup";

export const revalidate = 60;

const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  image: true,
  videoId: true,
  category: true,
  source: true,
  featured: true,
  views: true,
  locale: true,
  tags: true,
  createdAt: true,
  author: { select: { name: true } },
} as const;

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  let posts: any[] = [];
  let videoPosts: any[] = [];

  try {
    const [rawPosts, rawVideoPosts] = await Promise.all([
      prisma.post.findMany({
        // الفيديو يُعرض في قسم مستقل — استبعاده هنا يمنع ظهوره مرتين في الرئيسية
        where: { published: true, locale, source: { not: "youtube" } },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: LIST_SELECT,
      }),
      prisma.post.findMany({
        where: { published: true, source: "youtube", locale },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: LIST_SELECT,
      }),
    ]);

    const { resolveImage } = await import("@/lib/image-fallback");

    // Enforce strict language isolation: Arabic must have Arabic chars, En/Nl must NOT
    // ثم إزالة النسخ المكررة قبل أي تقطيع — لا نعرض نفس الخبر في قسمين.
    posts = dedupePosts(rawPosts.filter((p) => isPureLocaleText(p.title, locale)))
      .map((p) => ({
        ...p,
        image: resolveImage(p.image, p.title, p.category),
        category: localizeCategory(p.category || "", locale),
      }))
      .slice(0, 20);

    videoPosts = dedupePosts(rawVideoPosts.filter((p) => isPureLocaleText(p.title, locale)))
      .map((p) => ({
        ...p,
        image: resolveImage(p.image, p.title, p.category),
        category: localizeCategory(p.category || "", locale),
      }))
      .slice(0, 6);
  } catch (e) {
    console.error("[Home] Failed to fetch posts:", e);
  }

  // Single time reference for SSR and hydration (prevents relative-time mismatch).
  const renderedAt = Date.now();
  return <HomePageClient posts={posts} videoPosts={videoPosts} renderedAt={renderedAt} />;
}
