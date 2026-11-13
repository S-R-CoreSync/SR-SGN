"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "@/i18n/routing";
import { useLocale, useTranslations } from "next-intl";
import { 
  Search, LayoutDashboard, Users, Calendar, Sparkles, 
  FileText, Heart, Megaphone, Settings, Globe, Shield, 
  MessageSquare, RefreshCw, Printer, ArrowRight, CornerDownLeft, 
  Command, X, Building2, UserPlus, CheckSquare
} from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";

interface CommandItem {
  id: string;
  title: string;
  category: string;
  href?: string;
  action?: () => void;
  icon: any;
  shortcut?: string;
}

export function CommandPalette({
  open,
  onClose,
  onOpenAiStudio,
  onPrintReport,
}: {
  open: boolean;
  onClose: () => void;
  onOpenAiStudio?: () => void;
  onPrintReport?: () => void;
}) {
  const router = useRouter();
  const locale = useLocale();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut listener for Ctrl+K / Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // parent handles toggle
      }
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setSelectedIndex(0);
    }
  }, [open]);

  const items: CommandItem[] = [
    // Actions
    {
      id: "ai-studio",
      title: locale === "nl" ? "AI Studio (Bericht opstellen)" : locale === "en" ? "AI Studio (Draft Announcement)" : "صياغة بيان أو منشور بـ AI Studio",
      category: locale === "nl" ? "Slimme Acties" : locale === "en" ? "Smart Actions" : "إجراءات ذكية فورية",
      icon: Sparkles,
      action: () => {
        onClose();
        onOpenAiStudio?.();
      },
      shortcut: "AI"
    },
    {
      id: "print-report",
      title: locale === "nl" ? "Directieverslag Exporteren (PDF)" : locale === "en" ? "Export Executive Report (PDF)" : "تصدير التقرير التنفيذي الرسمي (PDF)",
      category: locale === "nl" ? "Slimme Acties" : locale === "en" ? "Smart Actions" : "إجراءات ذكية فورية",
      icon: Printer,
      action: () => {
        onClose();
        onPrintReport?.();
      },
      shortcut: "PDF"
    },
    {
      id: "nav-docs-gen",
      title: locale === "nl" ? "Officiële Documenten & Contracten Generator" : locale === "en" ? "Official Paperwork & Contracts Generator" : "مولّد الورقيات والنماذج والعقود الرسمية",
      category: locale === "nl" ? "Slimme Acties" : locale === "en" ? "Smart Actions" : "إجراءات ذكية فورية",
      href: "/dashboard/documents-generator",
      icon: Printer,
      shortcut: "DOCS",
    },
    {
      id: "sync-data",
      title: locale === "nl" ? "Facebook & YouTube Sync Beheren" : locale === "en" ? "Manage Facebook & YouTube Sync" : "إدارة وتشغيل مزامنة الأخبار واليوتيوب",
      category: locale === "nl" ? "Slimme Acties" : locale === "en" ? "Smart Actions" : "إجراءات ذكية فورية",
      href: "/dashboard/facebook-sync",
      icon: RefreshCw,
    },
    // Navigation
    {
      id: "nav-overview",
      title: locale === "nl" ? "Directie Dashboard (Overzicht)" : locale === "en" ? "Executive Dashboard (Overview)" : "لوحة القيادة التنفيذية (الرئيسية)",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      id: "nav-members",
      title: locale === "nl" ? "Ledenbeheer & Verificatie" : locale === "en" ? "Members & Verifications" : "إدارة وتوثيق أعضاء الجالية",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/members",
      icon: Users,
    },
    {
      id: "nav-volunteers",
      title: locale === "nl" ? "Vrijwilligers & Experts" : locale === "en" ? "Volunteers & Experts" : "طلبات التطوع والكوادر السورية",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/volunteers",
      icon: Heart,
    },
    {
      id: "nav-events",
      title: locale === "nl" ? "Evenementen & Bijeenkomsten" : locale === "en" ? "Community Events" : "إدارة الفعاليات والندوات",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/events",
      icon: Calendar,
    },
    {
      id: "nav-messages",
      title: locale === "nl" ? "Berichten & Inburgeringsvragen" : locale === "en" ? "Community Inquiries" : "صندوق استفسارات ورسائل الجالية",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/messages",
      icon: MessageSquare,
    },
    {
      id: "nav-board",
      title: locale === "nl" ? "Bestuur & Secretariaat" : locale === "en" ? "Board of Directors" : "مجلس الإدارة ومكاتب الأمانة",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/board",
      icon: Building2,
    },
    {
      id: "nav-stats",
      title: locale === "nl" ? "Statistieken & Geografische Kaart" : locale === "en" ? "Provincial Stats & Map" : "الإحصائيات والخريطة الجغرافية",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/stats",
      icon: Globe,
    },
    {
      id: "nav-pages",
      title: locale === "nl" ? "Nieuws & Artikelen Beheer" : locale === "en" ? "News & Articles Management" : "إدارة الأخبار والمقالات",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/pages",
      icon: FileText,
    },
    {
      id: "nav-settings",
      title: locale === "nl" ? "Systeeminstellingen" : locale === "en" ? "System Settings" : "إعدادات المنظومة والصلاحيات",
      category: locale === "nl" ? "Navigatie" : locale === "en" ? "Navigation" : "التنقل السريع",
      href: "/dashboard/settings",
      icon: Settings,
    },
  ];

  const filteredItems = items.filter((item) => {
    if (!query) return true;
    const q = query.toLowerCase();
    return item.title.toLowerCase().includes(q) || item.category.toLowerCase().includes(q);
  });

  const handleSelect = (item: CommandItem) => {
    onClose();
    if (item.action) {
      item.action();
    } else if (item.href) {
      router.push(item.href as any);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
    } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
      e.preventDefault();
      handleSelect(filteredItems[selectedIndex]);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-16 sm:pt-24 p-4 animate-in fade-in duration-150">
      <div 
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          <Search className="w-5 h-5 text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
            placeholder={
              locale === "nl" 
                ? "Zoek acties, pagina's of leden... (↑↓ om te navigeren)" 
                : locale === "en" 
                ? "Search actions, pages, or members... (↑↓ to navigate)"
                : "ابحث في صفحات لوحة التحكم، الأعضاء، أو الإجراءات الذكية... (↑↓ للتنقل)"
            }
            className="w-full px-3 py-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-500 border border-gray-200 dark:border-gray-700">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 space-y-1 flex-1">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">
              {locale === "nl" ? "Geen resultaten gevonden" : locale === "en" ? "No commands found" : "لم يتم العثور على أي نتائج مطابقة"}
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <div
                  key={item.id}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                    isSelected
                      ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200 shadow-xs"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/60"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? "bg-[#1a5632] text-white shadow-xs"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                    }`}>
                      <item.icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold truncate">
                        {item.title}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {item.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.shortcut && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#c8a84e]/20 text-[#856c22] dark:text-[#edd28a] border border-[#c8a84e]/30">
                        {item.shortcut}
                      </span>
                    )}
                    {isSelected && (
                      <CornerDownLeft className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px] text-gray-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500">↑↓</span> {locale === "nl" ? "navigeren" : locale === "en" ? "navigate" : "للتنقل"}
            </span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-gray-500">↵</span> {locale === "nl" ? "selecteren" : locale === "en" ? "select" : "للاختيار"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-[#1a5632] dark:text-[#c8a84e]">
            <Sparkles className="w-3 h-3" />
            <span>SGN Command Center</span>
          </div>
        </div>
      </div>
    </div>
  );
}
