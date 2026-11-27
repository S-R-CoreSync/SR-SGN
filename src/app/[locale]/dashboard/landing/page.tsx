import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db";
import { isPureLocaleText, localizeCategory } from "@/lib/language-guard";
import { dedupePosts } from "@/lib/post-dedup";
import { relativeTimeKey, relativeTimeParts } from "@/lib/relative-time";
import { TopBar } from "@/components/home/top-bar";
import { SiteHeader } from "@/components/home/site-header";
import { BreakingNews } from "@/components/home/breaking-news";
import { HeroSection } from "@/components/home/hero-section";
import { CategoryGrid } from "@/components/home/category-grid";
import { FeaturedList } from "@/components/home/featured-list";
import { Sidebar } from "@/components/home/sidebar";
import { MoreNews } from "@/components/home/more-news";
import { LatestVideos } from "@/components/home/latest-videos";
import { Newsletter } from "@/components/home/newsletter";
import { Ads } from "@/components/ads";
import { CommunityStats } from "@/components/community-stats";

export default async function Home({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const ts = await getTranslations({ locale, namespace: "site" });
  const renderedAt = Date.now();

  // Pure calculation from one fixed reference: SSR and hydration render identical text.
  const timeAgo = (date: Date) => {
    const { unit, count } = relativeTimeParts(date, renderedAt);
    return t(relativeTimeKey(unit), { count });
  };

  const rawPosts = await prisma.post.findMany({
    where: { published: true, locale },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: {
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
      createdAt: true,
      author: { select: { name: true } },
    },
  });

  const posts = dedupePosts(rawPosts.filter((p) => isPureLocaleText(p.title, locale)));
  const videoPosts = posts.filter((p: any) => p.videoId || p.source === "youtube").slice(0, 4);

  const general = t("common.generalCategory");
  const community = ts("shortTitle");

  const featured = posts.slice(0, 4).map((p: any) => ({
    title: p.title,
    cat: localizeCategory(p.category || "", locale) || general,
    img: p.image,
    excerpt: p.excerpt || "",
    author: p.author?.name || community,
    time: timeAgo(p.createdAt),
    slug: p.slug || "",
    videoId: p.videoId || undefined,
  }));

  const latest = posts.slice(0, 4).map((p: any) => ({
    title: p.title,
    img: p.image,
    time: timeAgo(p.createdAt),
    slug: p.slug || "",
    videoId: p.videoId || undefined,
  }));

  const videos = videoPosts.map((p: any) => ({
    title: p.title,
    cat: localizeCategory(p.category || "", locale) || general,
    img: p.image,
    excerpt: p.excerpt || "",
    author: p.author?.name || community,
    time: timeAgo(p.createdAt),
    slug: p.slug || "",
    videoId: p.videoId || undefined,
    content: p.excerpt || "",
  }));

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <SiteHeader />
      <BreakingNews />
      <main className="container mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <HeroSection posts={featured} />
          <CategoryGrid />
          <FeaturedList posts={featured} />
          <MoreNews posts={latest} />
          <LatestVideos posts={videos} />
        </div>
        <aside className="lg:col-span-4 space-y-6">
          <Sidebar latest={latest} />
          <Ads position="home" />
          <CommunityStats />
          <Newsletter />
        </aside>
      </main>
    </div>
  );
}
