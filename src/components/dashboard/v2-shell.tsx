"use client";

import { useSession } from "next-auth/react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Link, useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import {
  BarChart3, Calendar, CheckSquare, ClipboardList, Database, Facebook, FileText, House,
  Folder, Heart, Image as ImageIcon, Landmark, LayoutDashboard, Mail, MessageSquare,
  MousePointerClick, Printer, ScrollText, Search, Shield, SlidersHorizontal, Smartphone, UserCog, Users,
  Wallet, X,
} from "lucide-react";

type NavItem = { key: string; href: string; icon: typeof Users };

const groups: { key: string; items: NavItem[] }[] = [
  {
    key: "today",
    items: [
      { key: "overview", href: "/dashboard/v2", icon: LayoutDashboard },
      { key: "tasks", href: "/dashboard/v2/tasks", icon: CheckSquare },
    ],
  },
  {
    key: "community",
    items: [
      { key: "members", href: "/dashboard/v2/members", icon: Users },
      { key: "board", href: "/dashboard/v2/board", icon: Landmark },
      { key: "comments", href: "/dashboard/v2/comments", icon: MessageSquare },
      { key: "messages", href: "/dashboard/v2/messages", icon: Mail },
      { key: "events", href: "/dashboard/v2/events", icon: Calendar },
      { key: "content", href: "/dashboard/v2/content", icon: FileText },
      { key: "volunteers", href: "/dashboard/v2/volunteers", icon: Heart },
    ],
  },
  {
    key: "operations",
    items: [
      { key: "subscribers", href: "/dashboard/v2/subscribers", icon: Mail },
      { key: "ads", href: "/dashboard/v2/ads", icon: MousePointerClick },
      { key: "surveys", href: "/dashboard/v2/surveys", icon: ClipboardList },
      { key: "regulations", href: "/dashboard/v2/regulations", icon: ScrollText },
      { key: "vault", href: "/dashboard/v2/vault", icon: Folder },
      { key: "membershipSettings", href: "/dashboard/v2/membership-settings", icon: SlidersHorizontal },
      { key: "documentsGenerator", href: "/dashboard/v2/documents-generator", icon: Printer },
      { key: "facebookSync", href: "/dashboard/v2/facebook-sync", icon: Facebook },
    ],
  },
  {
    key: "system",
    items: [
      { key: "system", href: "/dashboard/v2/system", icon: Database },
      { key: "users", href: "/dashboard/v2/users", icon: Shield },
      { key: "media", href: "/dashboard/v2/media", icon: ImageIcon },
      { key: "stats", href: "/dashboard/v2/stats", icon: BarChart3 },
      { key: "settings", href: "/dashboard/v2/settings", icon: UserCog },
      { key: "mobileControl", href: "/dashboard/v2/mobile-control", icon: Smartphone },
    ],
  },
  {
    key: "finance",
    items: [{ key: "finance", href: "/dashboard/v2/finance", icon: Wallet }],
  },
];

export function V2Shell({
  active,
  section,
  children,
}: {
  active: string;
  section: string;
  children: ReactNode;
}) {
  const { data: session } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboardV2");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [query, setQuery] = useState("");

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

  const allItems = groups.flatMap((g) => g.items);
  const filtered = query.trim()
    ? allItems.filter((item) => t(`nav.${item.key}`).toLowerCase().includes(query.trim().toLowerCase()))
    : allItems;

  const formattedDate = formatLocalizedDigits(
    new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale === "nl" ? "nl-NL" : "en-GB", {
      weekday: "long", day: "numeric", month: "long", year: "numeric",
    }).format(new Date()),
    locale,
  );

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-[#f7f4ed] font-sans text-[#203026]">
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
                  const isActive = item.href === active;
                  return (
                    <Link
                      key={item.key}
                      href={item.href as "/dashboard/v2"}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors ${
                        isActive
                          ? `bg-white/10 font-bold text-white ${isRtl ? "border-r-2 border-[#c8a84e]" : "border-l-2 border-[#c8a84e]"}`
                          : "text-white/65 hover:bg-white/5 hover:text-white"
                      }`}
                    >
                      <Icon size={17} className={isActive ? "text-[#e2c77c]" : "text-white/45"} />
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
              {(session?.user?.name ?? t("guest")).slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold">{session?.user?.name ?? t("guest")}</p>
              <p className="text-[10px] text-white/50">{t("adminRole")}</p>
            </div>
          </div>
          <Link
            href={`/${locale}`}
            className="flex items-center justify-center gap-2 rounded-xl border border-white/15 px-3 py-2 text-[11px] font-bold text-white/70 hover:bg-white/5 hover:text-white"
          >
            <House size={13} />
            {t("backToHome")}
          </Link>
        </div>
      </aside>

      <main className={`${isRtl ? "lg:mr-64" : "lg:ml-64"} mx-auto max-w-[1180px] px-5 py-7 sm:px-9 sm:py-9`}>
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-bold text-[#8a958b]">
            <span>{t("breadcrumbDashboard")}</span>
            <span className="text-[#c8a84e]">/</span>
            <span className="text-[#1a5632]">{section}</span>
          </div>
          <span className="rounded-full border border-[#e3d3ad] bg-[#f5ecd6] px-3 py-1.5 text-[10px] font-black text-[#8a6a1f]">
            {formattedDate}
          </span>
        </div>
        {children}
      </main>

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
