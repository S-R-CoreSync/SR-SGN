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

  const values = (daily: Daily[] | undefined) => (daily ?? []).slice(-14).map((d) => d.count);
  const rows = [
    { key: "members", value: stats?.users ?? 0, daily: stats?.usersByDay, href: "/dashboard/members" },
    { key: "views", value: stats?.totalViews ?? 0, daily: stats?.commentsByDay, href: "/news" },
    { key: "volunteers", value: stats?.volunteers ?? 0, daily: undefined, href: "/dashboard/volunteers" },
    { key: "posts", value: stats?.posts ?? 0, daily: undefined, href: "/dashboard/pages" },
  ];

  const tasks = [
    { key: "approvals", value: pending, href: "/dashboard/members" },
    { key: "messages", value: stats?.messages ?? 0, href: "/dashboard/messages" },
    { key: "posts", value: stats?.posts ?? 0, href: "/dashboard/pages" },
  ];

  const log = (stats?.usersByDay ?? []).filter((d) => d.count > 0).slice(-5).reverse();
  const now = new Date();
  const today = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  const db = health?.checks?.database;
  const facebook = health?.checks?.facebook;

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#fbfcfa] text-[#16231b]">
      {/* Slim icon rail */}
      <aside
        className={`fixed top-0 ${isRtl ? "right-0 border-l" : "left-0 border-r"} z-30 hidden h-screen w-16 flex-col items-center border-[#e9ece7] bg-white py-5 lg:flex`}
      >
        <div className="mb-8 flex h-9 w-9 items-center justify-center rounded-lg bg-[#113d22] text-sm font-black text-white">
          S
        </div>
        <nav className="flex flex-1 flex-col items-center gap-2">
          {groups.map((group, index) => (
            <div key={group.key} className="flex flex-col items-center gap-2">
              {index > 0 && <div className="my-2 h-px w-7 bg-[#e9ece7]" />}
              {group.items.map((item) => {
                const Icon = item.icon;
                const active = item.href === "/dashboard/v2";
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    title={t(`nav.${item.key}`)}
                    aria-label={t(`nav.${item.key}`)}
                    className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                      active ? "bg-[#eaf0e7] text-[#113d22]" : "text-[#8b968d] hover:bg-[#f2f5f0] hover:text-[#113d22]"
                    }`}
                  >
                    <Icon size={18} />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>
        <button
          onClick={() => setPaletteOpen(true)}
          title={t("searchTitle")}
          aria-label={t("searchTitle")}
          className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg text-[#8b968d] hover:bg-[#f2f5f0]"
        >
          <Search size={18} />
        </button>
        <Link
          href="/dashboard"
          title={t("backToClassic")}
          aria-label={t("backToClassic")}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[#8b968d] hover:bg-[#f2f5f0]"
        >
          <ArrowLeft size={18} className={isRtl ? "rotate-180" : ""} />
        </Link>
      </aside>

      <main className={`${isRtl ? "lg:mr-16" : "lg:ml-16"} mx-auto max-w-5xl px-5 py-10 sm:px-10`}>
        <header className="mb-9 flex flex-wrap items-end justify-between gap-4 border-b border-[#e9ece7] pb-7">
          <div>
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.18em] text-[#b8892c]">
              SGN · {t("prototype")} · {formatLocalizedDigits(today, locale)}
            </p>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              {t("greeting", { name: session?.user?.name ?? "" })}
            </h1>
            <p className="mt-2 text-sm text-[#6b776d]">{t("subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-[11px] text-[#9aa39b]">{t("prototypeNote")}</span>
            <button
              onClick={() => void load()}
              title={t("retry")}
              aria-label={t("retry")}
              className="rounded-lg border border-[#e9ece7] p-2 text-[#6b776d] hover:bg-[#f2f5f0]"
            >
              <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </header>

        {error ? (
          <div className="border border-red-200 bg-red-50/60 px-5 py-6 text-center text-sm text-red-700">
            {t("error")}
            <button onClick={() => void load()} className="mr-2 underline">{t("retry")}</button>
          </div>
        ) : loading ? (
          <div className="px-5 py-10 text-center text-sm text-[#9aa39b]">{t("loading")}</div>
        ) : (
          <div className="space-y-11">
            {/* Task strip */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#6b776d]">{t("tasksTitle")}</h2>
              <div className="grid gap-0 sm:grid-cols-3">
                {tasks.map((task, index) => (
                  <Link
                    key={task.key}
                    href={task.href}
                    className={`group flex items-baseline justify-between py-4 pr-4 ${
                      index > 0 ? "sm:border-r sm:border-[#e9ece7] sm:pr-6 sm:mr-2" : ""
                    }`}
                  >
                    <div>
                      <p className="text-xs text-[#6b776d]">{t(`task.${task.key}`)}</p>
                      <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-[#113d22]">
                        {formatLocalizedDigits(task.value.toLocaleString(), locale)}
                      </p>
                    </div>
                    <ArrowUpRight size={16} className="text-[#c8a84e] opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Quiet indicator table */}
            <section>
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#6b776d]">{t("todayLabel")}</h2>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#d8ddd6] text-[11px] font-bold uppercase tracking-wide text-[#9aa39b]">
                    <th className="py-2 text-right font-bold">{t("table.indicator")}</th>
                    <th className="py-2 text-left font-bold">{t("table.value")}</th>
                    <th className="py-2 text-left font-bold">{t("table.change")}</th>
                    <th className="py-2 text-left font-bold">{t("table.action")}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => {
                    const change = trend(row.daily);
                    return (
                      <tr key={row.key} className="border-b border-[#eef0ec]">
                        <td className="py-3.5 text-right text-[#4d5a50]">{t(`kpi.${row.key}`)}</td>
                        <td className="py-3.5 text-left text-base font-bold tabular-nums text-[#16231b]">
                          {formatLocalizedDigits(row.value.toLocaleString(), locale)}
                        </td>
                        <td className="py-3.5 text-left text-xs text-[#6b776d]">
                          {change === null ? (
                            <span className="text-[#a3aca4]">{t("noData")}</span>
                          ) : (
                            <span className={change >= 0 ? "text-[#1a5632]" : "text-[#b42318]"}>
                              {change > 0 ? "+" : ""}
                              {formatLocalizedDigits(change, locale)}
                              {tCommon("percentSign")}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 text-left">
                          <Link href={row.href} className="text-xs font-bold text-[#1a5632] hover:underline">
                            {t("table.open")}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <p className="mt-2 text-[11px] text-[#9aa39b]">{t("trendNote")}</p>
            </section>

            {/* Event log */}
            <section className="grid gap-10 lg:grid-cols-2">
              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#6b776d]">{t("activity")}</h2>
                {log.length === 0 ? (
                  <p className="text-xs text-[#9aa39b]">{t("noData")}</p>
                ) : (
                  <ul className="divide-y divide-[#eef0ec]">
                    {log.map((day) => (
                      <li key={day.date} className="flex items-center justify-between py-2.5 text-sm">
                        <span className="tabular-nums text-[#6b776d]">
                          {formatLocalizedDigits(day.date.slice(5), locale)}
                        </span>
                        <span className="font-bold tabular-nums text-[#16231b]">
                          {formatLocalizedDigits(day.count, locale)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <p className="mt-2 text-[11px] text-[#9aa39b]">{t("activityNote")}</p>
              </div>

              <div>
                <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#6b776d]">{t("systemTitle")}</h2>
                <ul className="divide-y divide-[#eef0ec]">
                  <li className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-[#6b776d]"><Database size={14} />{t("database")}</span>
                    <span className="font-bold tabular-nums text-[#16231b]">
                      {db ? `${formatLocalizedDigits(db.responseTime, locale)} ms` : t("noData")}
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-[#6b776d]"><RefreshCw size={14} />{t("sync")}</span>
                    <span className="font-bold text-[#16231b]">
                      {facebook
                        ? facebook.status === "ok" ? t("syncActive") : t("syncIdle")
                        : t("noData")}
                    </span>
                  </li>
                  <li className="flex items-center justify-between py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-[#6b776d]"><Settings size={14} />{t("apiVersion")}</span>
                    <span className="font-bold tabular-nums text-[#16231b]">{health?.checks?.api?.version ?? t("noData")}</span>
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
          className="fixed inset-0 z-50 flex items-start justify-center bg-[#16231b]/30 p-4 pt-24"
          onClick={() => setPaletteOpen(false)}
        >
          <div
            className="w-full max-w-lg border border-[#d8ddd6] bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 border-b border-[#e9ece7] px-4 py-3">
              <Search size={16} className="text-[#8b968d]" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="flex-1 bg-transparent text-sm outline-none"
              />
              <button onClick={() => setPaletteOpen(false)} className="text-[#8b968d] hover:text-[#16231b]" aria-label={t("close")}>
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
                      className={`flex w-full items-center gap-3 px-3 py-2.5 text-sm text-[#4d5a50] hover:bg-[#f2f5f0] ${isRtl ? "text-right" : "text-left"}`}
                    >
                      <Icon size={16} className="text-[#8b968d]" />
                      {t(`nav.${item.key}`)}
                    </button>
                  );
                })
              )}
            </div>
            <div className="border-t border-[#e9ece7] px-4 py-2 text-[10px] text-[#9aa39b]">{t("searchTitle")} · ESC</div>
          </div>
        </div>
      )}
    </div>
  );
}
