"use client";

import { useTranslations } from "next-intl";
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
import { HomeProvinceMap } from "@/components/home/home-province-map";

import { Ads } from "@/components/ads";
import { CommunityStats } from "@/components/community-stats";

interface PostData {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  image: string | null;
  videoId: string | null;
  category: string;
  source: string;
  featured: boolean;
  views: number;
  createdAt: any;
  author: { name: string | null } | null;
}

interface HomePageClientProps {
  posts: PostData[];
  videoPosts: PostData[];
  /** Server generation timestamp; reused during hydration to avoid a relative-time mismatch. */
  renderedAt: number;
}

export function HomePageClient({ posts, videoPosts, renderedAt }: HomePageClientProps) {
  const t = useTranslations();

  // Pure calculation from one fixed reference: SSR and hydration render identical text.
  function timeAgo(date: any) {
    const { unit, count } = relativeTimeParts(date, renderedAt);
    return t(relativeTimeKey(unit), { count });
  }

  const featured = posts.slice(0, 4).map((p) => ({
    title: p.title,
    cat: p.category,
    img: p.image,
    excerpt: p.excerpt || "",
    author: p.author?.name || t("site.shortTitle"),
    time: timeAgo(p.createdAt),
    slug: p.slug,
    videoId: p.videoId || undefined,
  }));

  const secondary = posts.slice(4, 6).map((p) => ({
    title: p.title,
    cat: p.category,
    img: p.image,
    excerpt: p.excerpt || "",
    author: p.author?.name || t("site.shortTitle"),
    time: timeAgo(p.createdAt),
    slug: p.slug,
    videoId: p.videoId || undefined,
  }));

  // كل قسم يأخذ نافذة مختلفة — كان Sidebar و MoreNews يعرضان نفس الأربع أخبار
  const sidebarNews = posts.slice(6, 10).map((p) => ({
    title: p.title,
    cat: p.category,
    img: p.image,
    time: timeAgo(p.createdAt),
    slug: p.slug,
    videoId: p.videoId || undefined,
  }));

  const moreNews = posts.slice(10, 16).map((p) => ({
    title: p.title,
    cat: p.category,
    img: p.image,
    time: timeAgo(p.createdAt),
    slug: p.slug,
    videoId: p.videoId || undefined,
  }));

  const usedSlugs = [...featured, ...secondary, ...sidebarNews, ...moreNews].map((p) => p.slug);

  const videos = videoPosts.map((p) => ({
    title: p.title,
    cat: p.category,
    img: p.image,
    excerpt: p.excerpt || "",
    author: p.author?.name || t("site.shortTitle"),
    time: timeAgo(p.createdAt),
    slug: p.slug,
    videoId: p.videoId || undefined,
    content: "",
  }));

  return (
    <div dir="auto" className="min-h-screen bg-background text-foreground">
      <TopBar />
      <SiteHeader />
      <BreakingNews excludeSlugs={usedSlugs} />
      <CommunityStats />
      <HomeProvinceMap />

      <main className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-8">
            <HeroSection posts={featured} />
            <CategoryGrid />
            <div className="grid md:grid-cols-2 gap-6">
              <FeaturedList posts={secondary} />
            </div>
          </div>
          <div className="space-y-6">
            <Sidebar latest={sidebarNews} />
            <Ads position="sidebar" />
          </div>
        </div>
        <MoreNews posts={moreNews} />
        <LatestVideos posts={videos} />
        <Ads position="banner" className="my-6" />
        <Newsletter />
      </main>
    </div>
  );
}
