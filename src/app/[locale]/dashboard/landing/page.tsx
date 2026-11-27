import { getTranslations } from "next-intl/server";
import { ArrowUpRight, Info } from "lucide-react";
import { Link } from "@/i18n/routing";
import { PageHeader } from "@/components/ui/page-header";

export default async function LandingPreview({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("landing")}
        description={t("landingPreviewDescription")}
        actions={
          <Link
            href="/"
            target="_blank"
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          >
            {t("viewSite")}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        }
      />

      <div className="overflow-hidden rounded-3xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-start gap-2 border-b border-gray-100 px-4 py-3 text-[11px] text-gray-500 dark:border-gray-800 dark:text-gray-400">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#1a5632] dark:text-emerald-400" />
          {t("landingPreviewNote")}
        </div>
        <iframe
          src={`/${locale}`}
          title={t("viewSite")}
          className="h-[720px] w-full bg-white"
        />
      </div>
    </div>
  );
}
