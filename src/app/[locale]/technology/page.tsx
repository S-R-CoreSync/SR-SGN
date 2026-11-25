import { getTranslations } from "next-intl/server";
import { SITE_URL } from "@/lib/site";
import TechnologyNews from "@/components/TechnologyNews";

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("title")}</h1>
      <p className="text-gray-600 mb-8">{t("subtitle")}</p>
      <TechnologyNews />
    </div>
  );
}
