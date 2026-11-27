"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { Calendar, MapPin, RefreshCw } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location?: string | null;
  category?: string | null;
  published?: boolean;
};

export default function V2EventsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.events");
  const locale = useLocale();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"all" | "upcoming">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/events?limit=25", { cache: "no-store" });
      if (!res.ok) throw new Error("events");
      const data = await res.json();
      setEvents(data.events ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function togglePublished(item: EventItem) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, published: !item.published }),
      });
      if (!res.ok) throw new Error("patch");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const visible = tab === "all"
    ? events
    : events.filter((item) => new Date(item.date).getTime() >= Date.now());

  const formatDate = (value: string) =>
    formatLocalizedDigits(
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale === "nl" ? "nl-NL" : "en-GB", {
        day: "numeric", month: "long", year: "numeric",
      }).format(new Date(value)),
      locale,
    );

  return (
    <V2Shell active="/dashboard/v2/events" section={t("breadcrumbEvents")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#e6ddc9] bg-white p-1 shadow-sm">
            {(["all", "upcoming"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors ${
                  tab === key ? "bg-[#123b24] text-white" : "text-[#6f7a70] hover:bg-[#f5ecd6]"
                }`}
              >
                {tp(`tabs.${key}`)}
              </button>
            ))}
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
          {visible.map((item) => {
            const isUpcoming = new Date(item.date).getTime() >= Date.now();
            return (
              <article key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[#203026]">{item.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8a958b]">
                      <span className="flex items-center gap-1.5"><Calendar size={13} className="text-[#8a6a1f]" />{formatDate(item.date)}</span>
                      {item.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#8a6a1f]" />{item.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <V2Pill tone={item.published ? "good" : "neutral"}>
                      {item.published ? tp("published") : tp("hidden")}
                    </V2Pill>
                    <V2Pill tone={isUpcoming ? "warn" : "neutral"}>
                      {isUpcoming ? tp("upcoming") : tp("past")}
                    </V2Pill>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-3 text-xs leading-relaxed text-[#6f7a70]">{item.description}</p>
                )}
                <button
                  disabled={busy === item.id}
                  onClick={() => void togglePublished(item)}
                  className="mt-4 rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                >
                  {item.published ? tp("hide") : tp("publish")}
                </button>
              </article>
            );
          })}
        </V2Panel>
      )}
    </V2Shell>
  );
}
