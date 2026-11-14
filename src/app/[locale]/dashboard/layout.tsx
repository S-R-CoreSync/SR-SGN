"use client";

import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Link, useRouter, usePathname } from "@/i18n/routing";
import { LayoutDashboard, CheckSquare, Users, FileText, LogOut, Menu, X, MessageSquare, Sparkles, MessageCircle, Mail, Calendar, HandHeart, Globe, Megaphone, User, BarChart3, Shield, Image as ImageIcon, Facebook, Heart, Building2, Smartphone, Search, ChevronDown, ChevronRight, ArrowUpRight, Printer, Command } from "lucide-react";
import { useTranslations } from "next-intl";
import { ThemeToggle } from "@/components/theme-toggle";
import { SgnLogo } from "@/components/sgn-logo";
import { NotificationBell } from "@/components/notification-bell";
import { NotificationToaster } from "@/components/notification-toaster";
import { FreeSyrianFlag, DutchFlag } from "@/components/flags";
import { CommandPalette } from "@/components/dashboard/command-palette";
import { ExecutiveReportModal } from "@/components/dashboard/executive-report-modal";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [commandOpen, setCommandOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({
    overview: false,
    content: false,
    community: false,
    interactions: true,
    system: true,
  });

  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && (session?.user as any)?.role !== "admin") {
      router.push("/");
    }
  }, [status, session, router]);



  if (status === "loading") {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center"><div className="animate-spin w-8 h-8 border-4 border-[#1a5632] border-t-transparent rounded-full" /></div>;
  }
  if (!session || (session.user as any)?.role !== "admin") return null;

  const role = (session.user as any)?.role || "member";

  function canAccess(item: { admin?: boolean; editor?: boolean }) {
    if (item.admin) return role === "admin";
    if (item.editor) return role === "admin" || role === "editor";
    return true;
  }

  const toggleGroup = (groupId: string) => {
    setCollapsedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  const navGroups = [
    {
      id: "overview",
      title: t("navGroups.overview"),
      items: [
        { label: t("viewSite"), href: "/", icon: Globe },
        { label: t("title"), href: "/dashboard", icon: LayoutDashboard },
        { label: t("ai"), href: "/dashboard/ai", icon: Sparkles },
        { label: t("statsLink"), href: "/dashboard/stats", icon: BarChart3 },
        { label: t("memberProfile"), href: "/dashboard/member-profile", icon: User },
        { label: t("settings"), href: "/dashboard/settings", icon: User },
      ]
    },
    {
      id: "content",
      title: t("navGroups.content"),
      items: [
        { label: t("pages"), href: "/dashboard/pages", icon: FileText, editor: true },
        { label: t("events"), href: "/dashboard/events", icon: Calendar, editor: true },
        { label: "النظام الداخلي", href: "/dashboard/regulations", icon: FileText, admin: true },
        { label: t("board"), href: "/dashboard/board", icon: Building2, admin: true },
        { label: t("landing"), href: "/dashboard/landing", icon: Globe, admin: true },
        { label: t("media"), href: "/dashboard/media", icon: ImageIcon, admin: true },
        { label: t("facebookSync"), href: "/dashboard/facebook-sync", icon: Facebook, admin: true },
      ]
    },
    {
      id: "community",
      title: t("navGroups.community"),
      items: [
        { label: t("members"), href: "/dashboard/members", icon: Users },
        { label: "إدارة المستندات", href: "/dashboard/members/vault", icon: Shield, admin: true },
        { label: t("documentsGenerator"), href: "/dashboard/documents-generator", icon: Printer, admin: true },
        { label: t("membershipSettings"), href: "/dashboard/membership-settings", icon: CheckSquare },
        { label: t("volunteers"), href: "/dashboard/volunteers", icon: HandHeart, editor: true },
        { label: t("tasks"), href: "/dashboard/tasks", icon: CheckSquare },
      ]
    },
    {
      id: "interactions",
      title: t("navGroups.interactions"),
      items: [
        { label: t("messages"), href: "/dashboard/messages", icon: MessageSquare },
        { label: t("comments"), href: "/dashboard/comments", icon: MessageCircle, admin: true },
        { label: t("subscribers"), href: "/dashboard/subscribers", icon: Mail, admin: true },
        { label: t("donationsPage.title"), href: "/dashboard/donations", icon: Heart, admin: true },
        { label: t("ads"), href: "/dashboard/ads", icon: Megaphone, admin: true },
        { label: t("surveys"), href: "/dashboard/surveys", icon: BarChart3, admin: true },
      ]
    },
    {
      id: "system",
      title: t("navGroups.system"),
      items: [
        { label: t("mobileControl"), href: "/dashboard/mobile-control", icon: Smartphone, admin: true },
        { label: t("users"), href: "/dashboard/users", icon: Users, admin: true },
        { label: t("roles"), href: "/dashboard/roles", icon: Shield, admin: true },
      ]
    }
  ];

  // Filter groups by accessible items and search query
  const filteredGroups = navGroups.map(group => {
    const accessible = group.items.filter(item => canAccess(item));
    const matching = accessible.filter(item => {
      if (!searchQuery) return true;
      const term = searchQuery.toLowerCase();
      return item.label.toLowerCase().includes(term) || group.title.toLowerCase().includes(term);
    });
    return { ...group, items: matching };
  }).filter(group => group.items.length > 0);

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - positioned on the right for RTL with overflow-y-auto */}
      <aside className={`fixed lg:sticky top-0 right-0 z-40 w-64 h-screen bg-white border-l overflow-y-auto transform transition-transform duration-200 print:hidden ${open ? "translate-x-0" : "translate-x-full lg:translate-x-0"}`}>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <SgnLogo size={36} className="w-9 h-9" priority />
              <div className="flex items-center gap-1.5" dir="rtl">
                <FreeSyrianFlag className="w-6 h-4 flex-shrink-0 transition-transform hover:scale-105" />
                <span className="font-bold text-gray-900 text-xs sm:text-sm px-0.5">{t("shortTitle")}</span>
                <DutchFlag className="w-6 h-4 flex-shrink-0 transition-transform hover:scale-105" />
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="lg:hidden p-1 hover:bg-gray-100 rounded" title="Close Menu" aria-label="Close Menu"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Search Box */}
        <div className="p-3 border-b">
          <div className="relative">
            <input
              type="text"
              placeholder={t("navSearchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-8 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#1a5632] focus:bg-white transition-all text-gray-800"
              dir="auto"
            />
            <Search className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute left-2.5 top-2 w-3.5 h-3.5 text-gray-400 hover:text-gray-600 flex items-center justify-center font-bold text-xs"
                title="Clear"
              >
                ×
              </button>
            )}
          </div>
        </div>

        <nav className="p-3 space-y-4">
          {filteredGroups.map(group => {
            const isCollapsed = collapsedGroups[group.id] && !searchQuery;
            return (
              <div key={group.id} className="space-y-1">
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider group"
                >
                  <span>{group.title}</span>
                  <span className="text-gray-300 group-hover:text-gray-500 transition-transform duration-150">
                    {isCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </span>
                </button>
                {!isCollapsed && (
                  <div className="space-y-0.5 transition-all">
                    {group.items.map((n) => {
                      const isActive = pathname === n.href;
                      return (
                        <Link
                          key={n.href}
                          href={n.href}
                          prefetch={true}
                          className={`flex items-center gap-3 px-3 py-2 text-sm rounded-xl transition-all duration-150 ${
                            isActive
                              ? "bg-emerald-50 text-[#1a5632] font-bold shadow-sm"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          <n.icon className={`w-4 h-4 shrink-0 ${isActive ? "text-[#1a5632]" : "text-gray-400"}`} />
                          <span className="truncate">{n.label}</span>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          <hr className="my-3" />
          <button onClick={() => signOut()} className="flex items-center gap-3 px-3 py-2.5 text-red-600 hover:bg-red-50 rounded-xl text-sm w-full transition-colors font-medium">
            <LogOut className="w-4 h-4 shrink-0" />
            {t("logout")}
          </button>
        </nav>
      </aside>

      {/* Overlay */}
      {open && <div onClick={() => setOpen(false)} className="fixed inset-0 bg-black/20 z-30 lg:hidden" />}

      {/* Main */}
      <div className="flex-1 min-h-screen bg-gray-50/70 dark:bg-gray-950 transition-colors print:bg-white print:p-0 print:m-0">
        <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800 px-4 lg:px-6 h-16 flex items-center justify-between sticky top-0 z-20 transition-colors print:hidden">
          <div className="flex items-center gap-3">
            <button onClick={() => setOpen(true)} className="lg:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-700 dark:text-gray-200" title="Open Menu" aria-label="Open Menu"><Menu className="w-5 h-5" /></button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <h2 className="text-base font-extrabold text-gray-900 dark:text-white">{t("title")}</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#c8a84e]/20 text-[#967d32] dark:text-[#edd28a] border border-[#c8a84e]/30">
                PRO 2026
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {/* Quick Command Palette Search */}
            <button
              onClick={() => setCommandOpen(true)}
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 bg-gray-100 hover:bg-gray-200/80 dark:bg-gray-800 dark:hover:bg-gray-700 transition-all border border-gray-200/80 dark:border-gray-700"
              title="البحث السريع والتنقل (Ctrl+K)"
            >
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span className="hidden md:inline">بحث سريع</span>
              <kbd className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-gray-400">Ctrl K</kbd>
            </button>

            {/* Executive PDF Report Button */}
            <button
              onClick={() => setReportOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-[#1a5632] dark:text-[#edd28a] bg-[#c8a84e]/15 hover:bg-[#c8a84e]/25 border border-[#c8a84e]/30 transition-all"
              title="تصدير تقرير الإدارة الرسمي PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">تقرير الإدارة (PDF)</span>
            </button>

            <Link
              href="/"
              target="_blank"
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 border border-emerald-200/60 dark:border-emerald-800/40 transition-all"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{t("viewSite")}</span>
              <ArrowUpRight className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            </Link>

            <NotificationBell />
            <ThemeToggle />
            
            <div className="flex items-center gap-2 pl-1 border-r border-gray-200 dark:border-gray-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight">{session.user?.name}</span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase tracking-wider">الإدارة المركزية</span>
              </div>
              <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1a5632] to-[#c8a84e] p-0.5 shadow-sm">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-gray-800 flex items-center justify-center overflow-hidden font-bold text-xs text-[#1a5632] dark:text-[#c8a84e]">
                  {session.user?.image ? (
                    <img src={session.user.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (session.user?.name || "?").charAt(0)
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>
        <main className="p-4 lg:p-8 space-y-6">
          {children}
        </main>
      </div>
      <NotificationToaster />

      {/* Spotlight Command Palette (Ctrl+K) */}
      <CommandPalette 
        open={commandOpen} 
        onClose={() => setCommandOpen(false)} 
        onPrintReport={() => setReportOpen(true)}
      />

      {/* Printable Executive Board Report Modal */}
      <ExecutiveReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        vitalityScore={92}
        stats={{}}
      />
    </div>
  );
}
