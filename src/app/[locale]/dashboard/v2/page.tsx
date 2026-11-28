"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import {
  ArrowUpRight, CheckSquare, Database, FileText, Mail, RefreshCw, Settings, Users,
} from "lucide-react";

type Daily = { date: string; count: number };

type Stats = {
  users: number;
  messages: number;
  events: number;
  posts: number;
  volunteers: number;
  totalViews: number;
  membersByStatus: Record<string, number>;
  usersByDay: Daily[];
  commentsByDay: Daily[];
};

type Health = {
  status: string;
  checks: {
    database: { status: string; responseTime: number };
    facebook?: { status: string };
    api?: { status: string; version: string };
  };
};

function trend(values: Daily[] | undefined): number | null {
  if (!values || values.length < 14) return null;
  const recent = values.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const previous = values.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
  if (!previous) return null;
  return Math.round(((recent - previous) / previous) * 100);
}

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${30 - (v / max) * 26}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-20" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export default function DashboardV2Page() {
  const { data: session } = useSession();
  const t = useTranslations("dashboardV2");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, healthRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("stats");
          return r.json();
        }),
        fetch("/api/health?sources=true", { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setStats(statsRes);
      setHealth(healthRes);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const pending = stats
    ? Object.entries(stats.membersByStatus)
        .filter(([status]) => /pending|new/i.test(status))
        .reduce((sum, [, count]) => sum + count, 0)
    : 0;

  const last14 = (daily: Daily[] | undefined) => (daily ?? []).slice(-14).map((d) => d.count);
  const kpis = [
    { key: "members", value: stats?.users ?? 0, daily: stats?.usersByDay, color: "#1a5632", icon: Users, href: "/dashboard/v2/members" },
    { key: "views", value: stats?.totalViews ?? 0, daily: stats?.commentsByDay, color: "#b8892c", icon: ArrowUpRight, href: "/news" },
    { key: "volunteers", value: stats?.volunteers ?? 0, daily: undefined, color: "#2f6b4f", icon: Users, href: "/dashboard/v2/volunteers" },
    { key: "posts", value: stats?.posts ?? 0, daily: undefined, color: "#8a6a1f", icon: FileText, href: "/dashboard/v2/content" },
  ];

  const actions = [
    { key: "approvals", value: pending, href: "/dashboard/v2/members", icon: CheckSquare },
    { key: "messages", value: stats?.messages ?? 0, href: "/dashboard/v2/messages", icon: Mail },
    { key: "posts", value: stats?.posts ?? 0, href: "/dashboard/v2/content", icon: FileText },
  ];

  const activity = (stats?.usersByDay ?? []).slice(-7);
  const activityComments = (stats?.commentsByDay ?? []).slice(-7);
  const activityMax = Math.max(1, ...activity.map((d) => d.count), ...activityComments.map((d) => d.count));
  const db = health?.checks?.database;
  const facebook = health?.checks?.facebook;

  return (
    <V2Shell active="/dashboard/v2" section={t("breadcrumbOverview")}>
      <div className="mb-6 flex justify-end">
        <button
          onClick={() => void load()}
          title={t("retry")}
          aria-label={t("retry")}
          className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center text-sm font-bold text-red-700">
          {t("error")}
          <button onClick={() => void load()} className="mr-2 underline">{t("retry")}</button>
        </div>
      ) : loading ? (
        <div className="rounded-2xl border border-[#e6ddc9] bg-white px-6 py-12 text-center text-sm text-[#8a958b]">
          {t("loading")}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="relative overflow-hidden rounded-[26px] bg-[#123b24] px-7 py-8 text-white shadow-[0_18px_40px_-18px_rgba(18,59,36,0.65)] sm:px-10 sm:py-10">
            <div
              className="pointer-events-none absolute -left-16 -top-24 h-72 w-72 rounded-full opacity-25 blur-2xl"
              style={{ background: "radial-gradient(circle, #c8a84e 0%, transparent 70%)" }}
            />
            <div
              className="pointer-events-none absolute bottom-0 right-0 h-40 w-40 opacity-[0.07]"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(45deg, #e2c77c 0 1px, transparent 1px 14px), repeating-linear-gradient(-45deg, #e2c77c 0 1px, transparent 1px 14px)",
              }}
            />
            <div className="relative">
              <p className="mb-3 text-[10px] font-black uppercase tracking-[0.22em] text-[#e2c77c]">
                {t("officialDashboard")} · {t("communityName")}
              </p>
              <h1 className="text-2xl font-black tracking-tight sm:text-[32px]">
                {t("greeting", { name: session?.user?.name ?? "" })}
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">{t("subtitle")}</p>
            </div>
          </section>

          <section>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-black tracking-tight">{t("tasksTitle")}</h2>
                <p className="mt-1 text-xs text-[#8a958b]">{t("tasksNote")}</p>
              </div>
              <span className="rounded-full bg-[#eadfc8] px-3 py-1 text-[10px] font-black text-[#8a6a1f]">
                {formatLocalizedDigits(actions.length, locale)}
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {actions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.key}
                    href={action.href as "/dashboard/v2/members"}
                    className="group relative overflow-hidden rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-[0_4px_16px_-8px_rgba(32,48,38,0.18)] transition-all hover:-translate-y-0.5 hover:border-[#c8a84e] hover:shadow-[0_12px_24px_-12px_rgba(32,48,38,0.3)]"
                  >
                    <span className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#1a5632] to-[#c8a84e]" />
                    <div className="flex items-start justify-between">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#f5ecd6] text-[#8a6a1f]">
                        <Icon size={20} />
                      </div>
                      <ArrowUpRight size={16} className="text-[#c8a84e] opacity-50 transition-opacity group-hover:opacity-100" />
                    </div>
                    <p className="mt-4 text-xs font-bold text-[#6f7a70]">{t(`task.${action.key}`)}</p>
                    <p className="mt-1 text-3xl font-black tabular-nums tracking-tight text-[#123b24]">
                      {formatLocalizedDigits(action.value.toLocaleString(), locale)}
                    </p>
                    <p className="mt-3 text-[11px] font-bold text-[#1a5632]">{t("view")}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          <section>
            <h2 className="mb-4 text-lg font-black tracking-tight">{t("pulseTitle")}</h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {kpis.map((kpi) => {
                const Icon = kpi.icon;
                const change = trend(kpi.daily);
                return (
                  <Link
                    key={kpi.key}
                    href={kpi.href as "/dashboard/v2/members"}
                    className="rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-[0_4px_16px_-8px_rgba(32,48,38,0.18)] transition-all hover:-translate-y-0.5 hover:border-[#c8a84e]"
                  >
                    <div className="flex items-center justify-between">
                      <div
                        className="flex h-9 w-9 items-center justify-center rounded-xl"
                        style={{ backgroundColor: `${kpi.color}18`, color: kpi.color }}
                      >
                        <Icon size={17} />
                      </div>
                      <Spark values={last14(kpi.daily)} color={kpi.color} />
                    </div>
                    <p className="mt-4 text-xs font-bold text-[#6f7a70]">{t(`kpi.${kpi.key}`)}</p>
                    <p className="mt-1 text-2xl font-black tabular-nums tracking-tight text-[#123b24]">
                      {formatLocalizedDigits(kpi.value.toLocaleString(), locale)}
                    </p>
                    <div className="mt-3 border-t border-[#f0ead9] pt-3">
                      {change === null ? (
                        <span className="text-[11px] text-[#9aa399]">{t("noData")}</span>
                      ) : (
                        <span className={`text-[11px] font-black ${change >= 0 ? "text-[#1a5632]" : "text-[#b42318]"}`}>
                          {change > 0 ? "+" : ""}
                          {formatLocalizedDigits(change, locale)}{tCommon("percentSign")}
                          <span className="mr-1 font-normal text-[#9aa399]">{t("trendNote")}</span>
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-2xl border border-[#e6ddc9] bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="text-sm font-black">{t("activityTitle")}</h2>
              <p className="mt-1 text-[11px] text-[#8a958b]">{t("activityNote")}</p>
              <div className="mt-6 flex h-36 items-end justify-between gap-2" dir="ltr">
                {activity.map((day, index) => {
                  const second = activityComments[index]?.count ?? 0;
                  return (
                    <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="flex h-full items-end justify-center gap-1">
                        <div
                          className="w-3 rounded-t-md bg-[#1a5632]"
                          style={{ height: `${Math.max(4, (day.count / activityMax) * 100)}%` }}
                        />
                        <div
                          className="w-3 rounded-t-md bg-[#c8a84e]"
                          style={{ height: `${Math.max(4, (second / activityMax) * 100)}%` }}
                        />
                      </div>
                      <span className="text-center text-[9px] font-bold text-[#9aa399]">
                        {formatLocalizedDigits(day.date.slice(5), locale)}
                      </span>
                    </div>
                  );
                })}
                {activity.length === 0 && <div className="m-auto text-xs text-[#9aa399]">{t("noData")}</div>}
              </div>
            </div>

            <div className="rounded-2xl border border-[#e6ddc9] bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-black">{t("systemTitle")}</h2>
              <ul className="divide-y divide-[#f0ead9]">
                <li className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 text-[#6f7a70]"><Database size={15} className="text-[#8a6a1f]" />{t("database")}</span>
                  <span className="font-black tabular-nums text-[#123b24]">
                    {db ? `${formatLocalizedDigits(db.responseTime, locale)} ${t("milliseconds")}` : t("noData")}
                  </span>
                </li>
                <li className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 text-[#6f7a70]"><RefreshCw size={15} className="text-[#8a6a1f]" />{t("sync")}</span>
                  <span className="font-black text-[#123b24]">
                    {facebook ? (facebook.status === "ok" ? t("syncActive") : t("syncIdle")) : t("noData")}
                  </span>
                </li>
                <li className="flex items-center justify-between py-3 text-sm">
                  <span className="flex items-center gap-2 text-[#6f7a70]"><Settings size={15} className="text-[#8a6a1f]" />{t("apiVersion")}</span>
                  <span className="font-black tabular-nums text-[#123b24]">
                    {health?.checks?.api?.version ? formatLocalizedDigits(health.checks.api.version, locale) : t("noData")}
                  </span>
                </li>
              </ul>
            </div>
          </section>
        </div>
      )}
    </V2Shell>
  );
}
