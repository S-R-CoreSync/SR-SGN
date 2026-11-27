"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import {
  Activity, ArrowLeft, ArrowUpRight, Bot, Calendar, CheckSquare,
  Cpu, Database, LayoutDashboard, Mail, MessageSquare, RefreshCw,
  Search, Settings, ShieldCheck, Sparkles, Users, X,
} from "lucide-react";

type Daily = { date: string; count: number };

type Stats = {
  users: number;
  messages: number;
  events: number;
  posts: number;
  totalViews: number;
  membersByStatus: Record<string, number>;
  usersByDay: Daily[];
  membersByDay: Daily[];
  commentsByDay: Daily[];
};

type Briefing = {
  executiveSummary?: string;
  actionItems?: { id: string; title: string; desc: string; priority: string; href: string }[];
  systemHealth?: {
    syncStatus: string;
    tursoLatencyMs: number;
    aiEngine: string;
    lastSync: string | null;
  };
};

type NavItem = { key: string; href: string; icon: typeof Users };

function Spark({ values, color }: { values: number[]; color: string }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const points = values
    .map((v, i) => `${(i / (values.length - 1)) * 100},${28 - (v / max) * 24}`)
    .join(" ");
  return (
    <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-8 w-24" aria-hidden="true">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function trend(values: Daily[] | undefined): number | null {
  if (!values || values.length < 14) return null;
  const recent = values.slice(-7).reduce((sum, d) => sum + d.count, 0);
  const previous = values.slice(-14, -7).reduce((sum, d) => sum + d.count, 0);
  if (!previous) return null;
  return Math.round(((recent - previous) / previous) * 100);
}

export default function DashboardV2Page() {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboardV2");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [stats, setStats] = useState<Stats | null>(null);
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, briefingRes] = await Promise.all([
        fetch("/api/dashboard/stats", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error("stats");
          return r.json();
        }),
        fetch(`/api/dashboard/ai-briefing?locale=${locale}`, { cache: "no-store" })
          .then((r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ]);
      setStats(statsRes);
      setBriefing(briefingRes && !briefingRes.error ? briefingRes : null);
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

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
      if (e.key === "Escape") setPaletteOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const groups: { key: string; items: NavItem[] }[] = [
    {
      key: "today",
      items: [
        { key: "overview", href: "/dashboard/v2", icon: LayoutDashboard },
        { key: "briefing", href: "/dashboard/ai", icon: Sparkles },
        { key: "tasks", href: "/dashboard/tasks", icon: CheckSquare },
      ],
    },
    {
      key: "community",
      items: [
        { key: "members", href: "/dashboard/members", icon: Users },
        { key: "messages", href: "/dashboard/messages", icon: MessageSquare },
        { key: "events", href: "/dashboard/events", icon: Calendar },
      ],
    },
    {
      key: "system",
      items: [
        { key: "sync", href: "/dashboard/facebook-sync", icon: RefreshCw },
        { key: "aiOps", href: "/dashboard/ai", icon: Bot },
        { key: "settings", href: "/dashboard/settings", icon: Settings },
      ],
    },
  ];

  const allItems = groups.flatMap((g) => g.items);
  const filtered = query.trim()
    ? allItems.filter((item) => t(`nav.${item.key}`).toLowerCase().includes(query.trim().toLowerCase()))
    : allItems;

  const pending = stats
    ? Object.entries(stats.membersByStatus)
        .filter(([status]) => /pending|new/i.test(status))
        .reduce((sum, [, count]) => sum + count, 0)
    : 0;

  const last14 = (values: Daily[] | undefined) => (values ?? []).slice(-14).map((d) => d.count);
  const kpis = [
    { key: "members", value: stats?.users ?? 0, values: last14(stats?.usersByDay), color: "#1a5632", href: "/dashboard/members", icon: Users, daily: stats?.usersByDay },
    { key: "views", value: stats?.totalViews ?? 0, values: last14(stats?.commentsByDay), color: "#dc2626", href: "/news", icon: Activity, daily: stats?.commentsByDay },
    { key: "pending", value: pending, values: last14(stats?.membersByDay), color: "#b8892c", href: "/dashboard/members", icon: ShieldCheck, daily: stats?.membersByDay },
    { key: "messages", value: stats?.messages ?? 0, values: [], color: "#2563eb", href: "/dashboard/messages", icon: Mail, daily: undefined },
  ];

  const activity = (stats?.usersByDay ?? []).slice(-7);
  const activityComments = (stats?.commentsByDay ?? []).slice(-7);
  const activityMax = Math.max(1, ...activity.map((d) => d.count), ...activityComments.map((d) => d.count));
  const now = new Date();
  const today = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const health = briefing?.systemHealth;
  const actions = (briefing?.actionItems ?? []).slice(0, 3);

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f6f7f4] text-[#16231b]">
      {/* Compact rail */}
      <aside
        className={`fixed top-0 ${isRtl ? "right-0 border-l" : "left-0 border-r"} z-30 hidden h-screen w-60 flex-col border-[#e3e7e1] bg-white lg:flex`}
      >
        <div className="flex items-center gap-2 border-b border-[#eef0ec] px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#113d22] text-white">
            <Sparkles size={18} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-black">SGN</p>
            <p className="text-[10px] font-bold text-[#b8892c]">{t("prototype")}</p>
          </div>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className={`mx-4 mt-4 flex items-center gap-2 rounded-xl border border-[#e3e7e1] bg-[#fafbf9] px-3 py-2 text-xs text-[#7a847c] ${isRtl ? "text-right" : "text-left"}`}
        >
          <Search size={14} />
          <span className="flex-1">{t("searchPlaceholder")}</span>
          <kbd className="rounded-md border border-[#dde2da] bg-white px-1.5 py-0.5 text-[9px] font-bold">⌘K</kbd>
        </button>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-5">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-[#9aa39b]">
                {t(`groups.${group.key}`)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const active = item.href === "/dashboard/v2";
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors ${
                        active
                          ? "bg-[#113d22] font-bold text-white"
                          : "text-[#4d5a50] hover:bg-[#f2f5f0] hover:text-[#113d22]"
                      }`}
                    >
                      <Icon size={16} className={active ? "text-[#e2c77c]" : "text-[#8b968d]"} />
                      <span className="truncate">{t(`nav.${item.key}`)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-[#eef0ec] p-4">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 rounded-xl bg-[#f2f5f0] px-3 py-2 text-xs font-bold text-[#4d5a50] hover:bg-[#e8ede5]"
          >
            <ArrowLeft size={14} className={isRtl ? "rotate-180" : ""} />
            {t("backToClassic")}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className={`${isRtl ? "lg:mr-60" : "lg:ml-60"} mx-auto max-w-6xl px-4 py-8 sm:px-8`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight sm:text-3xl">
                {t("greeting", { name: session?.user?.name ?? "" })}
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#6b776d]">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#e6d3a6] bg-[#fbf6e8] px-3 py-1.5 text-[11px] font-bold text-[#8a6a1f]">
              {t("prototypeNote")}
            </span>
            <button
              onClick={() => void load()}
              className="rounded-xl border border-[#e3e7e1] bg-white p-2 text-[#4d5a50] hover:bg-[#f2f5f0]"
              title={t("retry")}
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm font-bold text-red-700">
            {t("error")}
            <button onClick={() => void load()} className="mr-2 underline">
              {t("retry")}
            </button>
          </div>
        ) : loading ? (
          <div className="rounded-2xl border border-[#e3e7e1] bg-white p-10 text-center text-sm text-[#7a847c]">
            {t("loading")}
          </div>
        ) : (
          <div className="space-y-6">
            {/* AI briefing — inside the workflow, with sources */}
            <section className="relative overflow-hidden rounded-3xl bg-[#113d22] p-6 text-white shadow-sm sm:p-7">
              <div className="pointer-events-none absolute -left-16 -top-16 h-64 w-64 rounded-full bg-[#c8a84e]/10 blur-3xl" />
              <div className="relative space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#c8a84e] text-[#113d22]">
                      <Bot size={18} />
                    </div>
                    <div>
                      <h2 className="text-sm font-black sm:text-base">{t("briefingTitle")}</h2>
                      <p className="text-[11px] text-emerald-100/70">
                        {formatLocalizedDigits(today, locale)} · {t("briefingSource")}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard/ai"
                    className="inline-flex items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold hover:bg-white/20"
                  >
                    {t("briefingOpen")}
                    <ArrowUpRight size={14} />
                  </Link>
                </div>

                <p className="max-w-3xl text-sm leading-relaxed text-emerald-50 sm:text-base">
                  {briefing?.executiveSummary || t("noBriefing")}
                </p>

                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href="/dashboard/stats"
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-[#e8d9ae] hover:bg-white/20"
                  >
                    [1] {t("kpi.members")}
                  </Link>
                  <Link
                    href="/dashboard/facebook-sync"
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-[#e8d9ae] hover:bg-white/20"
                  >
                    [2] {t("sync")}
                  </Link>
                  <Link
                    href="/dashboard/ai"
                    className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-bold text-[#e8d9ae] hover:bg-white/20"
                  >
                    [3] {t("systemPulse")}
                  </Link>
                </div>
              </div>
            </section>

            {/* Only decisions, not every metric */}
            <section>
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black">{t("priorities")}</h2>
                  <p className="text-xs text-[#7a847c]">{t("prioritiesNote")}</p>
                </div>
                <span className="rounded-full bg-[#eaf0e7] px-3 py-1 text-[11px] font-bold text-[#1a5632]">
                  {formatLocalizedDigits(Math.min(actions.length, 3), locale)}
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                {actions.length === 0 ? (
                  <div className="rounded-2xl border border-[#e3e7e1] bg-white p-5 text-xs text-[#7a847c] sm:col-span-3">
                    {t("noBriefing")}
                  </div>
                ) : (
                  actions.map((item, index) => {
                    const priority = item.priority === "high" ? "#b42318" : item.priority === "medium" ? "#b8892c" : "#1a5632";
                    const isStudio = item.href === "#ai-studio";
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col justify-between rounded-2xl border border-[#e3e7e1] bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
                      >
                        <div>
                          <div className="mb-3 flex items-center justify-between">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: priority }} />
                            <span className="text-[11px] font-black text-[#b6bdb6]">
                              {formatLocalizedDigits(index + 1, locale)}
                            </span>
                          </div>
                          <h3 className="text-sm font-black leading-snug">{item.title}</h3>
                          <p className="mt-1.5 text-xs leading-relaxed text-[#6b776d]">{item.desc}</p>
                        </div>
                        <Link
                          href={isStudio ? "/dashboard/ai" : (item.href as "/dashboard/members")}
                          className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-[#1a5632] hover:underline"
                        >
                          {t("view")}
                          <ArrowUpRight size={13} />
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </section>

            {/* Four KPIs only — every delta comes from data or is shown as unavailable */}
            <section>
              <h2 className="mb-3 text-lg font-black">{t("todayLabel")}</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  const change = trend(kpi.daily);
                  return (
                    <Link
                      key={kpi.key}
                      href={kpi.href}
                      className="rounded-2xl border border-[#e3e7e1] bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-center justify-between">
                        <div
                          className="flex h-10 w-10 items-center justify-center rounded-xl"
                          style={{ backgroundColor: `${kpi.color}16`, color: kpi.color }}
                        >
                          <Icon size={19} />
                        </div>
                        <Spark values={kpi.values} color={kpi.color} />
                      </div>
                      <p className="text-xs font-semibold text-[#7a847c]">{t(`kpi.${kpi.key}`)}</p>
                      <p className="mt-1 text-2xl font-black tracking-tight">
                        {formatLocalizedDigits(kpi.value.toLocaleString(), locale)}
                      </p>
                      <div className="mt-3 border-t border-[#eef0ec] pt-2.5">
                        {change === null ? (
                          <span className="text-[11px] text-[#a3aca4]">{t("noData")}</span>
                        ) : (
                          <span className="text-[11px] font-bold" style={{ color: change >= 0 ? "#1a5632" : "#b42318" }}>
                            {change > 0 ? "+" : ""}
                            {formatLocalizedDigits(change, locale)}
                            {tCommon("percentSign")} · {t("trendNote")}
                          </span>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </section>

            {/* One chart only */}
            <section className="grid gap-3 lg:grid-cols-3">
              <div className="rounded-2xl border border-[#e3e7e1] bg-white p-5 lg:col-span-2">
                <h2 className="text-sm font-black">{t("activity")}</h2>
                <p className="mb-5 text-[11px] text-[#8b968d]">{t("activityNote")}</p>
                <div className="flex h-32 items-end justify-between gap-2" dir="ltr">
                  {activity.map((day, index) => {
                    const second = activityComments[index]?.count ?? 0;
                    return (
                      <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1">
                        <div className="flex h-full items-end justify-center gap-0.5">
                          <div
                            className="w-2.5 rounded-t bg-[#1a5632]"
                            style={{ height: `${Math.max(3, (day.count / activityMax) * 100)}%` }}
                          />
                          <div
                            className="w-2.5 rounded-t bg-[#c8a84e]"
                            style={{ height: `${Math.max(3, (second / activityMax) * 100)}%` }}
                          />
                        </div>
                        <span className="text-center text-[9px] text-[#9aa39b]">{day.date.slice(5)}</span>
                      </div>
                    );
                  })}
                  {activity.length === 0 && (
                    <div className="m-auto text-xs text-[#9aa39b]">{t("noData")}</div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-[#e3e7e1] bg-white p-5">
                <h2 className="mb-4 text-sm font-black">{t("systemPulse")}</h2>
                <div className="space-y-3">
                  {[
                    { icon: RefreshCw, label: t("sync"), value: health?.syncStatus === "active" ? t("syncActive") : t("syncIdle") },
                    { icon: Database, label: t("latency"), value: health ? `${formatLocalizedDigits(health.tursoLatencyMs, locale)} ms` : t("noData") },
                    { icon: Cpu, label: t("engine"), value: health?.aiEngine || t("noData") },
                  ].map((row) => {
                    const Icon = row.icon;
                    return (
                      <div key={row.label} className="flex items-center justify-between rounded-xl bg-[#f7f9f6] px-3 py-2.5">
                        <span className="flex items-center gap-2 text-xs text-[#6b776d]">
                          <Icon size={14} className="text-[#8b968d]" />
                          {row.label}
                        </span>
                        <span className="text-[11px] font-black text-[#1a5632]">{row.value}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </section>
          </div>
        )}
      </main>

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e3e7e1] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#eef0ec] px-4 py-3">
              <Search size={16} className="text-[#8b968d]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setPaletteOpen(false)} className="text-[#8b968d] hover:text-[#16231b]">
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-[#9aa39b]">{t("noData")}</p>
              ) : (
                filtered.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setPaletteOpen(false);
                        router.push(item.href);
                      }}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#4d5a50] hover:bg-[#f2f5f0] ${isRtl ? "text-right" : "text-left"}`}
                    >
                      <Icon size={16} className="text-[#8b968d]" />
                      {t(`nav.${item.key}`)}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[#eef0ec] px-4 py-2 text-[10px] text-[#9aa39b]">{t("searchTitle")} · ESC</div>
          </div>
        </div>
      )}
    </div>
  );
}
