"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState, useTransition } from "react";
import { Link } from "@/i18n/routing";
import { 
  CheckSquare, Users, MessageSquare, Sparkles, FileText, 
  LayoutDashboard, Calendar, Mail, Eye, MessageCircle, 
  TrendingUp, BarChart3, Activity, UserPlus, Heart, 
  Megaphone, ShieldAlert, Award, Clock, ArrowUpRight, 
  Zap, Compass, Cpu, RefreshCw, Send, Copy, Check,
  ChevronRight, ArrowRight, ShieldCheck, HelpCircle,
  Share2, AlertCircle, Bot, Globe
} from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { FreeSyrianFlag, DutchFlag } from "@/components/flags";

interface Stats {
  tasks: number;
  users: number;
  messages: number;
  events: number;
  subscribers: number;
  posts: number;
  comments: number;
  volunteers: number;
  ads: number;
  totalViews: number;
  totalAdClicks: number;
  membersByStatus: Record<string, number>;
  newUsersThisWeek?: number;
  newMembersThisWeek?: number;
  vitalityScore?: number;
  provinceDistribution?: { name: string; count: number }[];
  topPosts: { title: string; views: number; slug: string }[];
  postsByCategory: { name: string; count: number }[];
  commentsByDay: { date: string; count: number }[];
  usersByDay: { date: string; count: number }[];
  membersByDay: { date: string; count: number }[];
}

interface AIBriefingData {
  vitalityScore: number;
  executiveSummary: string;
  actionItems: { id: string; title: string; desc: string; priority: string; href: string }[];
  provincesData: { name: string; count: number }[];
  sentimentScore: number | null;
  systemHealth: {
    syncStatus: string;
    tursoLatencyMs: number;
    aiEngine: string;
    lastSync: string | null;
  };
}

export default function DashboardPage() {
  const { data: session, status } = useSession();
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const locale = useLocale();
  const isRtl = locale === "ar";
  
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<Stats>({
    tasks: 0,
    users: 0,
    messages: 0,
    events: 0,
    subscribers: 0,
    posts: 0,
    comments: 0,
    volunteers: 0,
    ads: 0,
    totalViews: 0,
    totalAdClicks: 0,
    membersByStatus: {},
    topPosts: [],
    postsByCategory: [],
    commentsByDay: [],
    usersByDay: [],
    membersByDay: [],
  });

  const [aiData, setAiData] = useState<AIBriefingData | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // AI Studio state
  const [showAiStudio, setShowAiStudio] = useState(false);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiType, setAiType] = useState<"announcement" | "social" | "press">("announcement");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const loadAllData = async () => {
    try {
      setRefreshing(true);
      const [statsRes, aiRes] = await Promise.all([
        fetch("/api/dashboard/stats").then(r => r.json()),
        fetch(`/api/dashboard/ai-briefing?locale=${locale}`).then(r => r.json()).catch(() => null)
      ]);
      setStats(statsRes);
      if (aiRes && !aiRes.error) {
        setAiData(aiRes);
      }
    } catch (e) {
      console.error("Failed to load dashboard data:", e);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setMounted(true);
    if (status === "authenticated") {
      loadAllData();
    }
  }, [status, locale]);

  if (!session) return null;

  const totalApplications = Object.values(stats.membersByStatus).reduce((a, b) => a + b, 0);
  const vitality = aiData?.vitalityScore ?? stats.vitalityScore ?? 0;
  const health = aiData?.systemHealth;

  const handleGenerateAi = async () => {
    if (!aiPrompt.trim() || isGenerating) return;
    setIsGenerating(true);
    try {
      const res = await fetch("/api/dashboard/ai-briefing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: aiPrompt, type: aiType, targetLocale: locale }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedContent(data.result);
      }
    } catch (e) {
      console.error("AI Generation failed:", e);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* 1. TOP EXECUTIVE HERO BAR */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0c2e17] via-[#114022] to-[#1a5632] p-6 lg:p-8 text-white shadow-xl border border-emerald-700/40">
        {/* Ambient background glows */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-400/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-72 h-72 rounded-full bg-[#c8a84e]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#c8a84e]/20 text-[#edd28a] border border-[#c8a84e]/30">
                <Award className="w-3.5 h-3.5 text-[#c8a84e]" />
                {locale === "nl" ? "Directiecentrum SGN" : locale === "en" ? "SGN Executive Center" : "مركز القيادة التنفيذي"}
              </span>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-200 border border-emerald-500/30">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {locale === "nl" ? "Live monitoring actief" : locale === "en" ? "Live Telemetry Active" : "المراقبة الحية نشطة"}
              </span>
            </div>

            <div>
              <h1 className="text-2xl lg:text-3xl font-black tracking-tight flex items-center gap-2 flex-wrap" dir="auto">
                <span>{locale === "nl" ? "Welkom," : locale === "en" ? "Welcome," : "أهلاً وسهلاً بك،"}</span>
                <span className="text-emerald-300 font-extrabold">{session.user?.name}</span>
                <span className="text-xl">👋</span>
              </h1>
              <p className="text-xs sm:text-sm text-emerald-100/90 font-medium max-w-2xl mt-1">
                {locale === "nl" 
                  ? "Geavanceerd dashboard voor het beheer van de Syrische gemeenschap in Nederland. Bekijk actuele indicatoren en AI-analyses."
                  : locale === "en"
                  ? "Next-gen command center for managing the Syrian community in the Netherlands. Real-time metrics and AI intelligence."
                  : "لوحة القيادة المتطورة لإدارة وتوجيه شؤون الجالية السورية في هولندا. مؤشرات تفاعلية حية، وتحليلات فورية بالذكاء الاصطناعي."}
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => setShowAiStudio(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#c8a84e] text-emerald-950 hover:bg-[#dfbd5f] transition-all shadow-md active:scale-95"
              >
                <Sparkles className="w-4 h-4 text-emerald-950" />
                {locale === "nl" ? "AI Studio (Bericht maken)" : locale === "en" ? "AI Studio (Draft)" : "صياغة منشور بـ AI Studio"}
              </button>

              <button
                onClick={loadAllData}
                disabled={refreshing}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all backdrop-blur-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
                {locale === "nl" ? "Verversen" : locale === "en" ? "Refresh" : "تحديث حي"}
              </button>

              <Link
                href="/dashboard/members"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium bg-emerald-900/60 hover:bg-emerald-900 text-emerald-100 border border-emerald-600/30 transition-all"
              >
                <UserPlus className="w-3.5 h-3.5 text-[#c8a84e]" />
                {locale === "nl" ? "Ledenlijst" : locale === "en" ? "Members" : "طلبات الانتساب"}
              </Link>
            </div>
          </div>

          {/* Platform Vitality Score Radial Card */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 shrink-0 justify-between lg:justify-start">
            <div className="relative w-20 h-20 flex items-center justify-center shrink-0">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-white/15"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-[#c8a84e] transition-all duration-1000 ease-out"
                  strokeDasharray={`${vitality}, 100`}
                  strokeLinecap="round"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <div className="absolute flex flex-col items-center justify-center text-center">
                <span className="text-lg font-black text-white leading-none">
                  {formatLocalizedDigits(vitality, locale)}{tCommon("percentSign")}
                </span>
                <span className="text-[9px] text-[#edd28a] font-bold mt-0.5">
                  {locale === "nl" ? "Score" : locale === "en" ? "Score" : "المؤشر"}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[#edd28a]">
                <Activity className="w-3.5 h-3.5" />
                <span className="text-xs font-bold">
                  {locale === "nl" ? "Platformvitaliteit" : locale === "en" ? "Platform Vitality" : "حيوية المنصة"}
                </span>
              </div>
              <p className="text-[11px] text-emerald-100 max-w-[130px] leading-tight">
                {locale === "nl" 
                  ? "Uitstekende interactie en stabiele werking" 
                  : locale === "en" 
                  ? "High community engagement & healthy pulse" 
                  : "نشاط مجتمعي ممتاز وتفاعل نوعي مستمر"}
              </p>
              <div className="flex items-center gap-1 text-[10px] text-emerald-300 font-bold">
                <TrendingUp className="w-3 h-3 text-[#c8a84e]" />
                <span>{stats.newMembersThisWeek ? t("newThisWeek", { count: formatLocalizedDigits(stats.newMembersThisWeek, locale) }) : t("noRecentGrowth")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. AI EXECUTIVE INTELLIGENCE BRIEFING & ACTION RADAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Executive Briefing */}
        <div className="lg:col-span-2 rounded-3xl bg-gradient-to-br from-emerald-950/40 via-white to-white dark:from-gray-900 dark:via-gray-900 dark:to-emerald-950/30 p-6 border border-emerald-600/20 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-[#1a5632] to-[#c8a84e] flex items-center justify-center text-white shadow-sm">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-sm sm:text-base flex items-center gap-1.5">
                  <span>{locale === "nl" ? "AI Executive Briefing" : locale === "en" ? "AI Executive Briefing" : "الإحاطة التنفيذية الذكية (AI Briefing)"}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold dark:bg-emerald-900/50 dark:text-emerald-300">
                    {locale === "nl" ? "Live Analyse" : locale === "en" ? "Live Analysis" : "تحليل فوري"}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  {locale === "nl" ? "Automatische samenvatting van platformactiviteit" : locale === "en" ? "Synthesized intelligence based on today's community pulse" : "قراءة استراتيجية لنبض المنصة والقرارات التشغيلية الموصى بها"}
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowAiStudio(true)}
              className="text-xs font-bold text-[#1a5632] dark:text-[#c8a84e] hover:underline flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>{locale === "nl" ? "AI Studio" : locale === "en" ? "AI Studio" : "استوديو الذكاء الاصطناعي"}</span>
            </button>
          </div>

          <div className="bg-emerald-50/60 dark:bg-emerald-950/20 rounded-2xl p-4 border border-emerald-100 dark:border-emerald-800/30 text-xs sm:text-sm text-gray-800 dark:text-gray-200 leading-relaxed font-medium">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 mt-2 shrink-0 animate-ping" />
              <p>
                {aiData?.executiveSummary || (
                  locale === "nl" 
                    ? "De Syrische Gemeenschap in Nederland groeit gestaag met actieve participatie. De kernprioriteit voor vandaag is het verifiëren van nieuwe aanmeldingen."
                    : locale === "en"
                    ? "The Syrian Community in the Netherlands is experiencing steady engagement. The top priority today is reviewing pending member verifications."
                    : "تشهد منصة الجالية السورية في هولندا نمواً متصاعداً مع تفاعل نوعي على مختلف الخدمات. الأولوية التشغيلية اليوم هي اعتماد طلبات الانتساب الجديدة ومتابعة استفسارات شؤون الإقامة والاندماج."
                )}
              </p>
            </div>
          </div>

          {/* Action Items */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {(aiData?.actionItems || [
              {
                id: "1",
                title: locale === "nl" ? "Ledenverificatie" : locale === "en" ? "Member Approvals" : "اعتماد طلبات الانتساب",
                desc: locale === "nl" ? "Nieuwe aanvragen wachten op controle" : locale === "en" ? "Pending verification requests" : "مراجعة واعتماد طلبات العضوية المعلقة",
                priority: "high",
                href: "/dashboard/members"
              },
              {
                id: "2",
                title: locale === "nl" ? "Berichten beantwoorden" : locale === "en" ? "Respond to Inquiries" : "استفسارات الجالية",
                desc: locale === "nl" ? "Vragen over verblijf en procedures" : locale === "en" ? "Questions regarding IND and residence" : "متابعة استفسارات الإقامة والاندماج",
                priority: "medium",
                href: "/dashboard/messages"
              },
              {
                id: "3",
                title: locale === "nl" ? "AI Publicatie" : locale === "en" ? "AI Publishing" : "صياغة بيان رسمي",
                desc: locale === "nl" ? "Stel een mededeling in 3 talen op" : locale === "en" ? "Publish across 3 languages" : "صياغة بيان ونشره بثلاث لغات بضغطة زر",
                priority: "normal",
                href: "#ai-studio"
              }
            ]).map((item, idx) => (
              <div 
                key={idx}
                className="bg-white dark:bg-gray-800/80 rounded-2xl p-3 border border-gray-100 dark:border-gray-700/60 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/40">
                      {locale === "nl" ? "Aanbevolen" : locale === "en" ? "Recommended" : "إجراء ذكي مقترح"}
                    </span>
                    <span className="text-[11px] font-black text-gray-400">
                      #{formatLocalizedDigits(idx + 1, locale)}
                    </span>
                  </div>
                  <h4 className="text-xs font-bold text-gray-900 dark:text-white group-hover:text-[#1a5632] dark:group-hover:text-emerald-400 transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                    {item.desc}
                  </p>
                </div>

                <div className="mt-3 pt-2 border-t border-gray-100 dark:border-gray-700/40 flex items-center justify-between">
                  {item.href === "#ai-studio" ? (
                    <button
                      onClick={() => setShowAiStudio(true)}
                      className="text-[11px] font-bold text-[#1a5632] dark:text-[#c8a84e] flex items-center gap-1 hover:underline"
                    >
                      <span>{locale === "nl" ? "Open Studio" : locale === "en" ? "Open Studio" : "فتح الاستوديو"}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </button>
                  ) : (
                    <Link
                      href={item.href}
                      className="text-[11px] font-bold text-[#1a5632] dark:text-[#c8a84e] flex items-center gap-1 hover:underline"
                    >
                      <span>{locale === "nl" ? "Bekijken" : locale === "en" ? "View" : "متابعة الآن"}</span>
                      <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Real-time Infrastructure & Sync Radar */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-200/80 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#1a5632] dark:text-emerald-400" />
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                {locale === "nl" ? "Systeemstatus & Sync" : locale === "en" ? "System Pulse & Sync" : "نبض البنية التقنية والمزامنة"}
              </h3>
            </div>
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
          </div>

          <div className="space-y-3">
            {[
              {
                name: locale === "nl" ? "Facebook Graph API Sync" : locale === "en" ? "Facebook Graph API Sync" : "مزامنة صفحة فيسبوك الرسمية",
                status: health?.syncStatus === "active" ? t("syncActive") : t("syncIdle"),
                detail: health?.lastSync ? t("lastSync", { time: formatLocalizedDigits(health.lastSync.slice(0, 10), locale) }) : t("dataNotAvailable"),
                color: "text-blue-500",
                bg: "bg-blue-50 dark:bg-blue-950/30"
              },
              {
                name: locale === "nl" ? "YouTube RSS Stream" : locale === "en" ? "YouTube RSS Stream" : "تغذية قناة يوتيوب المرئية",
                status: health?.lastSync ? t("syncActive") : t("syncIdle"),
                detail: health?.lastSync ? t("lastSync", { time: formatLocalizedDigits(health.lastSync.slice(0, 10), locale) }) : t("dataNotAvailable"),
                color: "text-rose-500",
                bg: "bg-rose-50 dark:bg-rose-950/30"
              },
              {
                name: locale === "nl" ? "Turso LibSQL Database" : locale === "en" ? "Turso LibSQL Cloud DB" : "قاعدة بيانات Turso السحابية",
                status: health ? t("latency", { count: formatLocalizedDigits(health.tursoLatencyMs, locale) }) : t("dataNotAvailable"),
                detail: health ? t("syncActive") : t("dataNotAvailable"),
                color: "text-emerald-600",
                bg: "bg-emerald-50 dark:bg-emerald-950/30"
              },
              {
                name: locale === "nl" ? "AI Inference Engine" : locale === "en" ? "AI Inference Engine" : "محرك الذكاء الاصطناعي",
                status: health?.aiEngine || t("dataNotAvailable"),
                detail: t("dataNotAvailable"),
                color: "text-purple-600",
                bg: "bg-purple-50 dark:bg-purple-950/30"
              }
            ].map((node, i) => (
              <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{node.name}</p>
                  <p className="text-[10px] text-gray-400">{node.status}</p>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${node.bg} ${node.color}`}>
                  {node.detail}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-2 text-center">
            <Link
              href="/dashboard/facebook-sync"
              className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-xl text-xs font-bold bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{locale === "nl" ? "Manoeuvreer Sync Beheer" : locale === "en" ? "Manage Data Sync" : "إدارة وتشغيل المزامنة الفورية"}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 3. BENTO GRID OF REVOLUTIONARY METRICS & INDICATORS */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-lg lg:text-xl font-black text-gray-900 dark:text-white">
              {locale === "nl" ? "Belangrijkste Prestatie-indicatoren (KPI's)" : locale === "en" ? "Core Platform Indicators (KPIs)" : "المؤشرات الاستراتيجية ونبض المجتمع"}
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {locale === "nl" ? "Realtimedata van de Syrische gemeenschap" : locale === "en" ? "Real-time metrics measuring community engagement" : "إحصائيات دقيقة ومحدثة لحظياً تعكس حجم النمو والتفاعل"}
            </p>
          </div>
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-200/50">
            {locale === "nl" ? "Wekelijkse Update" : locale === "en" ? "Weekly Telemetry" : "تحديث أسبوعي مستمر"}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: locale === "nl" ? "Geregistreerde Leden" : locale === "en" ? "Registered Members" : "الأعضاء والمستفيدين",
              val: totalApplications,
              unit: locale === "nl" ? "leden" : locale === "en" ? "members" : "عضو موثق",
              sub: stats.newMembersThisWeek ? t("newThisWeek", { count: formatLocalizedDigits(stats.newMembersThisWeek, locale) }) : t("noRecentGrowth"),
              icon: Users,
              accent: "from-emerald-500 to-teal-700",
              lightBg: "bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-300",
              href: "/dashboard/members"
            },
            {
              label: locale === "nl" ? "Totaal Aantal Weergaven" : locale === "en" ? "Content Views" : "مشاهدات وقراءات المنصة",
              val: stats.totalViews,
              unit: locale === "nl" ? "weergaven" : locale === "en" ? "views" : "قراءة ومطالعة",
              sub: `${formatLocalizedDigits(stats.comments ?? 0, locale)} ${t("stats.comments")}`,
              icon: Eye,
              accent: "from-rose-500 to-pink-700",
              lightBg: "bg-rose-50/80 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300",
              href: "/news"
            },
            {
              label: locale === "nl" ? "Vrijwilligers & Experts" : locale === "en" ? "Syrian Volunteers & Experts" : "الكوادر والمتطوعين السوريين",
              val: stats.volunteers,
              unit: locale === "nl" ? "experts" : locale === "en" ? "experts" : "كادر وكفاءة",
              sub: locale === "nl" ? "In 12 provincies" : locale === "en" ? "Across 12 provinces" : "في ١٢ مقاطعة هولندية",
              icon: Heart,
              accent: "from-purple-500 to-indigo-700",
              lightBg: "bg-purple-50/80 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300",
              href: "/dashboard/volunteers"
            },
            {
              label: locale === "nl" ? "Gemeenschapsberichten" : locale === "en" ? "Community Inquiries" : "استفسارات ورسائل الجالية",
              val: stats.messages,
              unit: locale === "nl" ? "berichten" : locale === "en" ? "messages" : "استفسار وطلب دعم",
              sub: tCommon("unknownValue"),
              icon: MessageSquare,
              accent: "from-amber-500 to-orange-700",
              lightBg: "bg-amber-50/80 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300",
              href: "/dashboard/messages"
            },
            {
              label: locale === "nl" ? "Aankomende Evenementen" : locale === "en" ? "Community Events" : "الفعاليات والندوات القادمة",
              val: stats.events,
              unit: locale === "nl" ? "evenementen" : locale === "en" ? "events" : "فعالية مجتمعية",
              sub: locale === "nl" ? "Cultureel & Juridisch" : locale === "en" ? "Legal & Cultural" : "توجيهية وثقافية",
              icon: Calendar,
              accent: "from-sky-500 to-blue-700",
              lightBg: "bg-sky-50/80 dark:bg-sky-950/30 text-sky-700 dark:text-sky-300",
              href: "/dashboard/events"
            },
            {
              label: locale === "nl" ? "Gepubliceerde Artikelen" : locale === "en" ? "Articles & News" : "المقالات والتقارير المنشورة",
              val: stats.posts,
              unit: locale === "nl" ? "artikelen" : locale === "en" ? "articles" : "مقال وخبر رسمي",
              sub: locale === "nl" ? "Syrië & Nederland" : locale === "en" ? "Syria & Netherlands" : "سورية وهولندية",
              icon: FileText,
              accent: "from-teal-500 to-emerald-700",
              lightBg: "bg-teal-50/80 dark:bg-teal-950/30 text-teal-700 dark:text-teal-300",
              href: "/dashboard/pages"
            },
            {
              label: locale === "nl" ? "Advertenties & Partners" : locale === "en" ? "Ads & Partner Network" : "شبكة الشركاء والإعلانات",
              val: stats.ads,
              unit: locale === "nl" ? "partners" : locale === "en" ? "partners" : "شريك ومؤسسة",
              sub: `${formatLocalizedDigits(stats.totalAdClicks || 0, locale)} ${locale === "nl" ? "interacties" : locale === "en" ? "clicks" : "تفاعل ونقرة"}`,
              icon: Megaphone,
              accent: "from-fuchsia-500 to-rose-700",
              lightBg: "bg-fuchsia-50/80 dark:bg-fuchsia-950/30 text-fuchsia-700 dark:text-fuchsia-300",
              href: "/dashboard/ads"
            },
            {
              label: locale === "nl" ? "Administratieve Taken" : locale === "en" ? "Admin Tasks" : "المهام والمتابعات الإدارية",
              val: stats.tasks,
              unit: locale === "nl" ? "taken" : locale === "en" ? "tasks" : "مهمة إدارية",
              sub: locale === "nl" ? "Georganiseerd beheer" : locale === "en" ? "Streamlined workflow" : "متابعة مستمرة للمكتب",
              icon: CheckSquare,
              accent: "from-blue-500 to-cyan-700",
              lightBg: "bg-blue-50/80 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300",
              href: "/dashboard/tasks"
            }
          ].map((card, i) => (
            <Link
              key={i}
              href={card.href}
              className="group relative rounded-3xl bg-white dark:bg-gray-900 p-5 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col justify-between"
            >
              {/* Subtle top gradient accent */}
              <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${card.accent} opacity-80`} />

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className={`w-10 h-10 rounded-2xl ${card.lightBg} flex items-center justify-center font-bold shadow-xs transition-transform group-hover:scale-105`}>
                    <card.icon className="w-5 h-5" />
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors" />
                </div>

                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  {card.label}
                </p>

                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl lg:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                    {formatLocalizedDigits(card.val.toLocaleString(), locale)}
                  </span>
                  <span className="text-[11px] font-bold text-gray-400">
                    {card.unit}
                  </span>
                </div>
              </div>

              <div className="mt-4 pt-2.5 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-[11px]">
                <span className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {card.sub}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* 4. GEOGRAPHIC DISTRIBUTION & POPULAR COMMUNITY CONTENT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Provincial Distribution */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Compass className="w-5 h-5 text-[#1a5632] dark:text-[#c8a84e]" />
              <div>
                <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                  {locale === "nl" ? "Spreiding over Nederlandse Provincies" : locale === "en" ? "Geographic Distribution (Provinces)" : "التوزيع الجغرافي للجالية في مقاطعات هولندا"}
                </h3>
                <p className="text-[11px] text-gray-400">
                  {locale === "nl" ? "Dichtheid van geregistreerde leden per provincie" : locale === "en" ? "Concentration of Syrian members across Dutch provinces" : "توزع ونسب الأعضاء في المقاطعات الهولندية"}
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/stats"
              className="text-xs font-bold text-[#1a5632] dark:text-[#c8a84e] hover:underline"
            >
              {locale === "nl" ? "Volledige kaart" : locale === "en" ? "Full Map" : "الخريطة الكاملة"}
            </Link>
          </div>

          <div className="space-y-3.5">
            {(stats.provinceDistribution ?? []).length === 0 ? (
              <p className="py-6 text-center text-xs text-gray-400">{t("noProvinceData")}</p>
            ) : (stats.provinceDistribution ?? []).map((prov, i) => {
              const maxCount = Math.max(...(stats.provinceDistribution?.map(p => p.count) || [1]), 1);
              const pct = Math.round((prov.count / Math.max(totalApplications, 1)) * 100);
              return (
                <div key={i} className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-gray-800 dark:text-gray-200">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-[#1a5632] dark:bg-[#c8a84e]" />
                      {prov.name}
                    </span>
                    <span className="text-gray-500 font-semibold">
                      {formatLocalizedDigits(prov.count, locale)} {locale === "nl" ? "leden" : locale === "en" ? "members" : "عضو"} ({formatLocalizedDigits(pct, locale)}{tCommon("percentSign")})
                    </span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-[#1a5632] to-[#c8a84e] transition-all duration-700" 
                      style={{ width: `${Math.min(100, (prov.count / maxCount) * 100)}%` }} 
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Community Content */}
        <div className="rounded-3xl bg-white dark:bg-gray-900 p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-[#c8a84e]" />
                <div>
                  <h3 className="font-extrabold text-gray-900 dark:text-white text-base">
                    {locale === "nl" ? "Meest Gelezen Artikelen" : locale === "en" ? "Top Read Articles" : "المقالات الأكثر قراءة وتأثيراً"}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    {locale === "nl" ? "Nieuws met hoogste interactie van lezers" : locale === "en" ? "High engagement stories in the community" : "الأخبار التي تحظى بأعلى نسب مطالعة ونقاش"}
                  </p>
                </div>
              </div>
              <Link
                href="/news"
                className="text-xs font-bold text-[#1a5632] dark:text-[#c8a84e] hover:underline"
              >
                {locale === "nl" ? "Alles bekijken" : locale === "en" ? "View All" : "كافة الأخبار"}
              </Link>
            </div>

            <div className="space-y-3">
              {(stats.topPosts ?? []).length === 0 ? (
                <p className="py-6 text-center text-xs text-gray-400">{t("noTopPosts")}</p>
              ) : (stats.topPosts ?? []).slice(0, 5).map((post, idx) => (
                <div 
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 hover:border-emerald-500/30 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 pr-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center justify-center text-xs font-black shrink-0">
                      {formatLocalizedDigits(idx + 1, locale)}
                    </span>
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate">
                      {post.title}
                    </p>
                  </div>
                  <span className="text-xs font-black text-[#1a5632] dark:text-[#c8a84e] shrink-0 flex items-center gap-1 bg-white dark:bg-gray-800 px-2.5 py-1 rounded-xl shadow-xs border border-gray-100 dark:border-gray-700">
                    <Eye className="w-3 h-3 text-gray-400" />
                    {formatLocalizedDigits(post.views.toLocaleString(), locale)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs">
            <span className="text-gray-400">
              {locale === "nl" ? "Automatisch gecategoriseerd met AI" : locale === "en" ? "AI Content Categorization Active" : "تصنيف المحتوى مؤتمت بالذكاء الاصطناعي"}
            </span>
            <span className="font-bold text-[#1a5632] dark:text-[#c8a84e]">
              SGN Editorial Intelligence
            </span>
          </div>
        </div>
      </div>

      {/* 5. AI STUDIO MODAL / DRAWER */}
      {showAiStudio && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-200 dark:border-gray-800 space-y-5 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#1a5632] to-[#c8a84e] flex items-center justify-center text-white shadow-md">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 dark:text-white text-base">
                    {locale === "nl" ? "SGN AI Instant Studio" : locale === "en" ? "SGN AI Instant Studio" : "استوديو الصياغة الذكي (AI Studio)"}
                  </h3>
                  <p className="text-xs text-gray-400">
                    {locale === "nl" ? "Creëer professionele mededelingen in 3 talen" : locale === "en" ? "Draft official press releases and community announcements" : "صياغة بيانات رسمية ومنشورات احترافية بثلاث لغات متطابقة بضغطة زر"}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowAiStudio(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold"
              >
                ✕
              </button>
            </div>

            {/* Prompt Form */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                {locale === "nl" ? "Waar gaat het bericht over?" : locale === "en" ? "What is this announcement about?" : "ما هو موضوع الإعلان أو البيان الرسمي؟"}
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={
                  locale === "nl" 
                    ? "Bijv. Uitnodiging voor een voorlichtingsbijeenkomst over inburgering in Amsterdam op zaterdag..." 
                    : locale === "en" 
                    ? "e.g., Invitation to a legal webinar regarding family reunification and IND rules next Saturday..."
                    : "مثال: إعلان رسمي عن تنظيم ندوة قانونية مجانية حول قوانين الإقامة ولم الشمل في أمستردام يوم السبت القادم مع توفير مترجمين..."
                }
                rows={3}
                className="w-full rounded-2xl p-3.5 text-xs sm:text-sm border border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#1a5632]"
              />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 font-medium">
                    {locale === "nl" ? "Type:" : locale === "en" ? "Type:" : "نوع المحتوى:"}
                  </span>
                  {[
                    { id: "announcement", label: locale === "nl" ? "Mededeling" : locale === "en" ? "Announcement" : "بيان رسمي" },
                    { id: "social", label: locale === "nl" ? "Social Media" : locale === "en" ? "Social Post" : "منشور فيسبوك" },
                    { id: "press", label: locale === "nl" ? "Persbericht" : locale === "en" ? "Press Release" : "خبر صحفي" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setAiType(t.id as any)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all ${
                        aiType === t.id
                          ? "bg-[#1a5632] text-white border-[#1a5632]"
                          : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleGenerateAi}
                  disabled={!aiPrompt.trim() || isGenerating}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-[#1a5632] to-[#123d24] text-white hover:opacity-95 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>{locale === "nl" ? "Aan het genereren..." : locale === "en" ? "Generating..." : "جاري الصياغة الذكية..."}</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-[#c8a84e]" />
                      <span>{locale === "nl" ? "Genereer 3 Talen" : locale === "en" ? "Generate 3 Languages" : "توليد بثلاث لغات"}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Generated Results */}
            {generatedContent && (
              <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-400">
                  {locale === "nl" ? "Gegenereerde Resultaten" : locale === "en" ? "Generated Output" : "المحتوى المولد جاهز للنشر:"}
                </h4>

                {/* Arabic */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-900 dark:text-emerald-300 flex items-center gap-1.5">
                      <FreeSyrianFlag className="w-4 h-3 rounded-xs" />
                      <span>النسخة العربية (العربية الفصحى)</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${generatedContent.titleAr}\n\n${generatedContent.contentAr}`, "ar")}
                      className="text-xs text-emerald-800 dark:text-emerald-300 font-bold hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "ar" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "ar" ? "تم النسخ!" : "نسخ النص"}</span>
                    </button>
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{generatedContent.titleAr}</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generatedContent.contentAr}</p>
                </div>

                {/* Dutch */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <DutchFlag className="w-4 h-3 rounded-xs" />
                      <span>Nederlandse Versie (Professioneel)</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${generatedContent.titleNl}\n\n${generatedContent.contentNl}`, "nl")}
                      className="text-xs text-gray-600 dark:text-gray-300 font-bold hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "nl" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "nl" ? "Gekopieerd!" : "Kopiëren"}</span>
                    </button>
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{generatedContent.titleNl}</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generatedContent.contentNl}</p>
                </div>

                {/* English */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      <span>English Version</span>
                    </span>
                    <button
                      onClick={() => copyToClipboard(`${generatedContent.titleEn}\n\n${generatedContent.contentEn}`, "en")}
                      className="text-xs text-gray-600 dark:text-gray-300 font-bold hover:underline flex items-center gap-1"
                    >
                      {copiedKey === "en" ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedKey === "en" ? "Copied!" : "Copy"}</span>
                    </button>
                  </div>
                  <p className="text-xs font-bold text-gray-900 dark:text-white">{generatedContent.titleEn}</p>
                  <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{generatedContent.contentEn}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
