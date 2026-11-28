"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, isPureLocaleText } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { v2Api, v2InputClass } from "@/components/dashboard/v2-form";
import { Activity, Database, Play, RefreshCw, Settings, ShieldCheck } from "lucide-react";

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
  const [sources, setSources] = useState<string[]>([]);
  const [source, setSource] = useState("");
  const [limit, setLimit] = useState("5");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [syncError, setSyncError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [healthRes, sourcesRes] = await Promise.all([
        fetch("/api/health?sources=true", { cache: "no-store" }),
        fetch("/api/sync", { cache: "no-store" }),
      ]);
      if (!healthRes.ok) throw new Error("health");
      setHealth(await healthRes.json());
      if (sourcesRes.ok) {
        const data = await sourcesRes.json();
        // نعرض اسم المصدر اللاتيني فقط — لا نمرّر تصنيفات عربية إلى /en و/nl.
        const names: string[] = (data.sources ?? []).map((item: { name?: string }) => item.name).filter(Boolean);
        setSources(names);
        setSource((current) => current || names[0] || "");
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    if (!source || syncBusy) return;
    setSyncBusy(true);
    setSyncNotice("");
    setSyncError("");
    try {
      const result = await v2Api<{ results?: unknown[]; quotaExhausted?: boolean }>("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source, limit: Math.max(1, Math.min(Number(limit) || 5, 50)) }),
      });
      if (result.quotaExhausted) throw new Error("quota");
      setSyncNotice(tp("syncDone", { count: formatLocalizedDigits(result.results?.length ?? 0, locale) }));
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : tp("syncFailed"));
    } finally {
      setSyncBusy(false);
    }
  }

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

          {sources.length > 0 && (
            <V2Panel title={tp("syncTitle")} note={tp("syncNote")}>
              <div className="mt-5 flex flex-wrap items-end gap-3">
                <label className="min-w-48 flex-1">
                  <span className="mb-1.5 block text-[10px] font-black text-[#8a958b]">{tp("syncSource")}</span>
                  <select
                    dir="ltr"
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    className={v2InputClass}
                  >
                    {sources.map((name) => <option key={name} value={name}>{name}</option>)}
                  </select>
                </label>
                <label className="w-32">
                  <span className="mb-1.5 block text-[10px] font-black text-[#8a958b]">{tp("syncLimit")}</span>
                  <input
                    dir="ltr"
                    type="number"
                    min={1}
                    max={50}
                    value={limit}
                    onChange={(event) => setLimit(event.target.value)}
                    className={v2InputClass}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => void runSync()}
                  disabled={syncBusy || !source}
                  className="flex items-center gap-1.5 rounded-xl bg-[#1a5632] px-4 py-2.5 text-xs font-black text-white hover:bg-[#123b24] disabled:opacity-50"
                >
                  {syncBusy ? tp("syncBusy") : <><Play size={13} />{tp("syncNow")}</>}
                </button>
              </div>
              {syncNotice && (
                <p className="mt-4 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-3 py-2 text-xs font-bold text-[#1a5632]">
                  {isPureLocaleText(syncNotice, locale) ? syncNotice : tp("syncFailed")}
                </p>
              )}
              {syncError && (
                <p className="mt-4 rounded-xl border border-[#f3d5d1] bg-[#fff5f4] px-3 py-2 text-xs font-bold text-[#b42318]">
                  {tp("syncFailed")}
                </p>
              )}
            </V2Panel>
          )}
        </div>
      )}
    </V2Shell>
  );
}
