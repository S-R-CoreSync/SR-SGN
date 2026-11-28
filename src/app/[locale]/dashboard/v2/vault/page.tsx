"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, RefreshCw, X } from "lucide-react";

type VaultDocument = {
  id: string;
  type?: string | null;
  fileName?: string | null;
  url?: string | null;
  status: string;
  createdAt: string;
  member?: { id: string; nameAr: string; nameNl: string } | null;
};

function statusTone(status: string) {
  if (status === "approved") return "good" as const;
  if (status === "rejected") return "bad" as const;
  return "warn" as const;
}

export default function V2VaultPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.vault");
  const locale = useLocale();

  const [documents, setDocuments] = useState<VaultDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await v2Api<{ documents?: VaultDocument[] }>("/api/admin/vault");
      setDocuments(data.documents ?? []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(item: VaultDocument, status: "approved" | "rejected") {
    setBusy(true);
    try {
      await v2Api(`/api/admin/vault/${item.id}`, {
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

  const visible = documents.filter((item) => {
    if (!item.member) return false;
    return locale === "ar" ? hasArabicCharacters(item.member.nameAr) : !hasArabicCharacters(item.member.nameAr);
  });
  const pending = visible.filter((item) => item.status === "pending").length;

  return (
    <V2Shell active="/dashboard/v2/vault" section={t("breadcrumbVault")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="neutral">{tp("total")}: {formatLocalizedDigits(documents.length, locale)}</V2Pill>
          <V2Pill tone="warn">{tp("pending")}: {formatLocalizedDigits(pending, locale)}</V2Pill>
          <button
            onClick={() => void load()}
            title={t("retry")}
            aria-label={t("retry")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </V2Intro>

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : visible.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e6ddc9] text-[11px] font-black text-[#9aa399]">
                  <th className="py-2.5 text-right">{tp("table.member")}</th>
                  <th className="py-2.5 text-right">{tp("table.document")}</th>
                  <th className="py-2.5 text-right">{tp("table.status")}</th>
                  <th className="py-2.5 text-right">{tp("table.date")}</th>
                  <th className="py-2.5 text-right">{tp("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((item) => (
                  <tr key={item.id} className="border-b border-[#f0ead9]">
                    <td className="py-3.5 font-bold text-[#203026]">
                      {locale === "ar" ? item.member?.nameAr : item.member?.nameNl}
                    </td>
                    <td className="py-3.5 text-xs text-[#6f7a70]">
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noreferrer" className="font-bold text-[#1a5632] underline">
                          {tp("openDocument")}
                        </a>
                      ) : (
                        item.fileName || item.type || "—"
                      )}
                    </td>
                    <td className="py-3.5">
                      <V2Pill tone={statusTone(item.status)}>{tp(`status.${item.status}`)}</V2Pill>
                    </td>
                    <td className="py-3.5 text-[10px] tabular-nums text-[#8a958b]">
                      {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <V2IconButton
                          label={tp("approve")}
                          onClick={() => void setStatus(item, "approved")}
                          disabled={busy || item.status === "approved"}
                        >
                          <Check size={13} />
                        </V2IconButton>
                        <V2IconButton
                          label={tp("reject")}
                          onClick={() => void setStatus(item, "rejected")}
                          danger
                          disabled={busy || item.status === "rejected"}
                        >
                          <X size={13} />
                        </V2IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </V2Panel>
      )}
    </V2Shell>
  );
}
