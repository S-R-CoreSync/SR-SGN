"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { Activity, Database, RefreshCw, Settings, ShieldCheck } from "lucide-react";

type Health = {
  status: "ok" | "degraded" | "error";
  uptime: number;
  checks: {
    database: { status: string; responseTime: number };
    facebook?: { status: string; daysLeft?: number | null };
    api?: { status: string; version: string };
  };
};

export default function V2SystemPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.system");
  const locale = useLocale();

  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/health?sources=true", { cache: "no-store" });
      if (!res.ok) throw new Error("health");
      setHealth(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const overallTone = health?.status === "ok" ? "good" : health?.status === "degraded" ? "warn" : "bad";
  const db = health?.checks?.database;
  const facebook = health?.checks?.facebook;

  const rows = [
    {
      icon: Database,
      label: tp("database"),
      value: db ? `${formatLocalizedDigits(db.responseTime, locale)} ${tp("milliseconds")}` : t("noData"),
      tone: db?.status === "ok" ? ("good" as const) : ("bad" as const),
      state: db?.status === "ok" ? tp("ok") : tp("errorState"),
    },
    {
      icon: Settings,
      label: tp("apiVersion"),
      value: health?.checks?.api?.version ? formatLocalizedDigits(health.checks.api.version, locale) : t("noData"),
      tone: "neutral" as const,
      state: health?.checks?.api?.status === "ok" ? tp("ok") : tp("errorState"),
    },
    {
      icon: ShieldCheck,
      label: tp("syncToken"),
      value: facebook
        ? facebook.status === "ok"
          ? tp("active")
          : facebook.status === "expiring" && facebook.daysLeft !== null && facebook.daysLeft !== undefined
            ? `${tp("expiring")} · ${formatLocalizedDigits(facebook.daysLeft, locale)} ${tp("days")}`
            : tp("expired")
        : t("noData"),
      tone: facebook?.status === "ok" ? ("good" as const) : ("warn" as const),
      state: facebook?.status === "ok" ? tp("ok") : tp("needsAction"),
    },
    {
      icon: Activity,
      label: tp("uptime"),
      value: health ? `${formatLocalizedDigits(health.uptime, locale)} ${tp("seconds")}` : t("noData"),
      tone: "neutral" as const,
      state: "",
    },
  ];

  return (
    <V2Shell active="/dashboard/v2/system" section={t("breadcrumbSystem")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <button
          onClick={() => void load()}
          title={t("retry")}
          aria-label={t("retry")}
          className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </V2Intro>

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <div className="space-y-5">
          <section className="relative overflow-hidden rounded-2xl bg-[#123b24] p-6 text-white shadow-sm">
            <div
              className="pointer-events-none absolute -left-10 -top-16 h-52 w-52 rounded-full opacity-20 blur-2xl"
              style={{ background: "radial-gradient(circle, #c8a84e 0%, transparent 70%)" }}
            />
            <div className="relative flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#e2c77c]">{tp("overall")}</p>
                <p className="mt-2 text-2xl font-black">
                  {health?.status === "ok" ? tp("ok") : health?.status === "degraded" ? tp("degraded") : tp("errorState")}
                </p>
              </div>
              <V2Pill tone={overallTone}>{tp("liveData")}</V2Pill>
            </div>
          </section>

          <V2Panel>
            <ul className="divide-y divide-[#f0ead9]">
              {rows.map((row) => {
                const Icon = row.icon;
                return (
                  <li key={row.label} className="flex flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                    <span className="flex items-center gap-3 text-sm font-bold text-[#4d5a50]">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#f5ecd6] text-[#8a6a1f]">
                        <Icon size={16} />
                      </span>
                      {row.label}
                    </span>
                    <span className="flex items-center gap-3">
                      <span className="text-sm font-black tabular-nums text-[#123b24]">{row.value}</span>
                      {row.state && <V2Pill tone={row.tone}>{row.state}</V2Pill>}
                    </span>
                  </li>
                );
              })}
            </ul>
          </V2Panel>
        </div>
      )}
    </V2Shell>
  );
}
