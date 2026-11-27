"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { RefreshCw, Search, Trash2 } from "lucide-react";

type Subscriber = { id: string; email: string; createdAt: string };

export default function V2SubscribersPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.subscribers");
  const locale = useLocale();

  const [items, setItems] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/subscribe", { cache: "no-store" });
      if (!res.ok) throw new Error("subscribers");
      setItems(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function remove(item: Subscriber) {
    if (!window.confirm(tp("confirmDelete"))) return;
    setBusy(item.id);
    try {
      const res = await fetch("/api/subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      if (!res.ok) throw new Error("delete");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const visible = items.filter((item) =>
    !query.trim() || item.email.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <V2Shell active="/dashboard/v2/subscribers" section={t("breadcrumbSubscribers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("total")}: {formatLocalizedDigits(items.length, locale)}</V2Pill>
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
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
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
          ) : (
            visible.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#203026]" dir="ltr">{item.email}</p>
                  <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                    {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                  </p>
                </div>
                <button
                  disabled={busy === item.id}
                  onClick={() => void remove(item)}
                  title={tp("delete")}
                  aria-label={tp("delete")}
                  className="rounded-lg border border-[#e6ddc9] p-2 text-[#b42318] hover:bg-[#fbe9e7] disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </V2Panel>
      )}
    </V2Shell>
  );
}
