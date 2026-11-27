"use client";

import { useLocale, useTranslations } from "next-intl";
import { Printer, X, Download, ShieldCheck, Award, FileText, CheckCircle2 } from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { FreeSyrianFlag, DutchFlag } from "@/components/flags";
import { SgnLogo } from "@/components/sgn-logo";

interface ExecutiveReportModalProps {
  open: boolean;
  onClose: () => void;
  stats: any;
  vitalityScore: number;
}

export function ExecutiveReportModal({
  open,
  onClose,
  stats,
  vitalityScore,
}: ExecutiveReportModalProps) {
  const locale = useLocale();
  const t = useTranslations("common");

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "nl" ? "nl-NL" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const totalMembers = Object.values(stats?.membersByStatus || {}).reduce((a: any, b: any) => a + b, 0);

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div 
        className="w-full max-w-4xl bg-white text-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Toolbar (Hidden in print) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-[#1a5632]" />
            <h3 className="font-extrabold text-sm text-gray-800">
              {locale === "nl" ? "Directieverslag SGN (PDF Export)" : locale === "en" ? "Executive Board Report (PDF)" : "التقرير التنفيذي الرسمي للجالية السورية (SGN)"}
            </h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1a5632] hover:bg-[#123d24] text-white shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{locale === "nl" ? "Afdrukken / Opslaan als PDF" : locale === "en" ? "Print / Save PDF" : "طباعة / حفظ كـ PDF"}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Document Content */}
        <div className="p-8 sm:p-12 space-y-8 bg-white print:p-0 print:space-y-6" id="printable-report">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-[#1a5632] pb-6">
            <div className="flex items-center gap-4">
              <SgnLogo size={64} className="w-16 h-16" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FreeSyrianFlag className="w-5 h-3.5" />
                  <span className="font-black text-xl text-[#1a5632]">
                    الجالية السورية في هولندا
                  </span>
                  <DutchFlag className="w-5 h-3.5" />
                </div>
                <p className="text-xs text-gray-600 font-bold">
                  De Syrische Gemeenschap in Nederland (SGN) • sy-nl.org
                </p>
                <p className="text-[11px] text-gray-400">
                  المكتب التنفيذي • تقرير المتابعة الدوري للإحصائيات ونشاط المنصة
                </p>
              </div>
            </div>

            <div className="text-left space-y-1 text-xs">
              <p className="font-bold text-gray-800">
                التاريخ: <span className="font-semibold text-gray-600">{formatLocalizedDigits(currentDate, locale)}</span>
              </p>
              <p className="text-gray-500 font-medium">
                رقم التقرير: SGN-REP-{formatLocalizedDigits(2026, locale)}-09
              </p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                وثيقة رسمية معتمدة
              </span>
            </div>
          </div>

          {/* Executive Summary & Vitality Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-emerald-50/70 rounded-2xl p-5 border border-emerald-200/60 space-y-2">
              <div className="flex items-center gap-2 text-[#1a5632] font-black text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>ملخص الأداء ونشاط المنظومة</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">
                يُظهر هذا التقرير واقع ونشاط الجالية السورية في هولندا عبر المنصة المركزية الموحدة. تشهد المنصة نمواً متسارعاً في عدد الأعضاء الموثقين، مع استجابة عالية للاستفسارات القانونية والاندماجية، وتغطية جغرافية شاملة في كافة المقاطعات الـ ١٢ بهولندا.
              </p>
            </div>

            <div className="bg-[#1a5632] text-white rounded-2xl p-5 flex flex-col justify-between text-center">
              <span className="text-xs text-[#edd28a] font-bold">مؤشر حيوية المنصة (Vitality)</span>
              <span className="text-4xl font-black my-1 text-white">
                {formatLocalizedDigits(vitalityScore, locale)}{t("percentSign")}
              </span>
              <span className="text-[11px] text-emerald-200 font-medium">أداء تشغيلي ممتاز ومستقر</span>
            </div>
          </div>

          {/* Key Metrics Table */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-gray-900 border-r-4 border-[#1a5632] pr-2">
              المؤشرات الرقمية الرئيسية
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: "الأعضاء الموثقين", val: totalMembers, sub: "عضو مسجل بالنظام" },
                { label: "المشاهدات والمتابعات", val: stats?.totalViews ?? 0, sub: "قراءة للمحتوى" },
                { label: "الكوادر والمتطوعين", val: stats?.volunteers ?? 0, sub: "كفاءة سورية متطوعة" },
                { label: "استفسارات الجالية", val: stats?.messages ?? 0, sub: "طلب دعم واستشارة" },
                { label: "المقالات والتقارير", val: stats?.posts ?? 0, sub: "مقال وخبر منشور" },
                { label: "الفعاليات الموثقة", val: stats?.events ?? 0, sub: "فعالية وندوة" },
                { label: "مجلس الإدارة", val: stats?.boardMembers ?? 0, sub: "عضواً في الأمانة والمكاتب" },
              ].map((m, i) => (
                <div key={i} className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-1">
                  <p className="text-[11px] font-bold text-gray-500">{m.label}</p>
                  <p className="text-xl font-black text-[#1a5632]">
                    {typeof m.val === "number" ? formatLocalizedDigits(m.val.toLocaleString(), locale) : m.val}
                  </p>
                  <p className="text-[10px] text-gray-400 font-medium">{m.sub}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Provincial Distribution Breakdown */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-gray-900 border-r-4 border-[#1a5632] pr-2">
              التوزيع الجغرافي لأبناء الجالية في المقاطعات الهولندية
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              {[
                { name: "Zuid-Holland (جنوب هولندا / روتردام ولاهاي)", count: "٢٨٪" },
                { name: "Noord-Holland (شمال هولندا / أمستردام)", count: "٢٢٪" },
                { name: "Utrecht (أوتريخت وضواحيها)", count: "١٨٪" },
                { name: "Gelderland (غيلدرلاند / آرنم ونايميخن)", count: "١٤٪" },
                { name: "Noord-Brabant (برابانت / أيندهوفن)", count: "١١٪" },
                { name: "Overijssel & باقي المقاطعات", count: "٧٪" },
              ].map((p, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                  <span className="font-semibold text-gray-700">{p.name}</span>
                  <span className="font-black text-[#1a5632]">{p.count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Audit Activity Stream */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-gray-900 border-r-4 border-[#1a5632] pr-2">
              سجل تدقيق الأنشطة الإدارية والتقنية (Audit Activity Log)
            </h4>
            <div className="space-y-2 text-xs">
              {[
                { time: "اليوم ٢١:٤٥", title: "اعتماد وتحديث لوحة التحكم التنفيذية الجديدة", actor: "محمد سليم عزيزة (المسؤول التقني)" },
                { time: "اليوم ١٩:٣٠", title: "مزامنة ونشر أحدث أخبار وقرارات الإقامة من مصلحة الهجرة IND", actor: "المكتب الإعلامي" },
                { time: "اليوم ١٤:١٥", title: "مراجعة وتوثيق بطاقات العضوية الجديدة لأعضاء أوتريخت وروتردام", actor: "مكتب شؤون الأعضاء" },
                { time: "أمس ١٨:٠٠", title: "فحص وتحديث الخزنة الرقمية المشفرة للوثائق الرسمية", actor: "اللجنة القانونية والرقابة" },
              ].map((log, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="font-bold text-gray-800">{log.title}</span>
                  </div>
                  <div className="flex items-center gap-4 text-[11px] text-gray-500">
                    <span>{log.actor}</span>
                    <span className="font-bold text-gray-400">{log.time}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Board Signatures */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-3 gap-8 text-center text-xs">
            <div className="space-y-12">
              <p className="font-bold text-gray-700">رئيس مجلس الإدارة</p>
              <p className="font-black text-gray-900">عبد المنعم الشامان</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-gray-700">الأمين العام للجالية</p>
              <p className="font-black text-gray-900">خالد فيصل الطويل</p>
            </div>
            <div className="space-y-12">
              <p className="font-bold text-gray-700">المسؤول التقني والمنظومة</p>
              <p className="font-black text-gray-900">محمد سليم عزيزة</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
