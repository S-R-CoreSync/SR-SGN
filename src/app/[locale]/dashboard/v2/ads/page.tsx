"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { MousePointerClick, RefreshCw } from "lucide-react";

type Ad = {
  id: string;
  title: string;
  position: string;
  clicks: number;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
};

export default function V2AdsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.ads");
  const locale = useLocale();

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/ads", { cache: "no-store" });
      if (!res.ok) throw new Error("ads");
      setAds(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: Ad) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      if (!res.ok) throw new Error("put");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0);
  const activeCount = ads.filter((ad) => ad.active).length;

  return (
    <V2Shell active="/dashboard/v2/ads" section={t("breadcrumbAds")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("active")}: {formatLocalizedDigits(activeCount, locale)}</V2Pill>
          <V2Pill tone="neutral">{tp("clicks")}: {formatLocalizedDigits(totalClicks, locale)}</V2Pill>
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

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : ads.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {ads.map((ad) => (
            <article key={ad.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[#203026]">{ad.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8a958b]">
                    <span>{tp("position")}: {ad.position}</span>
                    <span className="flex items-center gap-1.5">
                      <MousePointerClick size={13} className="text-[#8a6a1f]" />
                      {formatLocalizedDigits(ad.clicks ?? 0, locale)}
                    </span>
                    {ad.endDate && (
                      <span>{tp("ends")}: {formatLocalizedDigits(ad.endDate.slice(0, 10), locale)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <V2Pill tone={ad.active ? "good" : "neutral"}>
                    {ad.active ? tp("activeOne") : tp("paused")}
                  </V2Pill>
                  <button
                    disabled={busy === ad.id}
                    onClick={() => void toggle(ad)}
                    className="rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                  >
                    {ad.active ? tp("pause") : tp("activate")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </V2Panel>
      )}
    </V2Shell>
  );
}
