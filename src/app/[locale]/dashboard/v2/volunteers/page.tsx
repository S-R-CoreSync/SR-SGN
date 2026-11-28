"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { RefreshCw, Search } from "lucide-react";

type Volunteer = {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  skills?: string | null;
  availability?: string | null;
  message?: string | null;
  createdAt: string;
};

export default function V2VolunteersPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.volunteers");
  const locale = useLocale();

  const [items, setItems] = useState<Volunteer[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (query.trim()) params.set("search", query.trim());
      const res = await fetch(`/api/volunteer?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("volunteer");
      const data = await res.json();
      setItems(data.volunteers ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  // عزل لغوي صارم: كل سطر يُعرض فقط في القسم الذي يطابق لغة اسمه.
  const visible = items.filter((item) => {
    const arabicName = hasArabicCharacters(item.name);
    return locale === "ar" ? arabicName : !arabicName;
  });

  return (
    <V2Shell active="/dashboard/v2/volunteers" section={t("breadcrumbVolunteers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="neutral">{tp("total")}: {formatLocalizedDigits(total, locale)}</V2Pill>
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="w-40 bg-transparent text-xs outline-none"
            />
          </div>
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
      ) : visible.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {visible.map((item) => (
            <article key={item.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[#203026]">{item.name}</h2>
                  <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                    {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                  </p>
                </div>
                <V2Pill tone="good">{tp("registered")}</V2Pill>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[#6f7a70] sm:grid-cols-2">
                {item.email && <p dir="ltr">{item.email}</p>}
                {item.phone && <p dir="ltr">{item.phone}</p>}
                {item.skills && hasArabicCharacters(item.skills) === (locale === "ar") && (
                  <p className="sm:col-span-2">{item.skills}</p>
                )}
                {item.availability && hasArabicCharacters(item.availability) === (locale === "ar") && (
                  <p className="sm:col-span-2">{item.availability}</p>
                )}
              </div>
              {item.message && hasArabicCharacters(item.message) === (locale === "ar") && (
                <p className="mt-3 text-xs leading-relaxed text-[#8a958b]">{item.message}</p>
              )}
            </article>
          ))}
        </V2Panel>
      )}
    </V2Shell>
  );
}
