"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, RefreshCw, X } from "lucide-react";

type Donation = {
  id: string;
  name: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

type FinanceStats = {
  totalCount: number;
  totalAmount: number;
  byStatus: Record<string, { count: number; amount: number }>;
  monthlyTotals: { month: string; total: number; count: number }[];
};

function statusTone(status: string) {
  const value = status.toLowerCase();
  if (/success|paid|completed/.test(value)) return "good" as const;
  if (/pending|waiting/.test(value)) return "warn" as const;
  return "bad" as const;
}

function statusKey(status: string) {
  const value = status.toLowerCase();
  if (/success|paid|completed/.test(value)) return "success";
  if (/pending|waiting/.test(value)) return "pending";
  return "failed";
}

export default function V2FinancePage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.finance");
  const locale = useLocale();

  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const [statsRes, listRes] = await Promise.all([
        fetch("/api/donations/stats", { cache: "no-store" }),
        fetch("/api/donations?take=12", { cache: "no-store" }),
      ]);
      if (!statsRes.ok || !listRes.ok) throw new Error("finance");
      const [statsData, listData] = await Promise.all([statsRes.json(), listRes.json()]);
      setStats(statsData);
      setDonations(listData.donations ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function updateStatus(item: Donation, status: "completed" | "failed") {
    setBusy(true);
    try {
      await v2Api(`/api/donations/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const months = (stats?.monthlyTotals ?? []).slice(0, 6).reverse();
  const monthMax = Math.max(1, ...months.map((m) => m.total));
  const paid = stats?.byStatus
    ? Object.entries(stats.byStatus)
        .filter(([status]) => /success|paid|completed/i.test(status))
        .reduce((sum, [, value]) => sum + value.amount, 0)
    : 0;

  const number = (value: number) => formatLocalizedDigits(Math.round(value).toLocaleString(), locale);

  return (
    <V2Shell active="/dashboard/v2/finance" section={t("breadcrumbFinance")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <button
          onClick={() => void load()}
          title={t("retry")}
          aria-label={t("retry")}
          className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </V2Intro>

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: "total", value: number(stats?.totalAmount ?? 0) },
              { key: "paid", value: number(paid) },
              { key: "count", value: formatLocalizedDigits(stats?.totalCount ?? 0, locale) },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-[#6f7a70]">{tp(`stats.${item.key}`)}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-[#123b24]">
                  {item.value} {item.key !== "count" && <span className="text-sm font-bold text-[#8a6a1f]">{tp("euro")}</span>}
                </p>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-3">
            <V2Panel title={tp("monthlyTitle")} note={tp("monthlyNote")} className="lg:col-span-2">
              {months.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#9aa399]">{tp("emptyChart")}</p>
              ) : (
                <div className="mt-6 flex h-36 items-end justify-between gap-2" dir="ltr">
                  {months.map((month) => (
                    <div key={month.month} className="flex h-full flex-1 flex-col justify-end gap-2">
                      <div className="flex h-full items-end justify-center">
                        <div
                          className="w-6 rounded-t-md bg-[#1a5632]"
                          style={{ height: `${Math.max(4, (month.total / monthMax) * 100)}%` }}
                          title={number(month.total)}
                        />
                      </div>
                      <span className="text-center text-[9px] font-bold tabular-nums text-[#9aa399]">
                        {formatLocalizedDigits(month.month.slice(2), locale)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </V2Panel>

            <V2Panel title={tp("recentTitle")} note={tp("recentNote")}>
              {donations.length === 0 ? (
                <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
              ) : (
                <ul className="mt-4 divide-y divide-[#f0ead9]">
                  {donations.map((donation) => (
                    <li key={donation.id} className="flex items-center justify-between gap-3 py-3 first:pt-0">
                      <div className="min-w-0">
                        <p className="truncate text-xs font-bold text-[#203026]">{donation.name}</p>
                        <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                          {formatLocalizedDigits(donation.createdAt.slice(0, 10), locale)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-xs font-black tabular-nums text-[#123b24]">
                          {number(donation.amount)} {donation.currency === "EUR" ? tp("euro") : donation.currency}
                        </span>
                        <V2Pill tone={statusTone(donation.status)}>{tp(`status.${statusKey(donation.status)}`)}</V2Pill>
                        {statusKey(donation.status) === "pending" && (
                          <div className="flex items-center gap-1.5">
                            <V2IconButton
                              label={tp("markPaid")}
                              onClick={() => void updateStatus(donation, "completed")}
                              disabled={busy}
                            >
                              <Check size={13} />
                            </V2IconButton>
                            <V2IconButton
                              label={tp("markFailed")}
                              onClick={() => void updateStatus(donation, "failed")}
                              danger
                              disabled={busy}
                            >
                              <X size={13} />
                            </V2IconButton>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </V2Panel>
          </div>
        </div>
      )}
    </V2Shell>
  );
}
