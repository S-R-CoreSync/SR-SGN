"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { RefreshCw } from "lucide-react";

type CountItem = { name: string; count: number; percentage?: number };
type Stats = {
  total: number;
  topProvince: string;
  genderData: CountItem[];
  provinceData: CountItem[];
  governorateData: CountItem[];
  birthYearData: { birthYear: number; count: number }[];
  ageGroupData: CountItem[];
};

function matchesLocale(text: string, locale: string) {
  return hasArabicCharacters(text) === (locale === "ar");
}

export default function V2StatsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.stats");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/dashboard/member-stats", { cache: "no-store" });
      if (!res.ok) throw new Error("stats");
      setStats(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (error) {
    return (
      <V2Shell active="/dashboard/v2/stats" section={t("breadcrumbStats")}>
        <V2Intro title={tp("title")} note={tp("note")} />
        <V2Message text={t("error")} error />
      </V2Shell>
    );
  }

  if (loading) {
    return (
      <V2Shell active="/dashboard/v2/stats" section={t("breadcrumbStats")}>
        <V2Intro title={tp("title")} note={tp("note")} />
        <V2Message text={t("loading")} />
      </V2Shell>
    );
  }

  const gender = (stats?.genderData ?? []).filter((item) => ["male", "female"].includes(item.name));
  const provinces = (stats?.provinceData ?? []).filter((item) => matchesLocale(item.name, locale)).slice(0, 8);
  const governorates = (stats?.governorateData ?? []).filter((item) => matchesLocale(item.name, locale)).slice(0, 8);
  const ages = (stats?.ageGroupData ?? []).filter((item) => item.count > 0);
  const topProvince = stats?.topProvince && matchesLocale(stats.topProvince, locale) ? stats.topProvince : "—";
  const maxCount = Math.max(1, ...provinces.map((item) => item.count), ...governorates.map((item) => item.count));

  function barList(items: CountItem[]) {
    if (items.length === 0) return <p className="py-8 text-center text-xs text-[#9aa399]">{tp("empty")}</p>;
    return (
      <div className="mt-5 space-y-3">
        {items.map((item) => (
          <div key={item.name}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-[11px]">
              <span className="truncate font-bold text-[#4d5a50]">{item.name}</span>
              <span className="tabular-nums text-[#8a958b]">{formatLocalizedDigits(item.count, locale)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[#f2f3ef]">
              <div
                className="h-full rounded-full bg-[#1a5632]"
                style={{ width: `${Math.max(2, (item.count / maxCount) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <V2Shell active="/dashboard/v2/stats" section={t("breadcrumbStats")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="neutral">{tp("total")}: {formatLocalizedDigits(stats?.total ?? 0, locale)}</V2Pill>
          <button
            onClick={() => void load()}
            title={t("retry")}
            aria-label={t("retry")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </V2Intro>

      <div className="grid gap-5 lg:grid-cols-2">
        <V2Panel title={tp("genderTitle")} note={tp("genderNote")}>
          <div className="mt-5 grid grid-cols-2 gap-4">
            {gender.length === 0 ? (
              <p className="col-span-2 py-8 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
            ) : (
              gender.map((item) => (
                <div key={item.name} className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                  <p className="text-[10px] font-black text-[#9aa399]">{tp(`gender.${item.name}`)}</p>
                  <p className="mt-1 text-2xl font-black tabular-nums text-[#123b24]">
                    {formatLocalizedDigits(item.count, locale)}
                  </p>
                  <p className="mt-1 text-[10px] tabular-nums text-[#8a6a1f]">
                    {formatLocalizedDigits(item.percentage ?? 0, locale)}{tCommon("percentSign")}
                  </p>
                </div>
              ))
            )}
          </div>
        </V2Panel>

        <V2Panel title={tp("ageTitle")} note={tp("ageNote")}>
          {ages.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
          ) : (
            <div className="mt-5 space-y-3">
              {ages.map((item) => (
                <div key={item.name} className="flex items-center justify-between gap-3 text-xs">
                  <span className="font-bold text-[#4d5a50]">{tp(`ages.${item.name}`)}</span>
                  <span className="font-black tabular-nums text-[#123b24]">{formatLocalizedDigits(item.count, locale)}</span>
                </div>
              ))}
            </div>
          )}
        </V2Panel>

        <V2Panel title={tp("provinceTitle")} note={tp("provinceNote")}>
          <p className="mt-3 text-[11px] font-bold text-[#8a6a1f]">{tp("topProvince")}: {topProvince}</p>
          {barList(provinces)}
        </V2Panel>

        <V2Panel title={tp("originTitle")} note={tp("originNote")}>
          {barList(governorates)}
        </V2Panel>
      </div>
    </V2Shell>
  );
}
