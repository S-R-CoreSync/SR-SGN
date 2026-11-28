"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, ChevronLeft, ChevronRight, Download, RefreshCw, Search, X } from "lucide-react";

const PAGE_SIZE = 50;

type StatusFilter = "all" | "pending" | "accepted" | "rejected";

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
  const isRtl = locale === "ar";

  const [members, setMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(query.trim());
      setOffset(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset) });
      if (search) params.set("search", search);
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/members?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) throw new Error("members");
      const data: MembersResponse = await res.json();
      setMembers(data.members ?? []);
      setTotal(data.total ?? 0);
      setSelected([]);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [offset, search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(member: Member, status: "accepted" | "rejected") {
    setBusy(true);
    try {
      await v2Api(`/api/members/${member.id}`, {
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

  async function applyBatch(status: "accepted" | "rejected") {
    if (selected.length === 0) return;
    const count = selected.length;
    setBusy(true);
    try {
      await v2Api("/api/members/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: selected, action: "status", status }),
      });
      setNotice(tp("batchDone", { count: formatLocalizedDigits(count, locale) }));
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function toggle(id: string) {
    setSelected((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  }

  const allOnPageSelected = members.length > 0 && members.every((member) => selected.includes(member.id));

  function toggleAll() {
    setSelected(allOnPageSelected ? [] : members.map((member) => member.id));
  }

  function changeFilter(value: StatusFilter) {
    setStatusFilter(value);
    setOffset(0);
    setNotice("");
  }

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <V2Shell active="/dashboard/v2/members" section={t("breadcrumbMembers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="w-36 bg-transparent text-xs outline-none"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => changeFilter(e.target.value as StatusFilter)}
            aria-label={tp("filterLabel")}
            title={tp("filterLabel")}
            className="rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 text-xs font-bold text-[#1a5632] shadow-sm outline-none"
          >
            <option value="all">{tp("filterAll")}</option>
            <option value="pending">{tp("filterPending")}</option>
            <option value="accepted">{tp("filterAccepted")}</option>
            <option value="rejected">{tp("filterRejected")}</option>
          </select>
          <a
            href="/api/members/export"
            download
            title={tp("export")}
            aria-label={tp("export")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <Download size={15} />
          </a>
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

      {notice && (
        <div className="mb-4 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-4 py-2.5 text-xs font-bold text-[#1a5632]">
          {notice}
        </div>
      )}

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <V2Panel>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-black text-[#1a5632]">
              {tp("total")}: {formatLocalizedDigits(total.toLocaleString(), locale)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              {selected.length > 0 && (
                <>
                  <span className="text-[11px] font-bold text-[#8a6a1f]">
                    {tp("selectedCount", { count: formatLocalizedDigits(selected.length, locale) })}
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelected([])}
                    className="rounded-lg border border-[#e6ddc9] px-2 py-1 text-[11px] font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
                  >
                    {tp("clearSelection")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyBatch("accepted")}
                    className="rounded-lg border border-[#d8e6d9] bg-[#f1f8f1] px-2 py-1 text-[11px] font-bold text-[#1a5632] disabled:opacity-50"
                  >
                    {tp("approveSelected")}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void applyBatch("rejected")}
                    className="rounded-lg border border-[#f2c9c4] bg-[#fbe9e7] px-2 py-1 text-[11px] font-bold text-[#b42318] disabled:opacity-50"
                  >
                    {tp("rejectSelected")}
                  </button>
                </>
              )}
            </div>
          </div>

          {members.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e6ddc9] text-[11px] font-black text-[#9aa399]">
                    <th className="py-2.5 text-right">
                      <input
                        type="checkbox"
                        checked={allOnPageSelected}
                        onChange={toggleAll}
                        aria-label={tp("selectAll")}
                        title={tp("selectAll")}
                        className="h-3.5 w-3.5 accent-[#1a5632]"
                      />
                    </th>
                    <th className="py-2.5 text-right">{tp("table.name")}</th>
                    <th className="py-2.5 text-right">{tp("table.city")}</th>
                    <th className="py-2.5 text-right">{tp("table.status")}</th>
                    <th className="py-2.5 text-right">{tp("table.contact")}</th>
                    <th className="py-2.5 text-right">{tp("table.joined")}</th>
                    <th className="py-2.5 text-right">{tp("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => {
                    const info = statusInfo(member.status);
                    const name = locale === "ar" ? member.nameAr || member.nameNl : member.nameNl || member.nameAr;
                    const city = locale === "ar" ? member.originCity || member.nlCity : member.nlCity || member.originCity;
                    return (
                      <tr key={member.id} className="border-b border-[#f0ead9]">
                        <td className="py-3.5">
                          <input
                            type="checkbox"
                            checked={selected.includes(member.id)}
                            onChange={() => toggle(member.id)}
                            aria-label={name || member.id}
                            className="h-3.5 w-3.5 accent-[#1a5632]"
                          />
                        </td>
                        <td className="py-3.5 font-bold text-[#203026]">{name || "—"}</td>
                        <td className="py-3.5 text-[#6f7a70]">{city || "—"}</td>
                        <td className="py-3.5"><V2Pill tone={info.tone}>{tp(`status.${info.key}`)}</V2Pill></td>
                        <td className="py-3.5 text-xs text-[#6f7a70]">{member.email || member.whatsapp || "—"}</td>
                        <td className="py-3.5 text-xs tabular-nums text-[#8a958b]">
                          {formatLocalizedDigits(member.createdAt.slice(0, 10), locale)}
                        </td>
                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            <V2IconButton
                              label={tp("approve")}
                              onClick={() => void setStatus(member, "accepted")}
                              disabled={busy || info.key === "approved"}
                            >
                              <Check size={13} />
                            </V2IconButton>
                            <V2IconButton
                              label={tp("reject")}
                              onClick={() => void setStatus(member, "rejected")}
                              danger
                              disabled={busy || info.key === "rejected"}
                            >
                              <X size={13} />
                            </V2IconButton>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-[#f0ead9] pt-4">
            <p className="text-[11px] font-bold text-[#8a958b]">
              {tp("pageInfo", {
                current: formatLocalizedDigits(page, locale),
                total: formatLocalizedDigits(pageCount, locale),
              })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={offset === 0 || busy}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                title={tp("prevPage")}
                aria-label={tp("prevPage")}
                className="rounded-lg border border-[#e6ddc9] p-1.5 text-[#6f7a70] hover:bg-[#f5ecd6] disabled:opacity-40"
              >
                <ChevronLeft size={15} className={isRtl ? "rotate-180" : ""} />
              </button>
              <button
                type="button"
                disabled={page >= pageCount || busy}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                title={tp("nextPage")}
                aria-label={tp("nextPage")}
                className="rounded-lg border border-[#e6ddc9] p-1.5 text-[#6f7a70] hover:bg-[#f5ecd6] disabled:opacity-40"
              >
                <ChevronRight size={15} className={isRtl ? "rotate-180" : ""} />
              </button>
            </div>
          </div>
        </V2Panel>
      )}
    </V2Shell>
  );
}
