"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, RefreshCw, Search, Trash2, X } from "lucide-react";

type Comment = {
  id: string;
  postId: string;
  author: string;
  content: string;
  approved: boolean;
  likes?: number;
  createdAt: string;
  replies?: Comment[];
};

export default function V2CommentsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.comments");
  const locale = useLocale();

  const [comments, setComments] = useState<Comment[]>([]);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ all: "true", limit: "50" });
      if (query.trim()) params.set("search", query.trim());
      const data = await v2Api<{ comments?: Comment[]; total?: number }>(`/api/comments?${params.toString()}`);
      setComments(data.comments ?? []);
      setTotal(data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setApproved(item: Comment, approved: boolean) {
    setBusy(true);
    try {
      await v2Api("/api/comments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, approved }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Comment) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const pending = comments.filter((item) => !item.approved).length;

  return (
    <V2Shell active="/dashboard/v2/comments" section={t("breadcrumbComments")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="warn">{tp("total")}: {formatLocalizedDigits(total, locale)}</V2Pill>
          <V2Pill tone="good">{tp("pending")}: {formatLocalizedDigits(pending, locale)}</V2Pill>
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="w-40 bg-transparent text-xs outline-none"
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
      ) : comments.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {comments.map((item) => (
            <article key={item.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[#203026]">{item.author}</h2>
                  <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                    {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                    {item.replies && item.replies.length > 0 && ` · ${tp("replies")}: ${formatLocalizedDigits(item.replies.length, locale)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <V2Pill tone={item.approved ? "good" : "warn"}>
                    {item.approved ? tp("approved") : tp("waiting")}
                  </V2Pill>
                  <V2IconButton
                    label={item.approved ? tp("unapprove") : tp("approve")}
                    onClick={() => void setApproved(item, !item.approved)}
                    disabled={busy}
                  >
                    {item.approved ? <X size={13} /> : <Check size={13} />}
                  </V2IconButton>
                  <V2IconButton label={t("delete")} onClick={() => void remove(item)} danger disabled={busy}>
                    <Trash2 size={13} />
                  </V2IconButton>
                </div>
              </div>
              <p className="mt-3 text-xs leading-relaxed text-[#6f7a70]">{item.content}</p>
            </article>
          ))}
        </V2Panel>
      )}
    </V2Shell>
  );
}
