import { getTranslations } from "next-intl/server";
import { PhoneCall, ShieldAlert, HeartHandshake, FileWarning, Headphones, Copy, Ambulance, ArrowRight } from "lucide-react";
import { Link } from "@/i18n/routing";

interface Props {
  params: Promise<{ locale: string }>;
}

export default async function EmergencyPage({ params }: Props) {
  const { locale } = await params;
  const t = await getTranslations({ locale });
  const isAr = locale === "ar";

  const directContacts = [
    {
      id: "112",
      title: isAr ? "طوارئ هولندا الرسمية (١١٢)" : locale === "nl" ? "Alarmnummer 112" : "National Emergency 112",
      badge: isAr ? "حالات طارئة فقط" : locale === "nl" ? "Alleen spoed" : "Life-threatening only",
      desc: isAr ? "للحالات الحرجة والمهددة للحياة (إسعاف، شرطة، إطفاء). اتصل فوراً وبشكل مجاني." : locale === "nl" ? "Voor acute levensbedreigende situaties (politie, ambulance, brandweer)." : "For immediate life-threatening situations (ambulance, police, fire).",
      actionText: isAr ? "اتصال بـ ١١٢" : "Bel 112",
      tel: "112",
      color: "from-red-600 to-rose-700",
      border: "border-red-500/40",
      icon: Ambulance,
    },
    {
      id: "0900-8844",
      title: isAr ? "الشرطة للحالات غير الطارئة" : locale === "nl" ? "Politie (Geen spoed)" : "Police Non-Emergency",
      badge: "0900-8844",
      desc: isAr ? "للإبلاغ عن سرقات، شكاوى، ضياع وثائق، أو طلب إرشادات أمنية بدون وجود خطر داهم." : locale === "nl" ? "Voor meldingen zonder spoed, overlast, of verlies van documenten." : "To report thefts, lost documents, or non-urgent police matters.",
      actionText: isAr ? "اتصال بالشرطة" : "Bel 0900-8844",
      tel: "09008844",
      color: "from-blue-600 to-indigo-700",
      border: "border-blue-500/40",
      icon: ShieldAlert,
    },
    {
      id: "113",
      title: isAr ? "خط الدعم النفسي والوقاية (١١٣)" : locale === "nl" ? "Zelfmoordpreventie 113" : "Crisis & Mental Health 113",
      badge: isAr ? "مجاني وسري ٢٤/٧" : locale === "nl" ? "Gratis & Anoniem 24/7" : "Free & Anonymous 24/7",
      desc: isAr ? "خط دعم نفسي مجاني وسري للأشخاص وعائلاتهم تحت الضغوط الحادة والمشاعر الصعبة." : locale === "nl" ? "Gratis en anonieme hulplijn voor acute mentale en emotionele steun." : "Confidential and free crisis counseling for emotional distress.",
      actionText: isAr ? "اتصال بـ ١١٣" : "Bel 113",
      tel: "113",
      color: "from-teal-600 to-emerald-700",
      border: "border-teal-500/40",
      icon: Headphones,
    },
    {
      id: "community-hotline",
      title: isAr ? "طوارئ الجالية السورية وصندوق التكافل" : locale === "nl" ? "SGN Gemeenschapshulplijn" : "Syrian Community Emergency Line",
      badge: "WhatsApp 24/7",
      desc: isAr ? "مساندة عاجلة لحالات الوفاة، نقل الجثامين، الترجمة الإسعافية في المشافي، ودعم العائلات." : locale === "nl" ? "Acute hulp bij overlijden, repatriëring, medische tolkbegeleiding en familiehulp." : "Immediate assistance for bereavement, repatriation, and urgent hospital support.",
      actionText: isAr ? "تواصل واتساب مباشر" : "WhatsApp Hotline",
      tel: "https://wa.me/31684603406",
      color: "from-amber-600 to-yellow-600",
      border: "border-amber-500/40",
      icon: HeartHandshake,
      isWhatsapp: true,
    }
  ];

  return (
    <div className="min-h-screen py-10 px-4 max-w-6xl mx-auto space-y-10">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-red-950 via-neutral-900 to-[#0B132B] border-2 border-red-500/30 p-8 sm:p-12 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold tracking-wide">
            <ShieldAlert className="w-4 h-4 animate-pulse" />
            <span>SOS EMERGENCY GUIDE</span>
          </div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {t("emergency.title")}
          </h1>
          <p className="text-neutral-300 text-sm sm:text-base leading-relaxed">
            {t("emergency.subtitle")}
          </p>
          <div className="pt-2 flex flex-wrap gap-3 text-xs text-red-300/90 font-medium">
            <span className="bg-red-500/20 px-3 py-1.5 rounded-lg border border-red-500/30">
              ⚠️ {t("emergency.dial112Warning")}
            </span>
          </div>
        </div>
      </div>

      {/* Grid of Emergency Action Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {directContacts.map((c) => {
          const Icon = c.icon;
          return (
            <div
              key={c.id}
              className={`rounded-2xl bg-card border ${c.border} p-6 sm:p-8 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.01]`}
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${c.color} flex items-center justify-center text-white shadow-md`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <span className="text-xs font-bold px-3 py-1 rounded-full bg-muted border border-border text-foreground">
                    {c.badge}
                  </span>
                </div>
                <h2 className="text-xl font-bold text-foreground">
                  {c.title}
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {c.desc}
                </p>
              </div>

              <div className="pt-6 mt-4 border-t border-border/60">
                <a
                  href={c.isWhatsapp ? c.tel : `tel:${c.tel}`}
                  target={c.isWhatsapp ? "_blank" : undefined}
                  rel={c.isWhatsapp ? "noopener noreferrer" : undefined}
                  className={`w-full py-3 px-4 rounded-xl text-center font-bold text-white shadow-md bg-gradient-to-r ${c.color} hover:opacity-95 transition-all flex items-center justify-center gap-2`}
                >
                  <PhoneCall className="w-4 h-4" />
                  <span>{c.actionText}</span>
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Repatriation & Solidarity Fund (ANBI) Box */}
      <div className="rounded-3xl bg-gradient-to-br from-[#0B132B] to-[#1C2541] border-2 border-[#CCAA00]/40 p-8 sm:p-10 text-white shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CCAA00]/20 text-[#CCAA00] text-xs font-bold border border-[#CCAA00]/30">
              <HeartHandshake className="w-4 h-4" />
              <span>ANBI CERTIFIED CHARITY</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              {t("emergency.repatriationTitle")}
            </h2>
            <p className="text-gray-300 text-sm max-w-2xl leading-relaxed">
              {t("emergency.repatriationDesc")}
            </p>
          </div>
          <Link
            href="/solidarity"
            className="self-start sm:self-center px-5 py-2.5 rounded-xl bg-[#CCAA00] hover:bg-yellow-500 text-black font-bold text-sm transition-all flex items-center gap-2 shadow-lg"
          >
            <span>{isAr ? "تفاصيل الصندوق" : "Fund Details"}</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-[#0B132B]/80 rounded-2xl p-6 border border-gray-800 space-y-4">
          <span className="text-xs uppercase tracking-wider text-gray-400 block font-mono">
            {t("emergency.repatriationIban")}
          </span>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/40 p-4 rounded-xl border border-gray-800">
            <span className="font-mono text-lg sm:text-xl font-bold text-[#CCAA00] tracking-wider">
              NL90 ABNA 0148 7498 95
            </span>
            <div className="text-xs text-emerald-400 font-semibold flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>{isAr ? "مؤسسة خاضعة للرقابة الضريبية والشفافية التامة" : "Tax-exempt ANBI registered foundation"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Guide for Lost Documents and Medical Translation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
            <FileWarning className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {t("emergency.lostDocuments")}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {t("emergency.lostDocumentsTip")}
          </p>
          <div className="pt-2">
            <a
              href="https://ind.nl/en/lost-stolen-or-damaged-residence-document"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-primary hover:underline inline-flex items-center gap-1"
            >
              <span>{isAr ? "بوابة الـ IND الرسمية لفقدان الوثائق" : "Official IND Portal"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-6 space-y-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Headphones className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-foreground">
            {t("emergency.medicalTranslator")}
          </h3>
          <p className="text-muted-foreground text-sm leading-relaxed">
            {isAr
              ? "إذا تم إدخالك أو أحد أفراد عائلتك إلى المشفى ولم يكن هناك مترجم، يحق لك قانونياً طلب مترجم طبي عبر الهاتف (Tolkentelefoon) من إدارة المشفى، أو التواصل مع متطوعي الجالية."
              : locale === "nl"
              ? "U heeft recht op een medische tolk via het ziekenhuis. Neem bij spoed ook contact op met onze vrijwilligers."
              : "You have the right to request a medical interpreter at Dutch hospitals. Contact community volunteers for immediate support."}
          </p>
          <div className="pt-2">
            <a
              href="https://wa.me/31684603406"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              <span>{isAr ? "طلب مساندة لغوية عاجلة" : "Request Urgent Language Support"}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
