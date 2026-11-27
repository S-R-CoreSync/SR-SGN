"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DollarSign, Users, TrendingUp, Download, Loader2 } from "lucide-react";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { EmptyState } from "@/components/ui/empty-state";

interface Donation {
  id: string;
  name: string;
  email?: string | null;
  amount: number;
  currency?: string | null;
  paymentMethod?: string | null;
  status?: string | null;
  createdAt: string;
}

export default function RevenueDashboardPage() {
  const t = useTranslations("dashboardRevenue");
  const locale = useLocale();
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/donations?take=100")
      .then((r) => (r.ok ? r.json() : { donations: [] }))
      .then((d) => setDonations(d.donations || []))
      .catch(() => setDonations([]))
      .finally(() => setLoading(false));
  }, []);

  const paid = donations.filter((d) => d.status === "paid" || d.status === "completed");
  const total = paid.reduce((sum, d) => sum + (Number(d.amount) || 0), 0);
  const donors = new Set(donations.map((d) => d.email || d.id)).size;
  const average = paid.length ? total / paid.length : 0;
  const money = (value: number) => `€ ${formatLocalizedDigits(value.toFixed(2), locale)}`;

  const stats = [
    { label: t("totalLabel"), sub: t("totalSub"), value: money(total), icon: DollarSign },
    { label: t("donorsLabel"), sub: t("donorsSub"), value: formatLocalizedDigits(donors, locale), icon: Users },
    { label: t("avgLabel"), sub: t("avgSub"), value: money(average), icon: TrendingUp },
  ];

  return (
    <div className="p-6 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{t("title")}</h1>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400 mt-1">{t("subtitle")}</p>
        </div>
        <button
          onClick={() => window.print()}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 transition-all shadow-sm cursor-pointer"
        >
          <Download className="w-4 h-4" />
          <span>{t("export")}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stats.map(({ label, sub, value, icon: Icon }, i) => (
          <div key={i} className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase">{label}</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
            </div>
            <p className="text-2xl font-black text-slate-900 dark:text-white">{value}</p>
            <p className="text-[11px] text-slate-400">{sub}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-sm font-black text-slate-800 dark:text-white">{t("recentLabel")}</h2>
          <p className="text-[11px] text-slate-400">{t("recentSub")}</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-400"><Loader2 className="w-5 h-5 animate-spin mx-auto" /></div>
        ) : donations.length === 0 ? (
          <div className="p-6"><EmptyState title={t("noDonations")} description={t("noDonationsDesc")} /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500">
                <tr>
                  <th className="py-3 px-6 text-start">{t("colDonor")}</th>
                  <th className="py-3 px-4 text-start">{t("colAmount")}</th>
                  <th className="py-3 px-4 text-start">{t("colMethod")}</th>
                  <th className="py-3 px-4 text-start">{t("colDate")}</th>
                  <th className="py-3 px-6 text-start">{t("colStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {donations.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 px-6 font-bold text-slate-700 dark:text-slate-200">{d.name}</td>
                    <td className="py-3 px-4 font-black text-emerald-700">{money(Number(d.amount))}</td>
                    <td className="py-3 px-4 text-slate-500">{d.paymentMethod || "-"}</td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(d.createdAt).toLocaleDateString(locale === "ar" ? "ar-EG" : locale === "nl" ? "nl-NL" : "en-US")}
                    </td>
                    <td className="py-3 px-6 text-slate-500">
                      {d.status === "paid" || d.status === "completed"
                        ? t("statusPaid")
                        : d.status === "pending"
                        ? t("statusPending")
                        : d.status || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
