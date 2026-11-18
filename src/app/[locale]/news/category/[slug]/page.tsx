"use client";

import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useParams } from "next/navigation";
import { Clock, ArrowLeft, Newspaper, ChevronRight } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatDate } from "@/lib/date";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { resolveImage } from "@/lib/image-fallback";

interface Post {
  id: string; title: string; excerpt: string; image: string;
  category: string; createdAt: string; slug: string;
  author: { name: string };
  content: string;
}

const CATEGORY_API: Record<string, string> = {
  "أخبار-الجالية": "أخبار الجالية",
  "أخبار-هولندا": "أخبار هولندا",
  "أخبار-أوروبا": "أخبار أوروبا",
  اقتصاد: "اقتصاد",
  "ثقافة-وفن": "ثقافيات",
  رياضة: "رياضة",
  تكنولوجيا: "تكنولوجيا",
  "عمل-إنساني": "عمل إنساني",
  خدمات: "خدمات",
};

const CATEGORY_KEYS: Record<string, string> = {
  "أخبار-الجالية": "communityNews",
  "أخبار-هولندا": "netherlandsNews",
  "أخبار-أوروبا": "europeNews",
  اقتصاد: "economy",
  "ثقافة-وفن": "culture",
  رياضة: "sports",
  تكنولوجيا: "tech",
  "عمل-إنساني": "humanitarian",
  خدمات: "services",
};

/**
 * ⚠️ مهم: عمود `category` في جدول Post مخزَّن **بالعربية** لكل اللغات،
 * وواجهة `/api/news` هي التي تترجمه عند العرض عبر `localizeCategory()`.
 * لذلك الفلترة تكون دائماً بالاسم العربي، مهما كانت لغة الصفحة.
 */

export default function CategoryPage() {
  const t = useTranslations('newsCategory');
  const tc = useTranslations('categories');
  const locale = useLocale();
  const { slug } = useParams();
  const [posts, setPosts] = useState<Post[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const decodedSlug = typeof slug === "string" ? decodeURIComponent(slug) : null;
  // مفتاح الترجمة إن وُجد، وإلا عنوان عام مترجم — حتى لا يظهر نص عربي في /en و/nl
  // ولا يرمي next-intl خطأ MISSING_MESSAGE عند قسم غير معروف.
  const catKey = decodedSlug ? CATEGORY_KEYS[decodedSlug] : undefined;
  const catName = catKey && tc.has(catKey) ? tc(catKey) : t('allCategories');

  // الفلترة بالاسم العربي دائماً (الترجمة تصير في `/api/news` حسب locale)
  const apiCategory = decodedSlug ? CATEGORY_API[decodedSlug] || decodedSlug : "";

  useEffect(() => {
    if (!decodedSlug) return;
    if (!apiCategory) {
      setPosts([]);
      setTotal(0);
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    fetch(`/api/news?category=${encodeURIComponent(apiCategory)}&limit=100&locale=${locale}`, {
      signal: controller.signal,
    })
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setTotal(typeof data.total === "number" ? data.total : (data.posts || []).length);
        setLoading(false);
      })
      .catch(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [decodedSlug, apiCategory, locale]);

  const dir = locale === "ar" ? "rtl" : "ltr";

  if (loading) return (
    <div dir={dir} className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="animate-spin w-8 h-8 border-4 border-[#1a5632] border-t-transparent rounded-full" />
    </div>
  );

  return (
    <div dir={dir} className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link href="/news" className="text-sm text-[#1a5632] hover:underline flex items-center gap-1 mb-2">
              <ArrowLeft className="w-3 h-3" /> {t('backToNews')}
            </Link>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Newspaper className="w-6 h-6 text-[#1a5632]" /> {catName}
            </h1>
            <p className="text-sm text-gray-500 mt-1">{t('countPrefix', { count: formatLocalizedDigits(total || posts.length, locale) })}</p>
          </div>
        </div>

        {posts.length === 0 ? (
          <div className="text-center py-16">
            <Newspaper className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">{t('empty')}</p>
            <Link href="/news" className="text-[#1a5632] hover:underline text-sm mt-2 inline-block">{t('browseAll')}</Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {posts.map((p) => (
              <Link key={p.id} href={`/news/${p.slug || p.id}`} className="bg-white rounded-xl overflow-hidden border hover:shadow-md transition-shadow group">
                {(() => {
                  const ytMatch = p.content?.match(/src=["'](https:\/\/www\.youtube\.com\/embed\/[^"']+)["']/);
                  const embedUrl = ytMatch ? ytMatch[1] : null;
                  if (embedUrl) {
                    return (
                      <div className="relative w-full h-48 bg-black">
                        <iframe
                          src={embedUrl}
                          className="absolute inset-0 w-full h-full border-0"
                          allowFullScreen
                          title={p.title}
                        />
                      </div>
                    );
                  }
                  return (
                    <div className="overflow-hidden">
                      <img src={resolveImage(p.image, p.title, p.category)} alt="" loading="lazy" decoding="async" onError={(e) => { (e.currentTarget as HTMLImageElement).src = resolveImage(null, p.title, p.category); }} className="w-full aspect-video object-cover group-hover:scale-105 transition-transform duration-500" />
                    </div>
                  );
                })()}
                <div className="p-4">
                  <span className="bg-[#1a5632]/10 text-[#1a5632] text-xs font-bold px-2 py-0.5 rounded">{formatLocalizedDigits(p.category, locale)}</span>
                  <h3 className="font-bold text-gray-900 mt-2 mb-1 line-clamp-2 leading-snug">{formatLocalizedDigits(p.title, locale)}</h3>
                  {p.excerpt && <p className="text-sm text-gray-500 line-clamp-2">{formatLocalizedDigits(p.excerpt, locale)}</p>}
                  <div className="flex items-center gap-2 mt-3 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(p.createdAt, locale)}</span>
                    {p.author?.name && <><span>•</span><span>{formatLocalizedDigits(p.author.name, locale)}</span></>}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
