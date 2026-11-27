"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { RefreshCw, Search } from "lucide-react";

type Member = {
  id: string;
  nameAr?: string | null;
  nameNl?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  originCity?: string | null;
  nlCity?: string | null;
  status?: string | null;
  createdAt: string;
};

type MembersResponse = { members: Member[]; total: number };

function statusInfo(status: string | null | undefined) {
  const value = (status ?? "").toLowerCase();
  if (/approved|active|accepted/.test(value)) return { key: "approved", tone: "good" as const };
  if (/pending|waiting|new/.test(value)) return { key: "pending", tone: "warn" as const };
  if (/rejected|declined|banned/.test(value)) return { key: "rejected", tone: "bad" as const };
  return { key: "other", tone: "neutral" as const };
}

export default function V2MembersPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.members");
  const locale = useLocale();

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/members?limit=25", { cache: "no-store" });
      if (!res.ok) throw new Error("members");
      const data: MembersResponse = await res.json();
      setMembers(data.members ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = members.filter((member) => {
    const value = query.trim().toLowerCase();
    if (!value) return true;
    return [member.nameAr, member.nameNl, member.email, member.whatsapp, member.originCity, member.nlCity]
      .some((field) => (field ?? "").toLowerCase().includes(value));
  });

  return (
    <V2Shell active="/dashboard/v2/members" section={t("breadcrumbMembers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="w-44 bg-transparent text-xs outline-none"
            />
          </div>
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
      ) : (
        <V2Panel>
          <div className="mb-4 flex items-center justify-between">
            <p className="text-xs font-black text-[#1a5632]">
              {tp("total")}: {formatLocalizedDigits(total.toLocaleString(), locale)}
            </p>
            <p className="text-[11px] text-[#9aa399]">
              {formatLocalizedDigits(visible.length, locale)} / {formatLocalizedDigits(members.length, locale)}
            </p>
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e6ddc9] text-[11px] font-black text-[#9aa399]">
                    <th className="py-2.5 text-right">{tp("table.name")}</th>
                    <th className="py-2.5 text-right">{tp("table.city")}</th>
                    <th className="py-2.5 text-right">{tp("table.status")}</th>
                    <th className="py-2.5 text-right">{tp("table.contact")}</th>
                    <th className="py-2.5 text-right">{tp("table.joined")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((member) => {
                    const info = statusInfo(member.status);
                    const name = locale === "ar" ? member.nameAr || member.nameNl : member.nameNl || member.nameAr;
                    const city = locale === "ar" ? member.originCity || member.nlCity : member.nlCity || member.originCity;
                    return (
                      <tr key={member.id} className="border-b border-[#f0ead9]">
                        <td className="py-3.5 font-bold text-[#203026]">{name || "—"}</td>
                        <td className="py-3.5 text-[#6f7a70]">{city || "—"}</td>
                        <td className="py-3.5"><V2Pill tone={info.tone}>{tp(`status.${info.key}`)}</V2Pill></td>
                        <td className="py-3.5 text-xs text-[#6f7a70]">{member.email || member.whatsapp || "—"}</td>
                        <td className="py-3.5 text-xs tabular-nums text-[#8a958b]">
                          {formatLocalizedDigits(member.createdAt.slice(0, 10), locale)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </V2Panel>
      )}
    </V2Shell>
  );
}
