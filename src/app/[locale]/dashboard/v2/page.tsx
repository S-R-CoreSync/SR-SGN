"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import {
  ArrowLeft, ArrowUpRight, Calendar, CheckSquare, Database, FileText,
  LayoutDashboard, Mail, RefreshCw, Search, Settings, Users, X,
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

type NavItem = { key: string; href: string; icon: typeof Users };

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
  const router = useRouter();
  const t = useTranslations("dashboardV2");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [stats, setStats] = useState<Stats | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

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
        { key: "tasks", href: "/dashboard/tasks", icon: CheckSquare },
      ],
    },
    {
      key: "community",
      items: [
        { key: "members", href: "/dashboard/members", icon: Users },
        { key: "messages", href: "/dashboard/messages", icon: Mail },
        { key: "events", href: "/dashboard/events", icon: Calendar },
        { key: "pages", href: "/dashboard/pages", icon: FileText },
      ],
    },
    {
      key: "system",
      items: [
        { key: "sync", href: "/dashboard/facebook-sync", icon: RefreshCw },
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

  const last14 = (daily: Daily[] | undefined) => (daily ?? []).slice(-14).map((d) => d.count);
  const kpis = [
    { key: "members", value: stats?.users ?? 0, daily: stats?.usersByDay, color: "#1a5632", icon: Users, href: "/dashboard/members" },
    { key: "views", value: stats?.totalViews ?? 0, daily: stats?.commentsByDay, color: "#b8892c", icon: ArrowUpRight, href: "/news" },
    { key: "volunteers", value: stats?.volunteers ?? 0, daily: undefined, color: "#2f6b4f", icon: Users, href: "/dashboard/volunteers" },
    { key: "posts", value: stats?.posts ?? 0, daily: undefined, color: "#8a6a1f", icon: FileText, href: "/dashboard/pages" },
  ];

  const actions = [
    { key: "approvals", value: pending, href: "/dashboard/members", icon: CheckSquare },
    { key: "messages", value: stats?.messages ?? 0, href: "/dashboard/messages", icon: Mail },
    { key: "posts", value: stats?.posts ?? 0, href: "/dashboard/pages", icon: FileText },
  ];

  const activity = (stats?.usersByDay ?? []).slice(-7);
  const activityComments = (stats?.commentsByDay ?? []).slice(-7);
  const activityMax = Math.max(1, ...activity.map((d) => d.count), ...activityComments.map((d) => d.count));
  const db = health?.checks?.database;
  const facebook = health?.checks?.facebook;

  const formattedDate = formatLocalizedDigits(
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale === "nl" ? "nl-NL" : "en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date()),
    locale,
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f4ed] font-sans text-[#203026]">
      {/* Warm institutional rail */}
      <aside
        className={`fixed top-0 ${isRtl ? "right-0 border-l" : "left-0 border-r"} z-30 hidden h-screen w-64 flex-col border-[#0b2a19] bg-[#123b24] text-white lg:flex`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-[#c8a84e]/50 bg-[#c8a84e] text-base font-black text-[#123b24] shadow-lg shadow-black/20">
            {t("logoLetter")}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-extrabold tracking-tight">SGN</p>
            <p className="text-[10px] font-bold text-[#e2c77c]">{t("communityName")}</p>
          </div>
        </div>

        <button
          onClick={() => setPaletteOpen(true)}
          className={`mx-4 mt-5 flex items-center gap-2 rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs text-white/60 ${isRtl ? "text-right" : "text-left"} hover:bg-white/10`}
        >
          <Search size={15} />
          <span className="flex-1">{t("searchPlaceholder")}</span>
          <kbd className="rounded border border-white/20 px-1.5 py-0.5 text-[9px] font-bold text-white/70">⌘K</kbd>
        </button>

        <nav className="flex-1 space-y-6 overflow-y-auto px-4 py-6">
          {groups.map((group) => (
            <div key={group.key}>
              <p className="mb-2 px-3 text-[10px] font-black uppercase tracking-[0.16em] text-[#e2c77c]/70">
                {t(`groups.${group.key}`)}
              </p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const active = item.href === "/dashboard/v2";
                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        active
                          ? `bg-white/10 font-bold text-white ${isRtl ? "border-r-2 border-[#c8a84e]" : "border-l-2 border-[#c8a84e]"}`
                          : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={17} className={active ? "text-[#e2c77c]" : "text-white/45"} />
                      <span className="truncate">{t(`nav.${item.key}`)}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-white/5 px-3 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#e2c77c] text-xs font-black text-[#123b24]">
              {(session?.user?.name ?? "S").slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{session?.user?.name ?? t("guest")}</p>
              <p className="text-[10px] text-white/50">{t("adminRole")}</p>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft size={13} className={isRtl ? "rotate-180" : ""} />
            {t("backToClassic")}
          </Link>
        </div>
      </aside>

      <main className={`${isRtl ? "lg:mr-64" : "lg:ml-64"} mx-auto max-w-[1180px] px-5 py-7 sm:px-9 sm:py-9`}>
        {/* Breadcrumb and tools */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#8a958b]">
            <span>{t("breadcrumbDashboard")}</span>
            <span className="text-[#c8a84e]">/</span>
            <span className="text-[#1a5632]">{t("breadcrumbOverview")}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-[#e3d3ad] bg-[#f5ecd6] px-3 py-1.5 text-[10px] font-black text-[#8a6a1f]">
              {formattedDate}
            </span>
            <button
              onClick={() => void load()}
              title={t("retry")}
              aria-label={t("retry")}
              className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
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
            {/* Hero */}
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
                  {t("prototype")} · {t("communityName")}
                </p>
                <h1 className="text-2xl font-black tracking-tight sm:text-[32px]">
                  {t("greeting", { name: session?.user?.name ?? "" })}
                </h1>
                <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/65">{t("subtitle")}</p>
              </div>
            </section>

            {/* What needs attention */}
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
                      href={action.href as "/dashboard/members"}
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

            {/* Community pulse */}
            <section>
              <h2 className="mb-4 text-lg font-black tracking-tight">{t("pulseTitle")}</h2>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {kpis.map((kpi) => {
                  const Icon = kpi.icon;
                  const change = trend(kpi.daily);
                  return (
                    <Link
                      key={kpi.key}
                      href={kpi.href as "/dashboard/members"}
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

            {/* Activity + system */}
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
      </main>

      {/* Command palette */}
      {paletteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#0b2a19]/50 p-4 pt-24 backdrop-blur-sm"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg overflow-hidden rounded-2xl border border-[#e6ddc9] bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#f0ead9] px-4 py-3">
              <Search size={16} className="text-[#8a6a1f]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setPaletteOpen(false)} className="text-[#8a958b] hover:text-[#123b24]" aria-label={t("close")}>
                <X size={16} />
              </button>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <p className="p-4 text-center text-xs text-[#9aa399]">{t("noData")}</p>
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
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-[#4d5a50] hover:bg-[#f5ecd6] ${isRtl ? "text-right" : "text-left"}`}
                    >
                      <Icon size={16} className="text-[#8a6a1f]" />
                      {t(`nav.${item.key}`)}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[#f0ead9] bg-[#faf7f0] px-4 py-2 text-[10px] text-[#9aa399]">{t("searchTitle")} · ESC</div>
          </div>
        </div>
      )}
    </div>
  );
}
