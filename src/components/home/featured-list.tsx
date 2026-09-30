"use client";

import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/routing";
import { ArrowLeft, Clock, Play } from "lucide-react";
import { handleImgError, resolveImage } from "@/lib/image-fallback";
import { formatLocalizedDigits } from "@/lib/language-guard";

interface Post {
  title: string; cat: string; img: string | null; excerpt: string; time: string; slug: string;
  videoId?: string;
}

export function FeaturedList({ posts }: { posts: Post[] }) {
  const t = useTranslations();
  const locale = useLocale();
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-sm">{t("home.featuredTitle")}</h3>
        <Link href="/news" className="text-sm text-[#1a5632] hover:underline flex items-center gap-1">
          {t("home.viewAll")} <ArrowLeft className="w-3 h-3" />
        </Link>
      </div>
      <div className="space-y-4">
        {posts.map(f => {
          const thumb = resolveImage(f.img || (f.videoId ? `https://img.youtube.com/vi/${f.videoId}/hqdefault.jpg` : null), f.title, f.cat);
          return (
            <Link key={f.slug || f.title} href={f.slug ? `/news/${f.slug}` : "/news"} className="flex gap-4 bg-white rounded-xl p-3 hover:shadow-md transition-shadow group">
              <div className="relative w-28 h-20 rounded-lg overflow-hidden flex-shrink-0">
                <img
                  src={thumb}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  onError={(e) => handleImgError(e, f.title, f.cat)}
                  className="w-full h-full object-cover"
                />
                {f.videoId && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <div className="bg-[#1a5632] text-white p-1.5 rounded-full shadow-lg">
                      <Play className="w-3 h-3 fill-current" />
                    </div>
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-[#1a5632] font-bold">{f.cat}</span>
                <h4 className="font-bold text-gray-900 text-sm group-hover:text-[#1a5632] transition-colors line-clamp-2">{formatLocalizedDigits(f.title, locale)}</h4>
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{formatLocalizedDigits(f.excerpt, locale)}</p>
                <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatLocalizedDigits(f.time, locale)}</span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
