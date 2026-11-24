"use client";
import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { 
  Search, MapPin, Briefcase, Star, MessageCircle, Loader2, User, 
  Map as MapIcon, LayoutGrid, Sparkles, FileText, GraduationCap, 
  HeartHandshake, Tag, QrCode, Calculator, Scale, ShoppingBag,
  Coins, TrendingDown, ChefHat, Truck, Award, CreditCard,
  Crown, Users, ShieldAlert, Moon, Building2, IdCard
} from "lucide-react";
import { TopBar } from "@/components/home/top-bar";
import { SiteHeader } from "@/components/home/site-header";
import { Link } from "@/i18n/routing";
import { NLMap } from "@/components/home/nl-map";
import { formatLocalizedNumber, formatLocalizedDigits } from "@/lib/language-guard";

interface ServiceMember {
  id: string;
  nameAr: string;
  nameNl: string;
  profession: string | null;
  nlCity: string;
  nlProvincie: string;
  serviceDescription: string | null;
  avatar: string | null;
  avgRating: number;
  reviewCount: number;
  isPremiumService: boolean;
}

export default function ServicesDirectoryPage() {
  const ts = useTranslations("servicesDirectory");
  const tm = useTranslations("memberProfilePage");
  const locale = useLocale();
  const [members, setMembers] = useState<ServiceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");

  // Debounce search query to prevent excessive API requests
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQ(q);
    }, 300);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    fetchMembers();
  }, [debouncedQ, city, province]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedQ) params.set("q", debouncedQ);
      if (city) params.set("city", city);
      if (province) params.set("province", province);
      const res = await fetch(`/api/members/services?${params}`);
      const data = await res.json();
      setMembers(data.members || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const isRtl = locale === "ar";
  const isNl = locale === "nl";

  type LucideIcon = typeof ShoppingBag;
  interface ServiceItem {
    title: string;
    desc: string;
    href: string;
    icon: LucideIcon;
    badge?: string;
    color: string;
  }
  interface ServiceColumn {
    title: string;
    items: ServiceItem[];
  }

  const serviceColumns: ServiceColumn[] = [
    {
      title: isRtl ? "الخدمات المجتمعية والمهنية" : isNl ? "Gemeenschap & Vakmanschap" : "Community & Professional Services",
      items: [
        {
          title: isRtl ? "سوق الجالية والأثاث المجاني" : isNl ? "Gratis Meubels & Marktplaats" : "Community Marketplace & Free Furniture",
          desc: isRtl ? "أثاث مجاني ومستلزمات منزلية للقادمين الجدد ومنصة تبادل مجتمعية" : isNl ? "Gratis meubels & vakmensen" : "Free furniture & household exchange",
          href: "/marktplaats", icon: ShoppingBag, badge: "MARKT",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: isRtl ? "شبكة الخصومات" : isNl ? "Korting Netwerk" : "Discounts Network",
          desc: isRtl ? "بطاقتك الرقمية للحصول على خصومات حصرية لدى شركاء الجالية" : isNl ? "Exclusieve kortingen bij partners" : "Exclusive partner discounts",
          href: "/services/discounts", icon: Tag, badge: "DISCOUNT",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        },
        {
          title: isRtl ? "الخطط والعضويات" : isNl ? "Lidmaatschap & Plannen" : "Membership Plans",
          desc: isRtl ? "عروض وتخفيضات حصرية لاحصائيات الجالية والاستفادة من كامل الخدمات" : isNl ? "Abonnementen met voordelen" : "Plans with exclusive benefits",
          href: "/pricing", icon: Crown, badge: "PLANS",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        },
        {
          title: isRtl ? "أعضاء الجالية" : isNl ? "Leden van de Gemeenschap" : "Community Members",
          desc: isRtl ? "شبكة شاملة لأطباء، محامين، مهندسين، ومعلمين عرب في هولندا" : isNl ? "Netwerk van professionals" : "Network of community professionals",
          href: "/members", icon: Users, badge: "MEMBERS",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
      ],
    },
    {
      title: isRtl ? "التمكين المالي ورواد الأعمال" : isNl ? "Financiën & Ondernemers" : "Financial Empowerment & Entrepreneurs",
      items: [
        {
          title: isRtl ? "دليل رواد الأعمال والـ ZZP" : isNl ? "ZZP & Ondernemersgids" : "ZZP & Entrepreneur Hub",
          desc: isRtl ? "دليل الحرفيين والمهنيين السوريين ومولّد الفواتير الهولندي المعتمد" : isNl ? "ZZP-ers & factuur maker" : "Freelancers & invoice builder",
          href: "/services/zzp", icon: Coins, badge: "ZZP",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        },
        {
          title: isRtl ? "حاسبة التوفير والمشتريات الجماعية" : isNl ? "Bespaar Calculator" : "Savings & Group Buying",
          desc: isRtl ? "نماذج هولندية معتمدة ورسائل تحفيزية متوافقة مع سوق العمل" : isNl ? "Tot €600 besparen per jaar" : "Save up to €600/year",
          href: "/services/besparen", icon: TrendingDown, badge: "600€",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: isRtl ? "سوق الأسر المنتجة والمأكولات" : isNl ? "Thuiskeukens & Ambacht" : "Home Producers & Food",
          desc: isRtl ? "مأكولات منزلية ومونة سورية وأشغال يدوية بتواصل مباشر عبر واتساب" : isNl ? "Huisgemaakte gerechten" : "Home-made food & crafts",
          href: "/services/bazaar", icon: ChefHat, badge: "BAZAAR",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        },
        {
          title: isRtl ? "شبكة التجارة البينية والجملة B2B" : isNl ? "B2B Groothandel" : "B2B Wholesale Network",
          desc: isRtl ? "ربط المطاعم والمتاجر بالمطاعم والموردين والمستوردين بأسعار الجملة" : isNl ? "Groothandel netwerk" : "Wholesale supplier network",
          href: "/services/b2b", icon: Truck, badge: "B2B",
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        },
        {
          title: isRtl ? "أكاديمية التدريب المهني والشهادات" : isNl ? "Vakacademie & Diploma's" : "Skills Academy & Certifications",
          desc: isRtl ? "نماذج تدريب وامتحانات لشهادات VCA والسلامة المهنية والرفع" : isNl ? "VCA oefenexamens & meer" : "VCA exams & certifications",
          href: "/services/academy", icon: Award, badge: "VCA",
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        },
        {
          title: isRtl ? "بطاقة الخصومات والاسترداد النقدي" : isNl ? "Korting & Cashback" : "Discount & Cashback Card",
          desc: isRtl ? "شبكة استرداد نقدي وخصومات فورية ٥٪-٢٠٪ لدى شركاء الجالية" : isNl ? "5%-20% cashback & korting" : "5%-20% cashback & discounts",
          href: "/services/cashback", icon: CreditCard, badge: "CASHBACK",
          color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/20",
        },
      ],
    },
    {
      title: isRtl ? "الأدوات والخدمات الذكية" : isNl ? "Slimme Hulpmiddelen" : "Smart Tools & Services",
      items: [
        {
          title: isRtl ? "قارئ ومترجم الرسائل الرسمية" : isNl ? "Brieven Scanner (AI)" : "Official Letter Scanner (AI)",
          desc: isRtl ? "مسح وترجمة رسائل البلدية والضرائب والـ IND وفهم المطلوب فوراً" : isNl ? "Scan & vertaal officiële brieven" : "Scan & translate official letters",
          href: "/services/brief-scanner", icon: Sparkles, badge: "AI",
          color: "text-purple-400 bg-purple-500/10 border-purple-500/20",
        },
        {
          title: isRtl ? "صانع السيرة الذاتية والرسائل" : isNl ? "CV & Motivatiebrief Maker" : "CV & Motivation Letter Builder",
          desc: isRtl ? "نماذج هولندية معتمدة ورسائل تحفيزية متوافقة مع سوق العمل" : isNl ? "Professioneel CV & motivatiebrief" : "Professional CV & cover letter",
          href: "/services/cv-builder", icon: FileText, badge: "CV",
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
        },
        {
          title: isRtl ? "بوابة التحضير للاندماج (Inburgering)" : isNl ? "Inburgering Portaal" : "Inburgering Preparation Hub",
          desc: isRtl ? "تدريب شامل وبنك أسئلة لامتحانات الجنسية KNM واللغة والعرف" : isNl ? "Oefenexamens KNM, ONA & Taal" : "Practice exams for KNM & ONA",
          href: "/inburgering", icon: GraduationCap, badge: "KNM",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        },
        {
          title: isRtl ? "منصة الوظائف والتدريب المهني" : isNl ? "Vacatures & Stages" : "Jobs & Internships Platform",
          desc: isRtl ? "شواغر وظيفية موثقة وفرص تدريب مهني مع تقديم مباشر" : isNl ? "Actuele banen & stages" : "Verified jobs & internships",
          href: "/jobs", icon: Briefcase, badge: "JOBS",
          color: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
        },
        {
          title: isRtl ? "حاسبة المساعدات الحكومية (Toeslagen)" : isNl ? "Toeslagen Calculator" : "Government Allowances Calculator",
          desc: isRtl ? "حساب مخصصات الإيجار والتأمين الصحي ومساعدات الأطفال لعام ٢٠٢٦" : isNl ? "Zorgtoeslag, huur & kind 2026" : "Health, rent & child benefits 2026",
          href: "/services/toeslagen-calculator", icon: Calculator, badge: "2026",
          color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
        },
        {
          title: isRtl ? "جلسات الاستشارة الشخصية (Spreekuur)" : isNl ? "Persoonlijk Spreekuur" : "Personal Consultation (Spreekuur)",
          desc: isRtl ? "استشارات مباشرة مع خبراء قانونيين ومحاسبين ومعلمين ومعتمدين" : isNl ? "Juridisch & sociaal spreekuur" : "Legal & social consultation",
          href: "/spreekuur", icon: Scale, badge: "CONSULT",
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        },
      ],
    },
    {
      title: isRtl ? "خدمات العضوية والدعم" : isNl ? "Lidmaatschap & Ondersteuning" : "Membership & Support Services",
      items: [
        {
          title: isRtl ? "دليل الخدمات والأعمال" : isNl ? "Diensten & Bedrijven Gids" : "Services & Business Directory",
          desc: isRtl ? "شبكة شاملة للأطباء، المحامين، المهندسين، والخدمات المهنية في هولندا" : isNl ? "Gids van professionals" : "Directory of community professionals",
          href: "/services", icon: Building2,
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: isRtl ? "أعضاء الجالية" : isNl ? "Leden van de Gemeenschap" : "Community Members",
          desc: isRtl ? "تصفح أعضاء الجالية المسجلين وتواصل معهم مباشرة" : isNl ? "Bekijk alle leden" : "Browse all community members",
          href: "/members", icon: Users,
          color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
        },
        {
          title: isRtl ? "بطاقة العضوية والخصومات الرقمية" : isNl ? "Digitale Ledenpas & Korting" : "Digital Membership & Discounts",
          desc: isRtl ? "بطاقتك الرقمية للحصول على خصومات حصرية لدى شركاء الجالية" : isNl ? "Digitale ledenpas met korting" : "Digital pass with exclusive discounts",
          href: "/membership-card", icon: IdCard,
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        },
        {
          title: isRtl ? "التحقق من بطاقة العضوية" : isNl ? "Verifieer Ledenpas" : "Verify Membership Pass",
          desc: isRtl ? "فحص فوري لصلاحية بطاقة العضوية العضو للاستفادة من خصومات الشركاء" : isNl ? "Directe verificatie van de ledenpas" : "Instant pass verification for partners",
          href: "/verify-pass", icon: ShieldAlert, badge: "PARTNER",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
        {
          title: isRtl ? "دليل الطوارئ (SOS)" : isNl ? "Nood Gids (SOS)" : "Emergency Guide (SOS)",
          desc: isRtl ? "أرقام الطوارئ وخط الإغاثة السريع وصندوق نقل الجثامين" : isNl ? "Alarmnummers & noodhulp" : "Emergency numbers & rapid relief",
          href: "/emergency", icon: ShieldAlert, badge: "SOS",
          color: "text-rose-400 bg-rose-500/10 border-rose-500/20",
        },
        {
          title: isRtl ? "مواقيت الصلاة" : isNl ? "Gebedstijden" : "Prayer Times",
          desc: isRtl ? "مواقيت الصلاة الدقيقة والتقويم الهجري لمدن هولندا" : isNl ? "Nauwkeurige gebedstijden" : "Accurate prayer times & Hijri calendar",
          href: "/prayers", icon: Moon, badge: "PRAYERS",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        },
      ],
    },
  ];

  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <TopBar />
      <SiteHeader />

      <main className="max-w-7xl mx-auto px-4 py-12 space-y-10">
        <div className="text-center">
          <h1 className="text-4xl font-black text-slate-900 dark:text-white mb-4">{ts("title")}</h1>
          <p className="text-slate-500 dark:text-slate-400 max-w-2xl mx-auto">
            {ts("subtitle")}
          </p>
        </div>

        {/* Services Hub — 4 Columns */}
        <div className="bg-slate-900/40 dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-4 md:p-8 shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {serviceColumns.map((col) => (
              <div key={col.title} className="space-y-3">
                <h2 className="text-sm md:text-base font-black text-slate-700 dark:text-slate-200 text-center mb-4 pb-2 border-b border-slate-200 dark:border-slate-700">
                  {col.title}
                </h2>
                {col.items.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="block bg-white/70 dark:bg-slate-800/60 backdrop-blur rounded-2xl border border-slate-200 dark:border-slate-700 p-4 hover:border-emerald-500/50 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-sm font-bold text-slate-800 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                            {item.title}
                          </h3>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 line-clamp-2 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                        <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${item.color}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                      </div>
                      {item.badge && (
                        <div className="mt-3 flex justify-start">
                          <span className="px-2.5 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-md tracking-wide shadow-sm">
                            {item.badge}
                          </span>
                        </div>
                      )}
                    </Link>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* View Toggle */}
        <div className="flex justify-center">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex gap-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                ${viewMode === "grid" ? "bg-slate-900 dark:bg-slate-800 text-white shadow-lg" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <LayoutGrid className="w-4 h-4" />
              {ts("viewGrid")}
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all
                ${viewMode === "map" ? "bg-emerald-700 text-white shadow-lg" : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"}`}
            >
              <MapIcon className="w-4 h-4" />
              {ts("viewMap")}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-12 gap-8">
          {/* Filters & Ad Card Sidebar */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-none p-4 flex flex-col gap-4">
              <div className="relative">
                <Search className={`absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5`} />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder={ts("searchPlaceholder")}
                  className={`w-full ${isRtl ? "pr-12 pl-4" : "pl-12 pr-4"} py-4 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm`}
                />
              </div>
              <div className="relative">
                <MapPin className={`absolute ${isRtl ? "right-4" : "left-4"} top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 w-5 h-5`} />
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder={ts("cityPlaceholder")}
                  className={`w-full ${isRtl ? "pr-12 pl-4" : "pl-12 pr-4"} py-4 bg-slate-50 dark:bg-slate-800 border border-transparent dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900 dark:text-slate-100 text-sm`}
                />
              </div>

              {viewMode === "map" && (
                <div className="pt-4 border-t border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] uppercase font-black text-slate-400 dark:text-slate-500 mb-4 tracking-widest text-center">{ts("selectProvinceMap")}</p>
                  <NLMap selectedProvince={province} onProvinceSelect={setProvince} />
                  {province && (
                    <button
                      onClick={() => setProvince("")}
                      className="mt-4 w-full py-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl text-xs font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
                    >
                      {ts("clearProvince")}
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Advertise with us Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent dark:from-amber-500/10 dark:to-slate-950 rounded-3xl border border-amber-500/20 dark:border-amber-500/30 p-6 text-slate-900 dark:text-slate-100 shadow-xl dark:shadow-none flex flex-col gap-4 relative overflow-hidden group">
              <div className="absolute -right-8 -bottom-8 w-24 h-24 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all duration-500"></div>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/40 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <Star className="w-5 h-5 fill-current animate-pulse" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-900 dark:text-white">{ts("promoteTitle")}</h3>
                  <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase tracking-wider">{ts("promoteBadge")}</p>
                </div>
              </div>

              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                {ts("promoteDesc")}
              </p>

              <div className="space-y-2 border-t border-slate-200 dark:border-slate-800 pt-3 text-[11px]">
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>{ts("silverTier")}</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{ts("silverPrice")}</span>
                </div>
                <div className="flex items-center justify-between text-slate-600 dark:text-slate-300">
                  <span>{ts("goldTier")}</span>
                  <span className="font-extrabold text-amber-600 dark:text-amber-400">{ts("goldPrice")}</span>
                </div>
              </div>

              <a
                href={locale === "ar" 
                  ? "https://wa.me/31684603406?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A5%D8%B9%D9%84%D8%A7%D9%86%20%D9%81%D9%8A%20%D8%AF%D9%84%D9%8A%D9%84%20%D8%A7%D9%84%D8%AE%D8%AF%D9%85%D8%A7%D8%AA%20%D8%A7%D9%84%D9%85%D9%87%D9%86%D9%8A%D8%A9%20%D9%84%D9%84%D8%AC%D8%A7%D9%84%D9%8A%D8%A9%20%D8%A7%D9%84%D8%B3%D9%88%D8%B1%D9%8A%D8%A9"
                  : "https://wa.me/31684603406?text=Hello,%20I%20would%20like%20to%20advertise%20in%20the%20Syrian%20Community%20Services%20Directory"
                }
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-2xl text-center text-xs transition-all duration-300 shadow-lg shadow-amber-600/20 flex items-center justify-center gap-2 hover:scale-[1.02] border border-amber-500"
              >
                <span>💬</span> {ts("advertiseNow")}
              </a>
            </div>

            {viewMode === "map" && !loading && (
              <div className="space-y-3 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {members.map(m => (
                  <Link 
                    key={m.id} 
                    href={`/profile/${m.id}`} 
                    className={`block p-4 rounded-2xl border transition-all
                      ${m.isPremiumService 
                        ? "bg-amber-50/10 dark:bg-amber-950/10 border-amber-300 dark:border-amber-500/50 hover:border-amber-500 shadow-sm" 
                        : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-emerald-200 dark:hover:border-emerald-800"
                      }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-700 dark:text-emerald-400 font-black shrink-0 overflow-hidden border border-emerald-100 dark:border-emerald-900/50">
                        {m.avatar ? <img src={m.avatar} alt="" className="w-full h-full object-cover" /> : (locale === "ar" ? m.nameAr.charAt(0) : m.nameNl.charAt(0))}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 truncate">
                          <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">{locale === "ar" ? m.nameAr : (m.nameNl || m.nameAr)}</h4>
                          {m.isPremiumService && (
                            <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded text-[8px] font-black uppercase shrink-0 tracking-wider scale-95">
                              {locale === "ar" ? "تميز" : "PRO"}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">{m.profession}</p>
                      </div>
                      <div className="flex items-center gap-0.5 text-amber-500">
                        <Star className="w-3 h-3 fill-current" />
                        <span className="text-[10px] font-bold">
                          {m.avgRating > 0 ? formatLocalizedDigits(m.avgRating.toFixed(1), locale) : "—"}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Content Area */}
          <div className="lg:col-span-8">
            {viewMode === "map" ? (
              <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl shadow-slate-200/50 dark:shadow-none p-8 h-full min-h-[600px] flex flex-col">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                    {locale === "ar" ? "توزع الخدمات في هولندا" : (locale === "nl" ? "Dienstenverdeling in Nederland" : "Services distribution in the Netherlands")}
                  </h2>
                  {province && <span className="px-4 py-1.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-full text-xs font-black border border-emerald-100 dark:border-emerald-900/50">{province}</span>}
                </div>
                <div className="flex-1 flex items-center justify-center bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-100/50 dark:border-slate-800/50">
                   <div className="w-full max-w-lg">
                      <NLMap selectedProvince={province} onProvinceSelect={setProvince} />
                   </div>
                </div>
              </div>
            ) : (
              loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="w-12 h-12 animate-spin text-emerald-700" />
                </div>
              ) : members.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800">
                  <User className="w-16 h-16 text-slate-200 dark:text-slate-700 mx-auto mb-4" />
                  <p className="text-slate-400 dark:text-slate-500 font-bold">{ts("noServicesFound")}</p>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {members.map((member) => (
                    <div 
                      key={member.id} 
                      className={`bg-white dark:bg-slate-900 rounded-3xl border transition-all group overflow-hidden relative
                        ${member.isPremiumService 
                          ? "border-amber-500 dark:border-amber-500/50 shadow-lg shadow-amber-500/5 ring-1 ring-amber-500/20 bg-gradient-to-b from-amber-50/10 to-white dark:from-amber-950/5 dark:to-slate-900 hover:shadow-2xl hover:shadow-amber-500/10 hover:-translate-y-1" 
                          : "border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1"
                        }`}
                    >
                      <div className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black shrink-0 overflow-hidden border
                            ${member.isPremiumService
                              ? "bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-100 dark:border-amber-900/50"
                              : "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50"
                            }`}
                          >
                            {member.avatar ? <img src={member.avatar} alt="" className="w-full h-full object-cover" /> : (locale === "ar" ? member.nameAr.charAt(0) : (member.nameNl || member.nameAr).charAt(0))}
                          </div>
                          <div className="flex flex-col items-end gap-1.5">
                            <div className="flex items-center gap-1">
                              <Star className={`w-3.5 h-3.5 ${member.avgRating > 0 ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                {member.avgRating > 0 ? formatLocalizedDigits(member.avgRating.toFixed(1), locale) : "—"}
                              </span>
                              <span className="text-[10px] text-slate-400">({formatLocalizedNumber(member.reviewCount, locale)})</span>
                            </div>
                            {member.isPremiumService ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-black rounded-lg text-[9px] uppercase tracking-wider shadow-sm animate-pulse shrink-0">
                                {locale === "ar" ? "إعلان مميز 🚀" : (locale === "nl" ? "Uitgelicht 🚀" : "Featured 🚀")}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 rounded-lg text-[9px] font-bold uppercase tracking-wider border border-emerald-100 dark:border-emerald-900/50 shrink-0">
                                {tm("accepted")}
                              </span>
                            )}
                          </div>
                        </div>

                        <h3 className="text-lg font-black text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors mb-1">
                          {locale === "ar" ? member.nameAr : (member.nameNl || member.nameAr)}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-3" dir="ltr">{locale === "ar" ? member.nameNl : member.nameAr}</p>

                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300 mb-4">
                          <Briefcase className={`w-4 h-4 ${member.isPremiumService ? "text-amber-500" : "text-emerald-600 dark:text-emerald-400"}`} />
                          <span className="font-bold">{member.profession}</span>
                        </div>

                        <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 leading-relaxed min-h-[4.5rem]">
                          {member.serviceDescription}
                        </p>

                        <div className="flex items-center justify-between pt-6 border-t border-slate-50 dark:border-slate-800">
                          <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-medium">
                            <MapPin className="w-3.5 h-3.5" />
                            {member.nlCity}
                          </div>
                          <Link
                            href={`/profile/${member.id}`}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-slate-800 hover:bg-emerald-700 dark:hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            {ts("contactProvider")}
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      </main>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #cbd5e1;
        }
      `}</style>
    </div>
  );
}
