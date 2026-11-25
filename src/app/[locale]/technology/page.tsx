import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site";

interface Props {
  params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "technology" });
  return {
    metadataBase: new URL(SITE_URL),
    title: t("title"),
    description: t("subtitle"),
  };
}

export default async function TechnologyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "technology" });

  const data: { technologyNews?: Array<{ source: string; title: string; url: string }> } = {};
  try {
    const res = await fetch(new URL("/api/news-tech", globalThis.location?.origin ?? "http://localhost:3000"), { cache: "no-store" });
    data.technologyNews = (await res.json()).technologyNews;
  } catch (err) {
    console.error("[TechnologyPage] fetch error:", err);
  }

  const news = data.technologyNews || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">{t("title")}</h1>
      <p className="text-gray-600 mb-8">{t("subtitle")}</p>

      <div className="space-y-4">
        {news.length === 0 && <p className="text-gray-500">{t("noNews")}</p>}
        {news.map((item, i) => (
          <div key={i} className="p-4 border border-gray-200 rounded-lg bg-white">
            <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 mb-2 inline-block">{item.source}</span>
            <a href={item.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-gray-900 hover:text-blue-600">
              {item.title}
            </a>
          </div>
        ))}
      </div>
    </div>
  );
}
