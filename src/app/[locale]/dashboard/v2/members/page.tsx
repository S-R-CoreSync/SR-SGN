"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters, isPureLocaleText } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2Dialog, V2Field, V2IconButton, v2Api, v2InputClass } from "@/components/dashboard/v2-form";
import {
  Check, ChevronLeft, ChevronRight, Download, History, Mail, RefreshCw, Search, Shield, Upload, X,
} from "lucide-react";

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
  encryptedIdCard?: string | null;
  createdAt: string;
};

type IdentityReview = { outcome: string; confidence: string; reason: string };

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
  const [importOpen, setImportOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importBusy, setImportBusy] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{ imported: number; skipped: number } | null>(null);
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastSubject, setBroadcastSubject] = useState("");
  const [broadcastMessage, setBroadcastMessage] = useState("");
  const [broadcastBusy, setBroadcastBusy] = useState(false);
  const [broadcastNotice, setBroadcastNotice] = useState("");
  const [activityOpen, setActivityOpen] = useState(false);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [identityMember, setIdentityMember] = useState<Member | null>(null);
  const [identityReview, setIdentityReview] = useState<IdentityReview | null>(null);
  const [identityId, setIdentityId] = useState("");
  const [identityBusy, setIdentityBusy] = useState(false);
  const [identityError, setIdentityError] = useState("");
  const [identityDecided, setIdentityDecided] = useState("");

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

  async function runImport() {
    if (!importFile) return;
    setImportBusy(true);
    setImportError("");
    setImportResult(null);
    try {
      const body = new FormData();
      body.append("file", importFile);
      const result = await v2Api<{ imported?: number; skipped?: number }>("/api/members/import", {
        method: "POST",
        body,
      });
      setImportResult({ imported: result.imported ?? 0, skipped: result.skipped ?? 0 });
      setImportFile(null);
      await load();
    } catch (e) {
      setImportError(e instanceof Error ? e.message : t("error"));
    } finally {
      setImportBusy(false);
    }
  }

  function openImport() {
    setImportFile(null);
    setImportError("");
    setImportResult(null);
    setImportOpen(true);
  }

  function openBroadcast() {
    setBroadcastSubject("");
    setBroadcastMessage("");
    setBroadcastNotice("");
    setBroadcastOpen(true);
  }

  async function sendBroadcast() {
    if (!broadcastSubject.trim() || !broadcastMessage.trim()) return;
    setBroadcastBusy(true);
    setBroadcastNotice("");
    try {
      const result = await v2Api<{ sent: number; total: number }>("/api/members/email-broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: statusFilter === "all" ? "all" : statusFilter,
          subject: broadcastSubject.trim(),
          message: broadcastMessage.trim(),
        }),
      });
      setBroadcastNotice(tp("sentDone", {
        sent: formatLocalizedDigits(result.sent, locale),
        total: formatLocalizedDigits(result.total, locale),
      }));
    } catch (e) {
      setBroadcastNotice(e instanceof Error ? e.message : t("error"));
    } finally {
      setBroadcastBusy(false);
    }
  }

  async function openActivity() {
    setActivityOpen(true);
    setActivityLoading(true);
    try {
      setActivityLogs(await v2Api<any[]>("/api/members/activity?limit=50"));
    } catch {
      setActivityLogs([]);
    } finally {
      setActivityLoading(false);
    }
  }

  async function openIdentity(member: Member) {
    setIdentityMember(member);
    setIdentityReview(null);
    setIdentityId("");
    setIdentityError("");
    setIdentityDecided("");
    setIdentityBusy(true);
    try {
      const result = await v2Api<{ review: IdentityReview; suggestionId: string }>("/api/ai/identity-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId: member.id }),
      });
      const review = result.review;
      setIdentityReview({
        outcome: isPureLocaleText(review.outcome, locale) ? review.outcome : "",
        confidence: isPureLocaleText(review.confidence, locale) ? review.confidence : "",
        reason: isPureLocaleText(review.reason, locale) ? review.reason : "",
      });
      setIdentityId(result.suggestionId);
    } catch (e) {
      setIdentityError(e instanceof Error ? e.message : t("error"));
    } finally {
      setIdentityBusy(false);
    }
  }

  async function decideIdentity(decision: "confirmed" | "rejected") {
    if (!identityId || identityBusy) return;
    setIdentityBusy(true);
    setIdentityError("");
    try {
      await v2Api(`/api/ai/identity-review/${encodeURIComponent(identityId)}/decide`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ decision }),
      });
      setIdentityDecided(tp("identityDecided"));
    } catch (e) {
      setIdentityError(e instanceof Error ? e.message : t("error"));
    } finally {
      setIdentityBusy(false);
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
          <button
            type="button"
            onClick={openBroadcast}
            title={tp("broadcast")}
            aria-label={tp("broadcast")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <Mail size={15} />
          </button>
          <button
            type="button"
            onClick={() => void openActivity()}
            title={tp("activity")}
            aria-label={tp("activity")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <History size={15} />
          </button>
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
            type="button"
            onClick={openImport}
            title={tp("import")}
            aria-label={tp("import")}
            className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
          >
            <Upload size={15} />
          </button>
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
                            {member.encryptedIdCard && (
                              <V2IconButton
                                label={tp("identityReview")}
                                onClick={() => void openIdentity(member)}
                                disabled={busy}
                              >
                                <Shield size={13} />
                              </V2IconButton>
                            )}
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

      {importOpen && (
        <V2Dialog title={tp("importTitle")} closeLabel={t("close")} onClose={() => setImportOpen(false)}>
          <p className="mb-4 text-xs leading-relaxed text-[#6f7a70]">{tp("importNote")}</p>
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => {
              setImportFile(e.target.files?.[0] ?? null);
              setImportError("");
              setImportResult(null);
            }}
            className="w-full rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-2.5 text-xs text-[#203026] outline-none"
          />
          {importError && <p className="mt-3 text-xs font-bold text-[#b42318]">{importError}</p>}
          {importResult && (
            <p className="mt-3 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-3 py-2 text-xs font-bold text-[#1a5632]">
              {tp("importDone", {
                imported: formatLocalizedDigits(importResult.imported, locale),
                skipped: formatLocalizedDigits(importResult.skipped, locale),
              })}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(false)}
              className="rounded-xl border border-[#e6ddc9] px-4 py-2.5 text-xs font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
            >
              {t("close")}
            </button>
            <button
              type="button"
              disabled={!importFile || importBusy}
              onClick={() => void runImport()}
              className="rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632] disabled:opacity-50"
            >
              {tp("importSubmit")}
            </button>
          </div>
        </V2Dialog>
      )}

      {broadcastOpen && (
        <V2Dialog title={tp("broadcastTitle")} closeLabel={t("close")} onClose={() => setBroadcastOpen(false)}>
          <p className="mb-4 text-xs leading-relaxed text-[#6f7a70]">{tp("broadcastNote")}</p>
          <V2Field label={tp("subject")}>
            <input value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} className={v2InputClass} />
          </V2Field>
          <V2Field label={tp("message")}>
            <textarea rows={6} dir="ltr" value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} className={`${v2InputClass} mt-3 font-mono text-xs`} />
          </V2Field>
          {broadcastNotice && (
            <p className="mt-3 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-3 py-2 text-xs font-bold text-[#1a5632]">
              {broadcastNotice}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setBroadcastOpen(false)}
              className="rounded-xl border border-[#e6ddc9] px-4 py-2.5 text-xs font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
            >
              {t("close")}
            </button>
            <button
              type="button"
              disabled={broadcastBusy || !broadcastSubject.trim() || !broadcastMessage.trim()}
              onClick={() => void sendBroadcast()}
              className="rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632] disabled:opacity-50"
            >
              {broadcastBusy ? tp("sending") : tp("send")}
            </button>
          </div>
        </V2Dialog>
      )}

      {activityOpen && (
        <V2Dialog title={tp("activity")} closeLabel={t("close")} onClose={() => setActivityOpen(false)}>
          {activityLoading ? (
            <p className="py-8 text-center text-xs text-[#9aa399]">{t("loading")}</p>
          ) : activityLogs.length === 0 ? (
            <p className="py-8 text-center text-xs text-[#9aa399]">{tp("activityEmpty")}</p>
          ) : (
            <div className="max-h-[60vh] space-y-2 overflow-y-auto">
              {activityLogs.map((log) => {
                const visible = (value: unknown) => {
                  const text = String(value ?? "");
                  if (!text) return "";
                  const arabic = hasArabicCharacters(text);
                  return locale === "ar" ? (arabic ? text : "") : (arabic ? "" : text);
                };
                const action = visible(log.action || log.type);
                const description = visible(log.details);
                return (
                <div key={log.id} className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-3">
                  <p className="text-xs font-bold text-[#203026]">{action || "—"}</p>
                  {description && <p className="mt-1 text-[11px] text-[#6f7a70]">{description}</p>}
                  <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                    {log.createdAt ? formatLocalizedDigits(log.createdAt.slice(0, 10), locale) : "—"}
                  </p>
                </div>
                );
              })}
            </div>
          )}
        </V2Dialog>
      )}

      {identityMember && (
        <V2Dialog title={tp("identityTitle")} closeLabel={t("close")} onClose={() => setIdentityMember(null)}>
          <p className="mb-4 text-xs leading-relaxed text-[#6f7a70]">{tp("identityNote")}</p>
          <p className="mb-4 text-sm font-black text-[#203026]">
            {locale === "ar" ? identityMember.nameAr || identityMember.nameNl : identityMember.nameNl || identityMember.nameAr}
          </p>
          {identityBusy && !identityReview ? (
            <p className="py-6 text-center text-xs text-[#9aa399]">{tp("identityBusy")}</p>
          ) : identityError ? (
            <p className="rounded-xl border border-[#f2c9c4] bg-[#fbe9e7] px-3 py-2 text-xs font-bold text-[#b42318]">
              {isPureLocaleText(identityError, locale) ? identityError : t("error")}
            </p>
          ) : identityReview ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] font-bold text-[#8a958b]">{tp("identityOutcomeLabel")}:</span>
                <V2Pill tone={identityReview.outcome === "match" ? "good" : identityReview.outcome === "mismatch" ? "bad" : "warn"}>
                  {tp(`ai.identityOutcome.${identityReview.outcome}`)}
                </V2Pill>
                <span className="text-[11px] font-bold text-[#8a958b]">{tp("identityConfidenceLabel")}:</span>
                <V2Pill tone="neutral">{tp(`ai.identityConfidence.${identityReview.confidence}`)}</V2Pill>
              </div>
              {identityReview.reason && (
                <p className="rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-3 text-xs leading-relaxed text-[#6f7a70]">
                  <span className="font-black text-[#1a5632]">{tp("identityReasonLabel")}: </span>
                  {identityReview.reason}
                </p>
              )}
              <p className="text-[11px] font-bold text-[#8a958b]">{tp("identityDecisionLabel")}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!identityId || Boolean(identityDecided) || identityBusy}
                  onClick={() => void decideIdentity("confirmed")}
                  className="rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-4 py-2.5 text-xs font-black text-[#1a5632] hover:bg-[#e4f0e4] disabled:opacity-50"
                >
                  {tp("identityConfirm")}
                </button>
                <button
                  type="button"
                  disabled={!identityId || Boolean(identityDecided) || identityBusy}
                  onClick={() => void decideIdentity("rejected")}
                  className="rounded-xl border border-[#f2c9c4] bg-[#fbe9e7] px-4 py-2.5 text-xs font-black text-[#b42318] hover:bg-[#f6dcd8] disabled:opacity-50"
                >
                  {tp("identityReject")}
                </button>
              </div>
              {identityDecided && (
                <p className="rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-3 py-2 text-xs font-bold text-[#1a5632]">
                  {identityDecided}
                </p>
              )}
            </div>
          ) : (
            <p className="py-6 text-center text-xs text-[#9aa399]">{tp("identityDecisionPending")}</p>
          )}
          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={() => setIdentityMember(null)}
              className="rounded-xl border border-[#e6ddc9] px-4 py-2.5 text-xs font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
            >
              {t("close")}
            </button>
          </div>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
