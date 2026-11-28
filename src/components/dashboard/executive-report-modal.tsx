"use client";

import { useLocale, useTranslations } from "next-intl";
import { Printer, X, ShieldCheck } from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { FreeSyrianFlag, DutchFlag } from "@/components/flags";
import { SgnLogo } from "@/components/sgn-logo";

interface ExecutiveReportModalProps {
  open: boolean;
  onClose: () => void;
  stats: any;
  vitalityScore: number | null;
}

export function ExecutiveReportModal({
  open,
  onClose,
  stats,
  vitalityScore,
}: ExecutiveReportModalProps) {
  const locale = useLocale();
  const t = useTranslations("dashboardReport");
  const tCommon = useTranslations("common");
  const td = useTranslations("dashboard");

  if (!open) return null;

  const handlePrint = () => {
    window.print();
  };

  const now = new Date();
  const currentDate = now.toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "nl" ? "nl-NL" : "en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const reportNumber = formatLocalizedDigits(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    locale
  );

  const totalMembers = Object.values(stats?.membersByStatus || {}).reduce((a: any, b: any) => a + b, 0);
  const provinces: { name: string; count: number }[] = stats?.provinceDistribution || [];
  const provinceTotal = provinces.reduce((sum, p) => sum + p.count, 0);
  const metrics = [
    { label: t("metricMembers"), val: totalMembers, sub: t("metricMembersSub") },
    { label: t("metricViews"), val: stats?.totalViews ?? 0, sub: t("metricViewsSub") },
    { label: t("metricVolunteers"), val: stats?.volunteers ?? 0, sub: t("metricVolunteersSub") },
    { label: t("metricMessages"), val: stats?.messages ?? 0, sub: t("metricMessagesSub") },
    { label: t("metricPosts"), val: stats?.posts ?? 0, sub: t("metricPostsSub") },
    { label: t("metricEvents"), val: stats?.events ?? 0, sub: t("metricEventsSub") },
    { label: t("metricBoard"), val: stats?.boardMembers ?? 0, sub: t("metricBoardSub") },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div
        className="w-full max-w-4xl bg-white text-gray-900 rounded-3xl shadow-2xl overflow-hidden border border-gray-200 my-8 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Controls Toolbar (Hidden in print) */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#1a5632]" />
            <h3 className="font-extrabold text-sm text-gray-800">{t("toolbarTitle")}</h3>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-[#1a5632] hover:bg-[#123d24] text-white shadow-sm transition-all"
            >
              <Printer className="w-4 h-4" />
              <span>{t("printSave")}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-700 font-bold"
              aria-label={t("close")}
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
                  <span className="font-black text-xl text-[#1a5632]">{t("orgName")}</span>
                  <DutchFlag className="w-5 h-3.5" />
                </div>
                <p className="text-xs text-gray-600 font-bold">{t("orgLegalName")}</p>
                <p className="text-[11px] text-gray-400">{t("officeLine")}</p>
              </div>
            </div>

            <div className="text-left space-y-1 text-xs">
              <p className="font-bold text-gray-800">
                {t("dateLabel")} <span className="font-semibold text-gray-600">{formatLocalizedDigits(currentDate, locale)}</span>
              </p>
              <p className="text-gray-500 font-medium">
                {t("reportNumber")} {reportNumber}
              </p>
              <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                {t("officialDocument")}
              </span>
            </div>
          </div>

          {/* Executive Summary & Vitality Score */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2 bg-emerald-50/70 rounded-2xl p-5 border border-emerald-200/60 space-y-2">
              <div className="flex items-center gap-2 text-[#1a5632] font-black text-sm">
                <ShieldCheck className="w-4 h-4" />
                <span>{t("summaryTitle")}</span>
              </div>
              <p className="text-xs text-gray-700 leading-relaxed font-medium">{t("summaryBody")}</p>
            </div>

            <div className="bg-[#1a5632] text-white rounded-2xl p-5 flex flex-col justify-between text-center">
              <span className="text-xs text-[#edd28a] font-bold">{t("vitalityLabel")}</span>
              <span className="text-4xl font-black my-1 text-white">
                {vitalityScore === null
                  ? td("dataNotAvailable")
                  : `${formatLocalizedDigits(vitalityScore, locale)}${tCommon("percentSign")}`}
              </span>
              <span className="text-[11px] text-emerald-200 font-medium">{t("vitalityNote")}</span>
            </div>
          </div>

          {/* Key Metrics Table */}
          <div className="space-y-3">
            <h4 className="font-black text-sm text-gray-900 border-r-4 border-[#1a5632] pr-2">
              {t("metricsTitle")}
            </h4>
            <div className="grid grid-cols-4 gap-3">
              {metrics.map((m, i) => (
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

          {/* Provincial Distribution — real data only */}
          {provinces.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-black text-sm text-gray-900 border-r-4 border-[#1a5632] pr-2">
                {t("provinceTitle")}
              </h4>
              <div className="grid grid-cols-3 gap-2.5 text-xs">
                {provinces.map((p, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 border border-gray-100">
                    <span className="font-semibold text-gray-700">{p.name}</span>
                    <span className="font-black text-[#1a5632]">
                      {formatLocalizedDigits(Math.round((p.count / provinceTotal) * 100), locale)}{tCommon("percentSign")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Board Signatures */}
          <div className="pt-8 border-t border-gray-200 grid grid-cols-3 gap-8 text-center text-xs">
            {[
              { role: t("signer1Role"), name: t("signer1Name") },
              { role: t("signer2Role"), name: t("signer2Name") },
              { role: t("signer3Role"), name: t("signer3Name") },
            ].map((s, i) => (
              <div key={i} className="space-y-12">
                <p className="font-bold text-gray-700">{s.role}</p>
                <p className="font-black text-gray-900">{s.name}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
