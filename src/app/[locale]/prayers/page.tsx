import { getTranslations } from "next-intl/server";
import { calculatePrayerTimes } from "@/lib/prayers";
import { PrayersClient } from "./prayers-client";
import { Moon } from "lucide-react";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function PrayersPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });

  const initialData = calculatePrayerTimes("amsterdam", new Date(), locale);

  const labels = {
    title: t("prayers.title"),
    subtitle: t("prayers.subtitle"),
    selectCity: t("prayers.selectCity"),
    fajr: t("prayers.fajr"),
    sunrise: t("prayers.sunrise"),
    dhuhr: t("prayers.dhuhr"),
    asr: t("prayers.asr"),
    maghrib: t("prayers.maghrib"),
    isha: t("prayers.isha"),
    nextPrayer: t("prayers.nextPrayer"),
    remaining: t("prayers.remaining"),
    minutes: t("prayers.minutes"),
    hijriDate: t("prayers.hijriDate"),
    gregorianDate: t("prayers.gregorianDate"),
    qiblaDirection: t("prayers.qiblaDirection"),
  };

  return (
    <div className="min-h-screen py-10 px-4 max-w-6xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="text-center space-y-3 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-xs font-bold">
          <Moon className="w-3.5 h-3.5" />
          <span>NETHERLANDS ISLAMIC CALENDAR</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
          {labels.title}
        </h1>
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
          {labels.subtitle}
        </p>
      </div>

      <PrayersClient initialData={initialData} locale={locale} labels={labels} />
    </div>
  );
}
