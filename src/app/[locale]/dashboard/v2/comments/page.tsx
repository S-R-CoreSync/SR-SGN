"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, isPureLocaleText } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, Copy, RefreshCw, Search, Sparkles, Trash2, X } from "lucide-react";

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

type Review = { category: string; summary: string; reply: string };

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
  const [reviewFor, setReviewFor] = useState("");
  const [review, setReview] = useState<Review | null>(null);
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [copied, setCopied] = useState(false);

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

  async function suggestReview(item: Comment) {
    setReviewBusy(true);
    setReviewError("");
    setReview(null);
    setCopied(false);
    setReviewFor(item.id);
    try {
      const result = await v2Api<{ review: Review }>("/api/ai/inbox-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "comment", id: item.id }),
      });
      setReview({
        category: result.review.category,
        summary: isPureLocaleText(result.review.summary, locale) ? result.review.summary : "",
        reply: isPureLocaleText(result.review.reply, locale) ? result.review.reply : "",
      });
    } catch (e) {
      setReviewError(e instanceof Error ? e.message : t("error"));
    } finally {
      setReviewBusy(false);
    }
  }

  async function copyReply() {
    if (!review?.reply) return;
    try {
      await navigator.clipboard.writeText(review.reply);
      setCopied(true);
    } catch {
      setReviewError(t("error"));
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
                  <button
                    type="button"
                    title={tp("aiSuggest")}
                    aria-label={tp("aiSuggest")}
                    disabled={reviewBusy}
                    onClick={() => void suggestReview(item)}
                    className="flex items-center gap-1.5 whitespace-nowrap rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] px-3 py-2 text-[11px] font-black text-[#8a6a1f] shadow-sm hover:bg-[#f5ecd6] disabled:opacity-50"
                  >
                    <Sparkles size={13} className={reviewBusy && reviewFor === item.id ? "animate-pulse" : ""} />
                    {tp("aiSuggest")}
                  </button>
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
              {reviewFor === item.id && (
                <div className="mt-3 rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-3">
                  <p className="mb-2 text-[10px] font-black text-[#8a6a1f]">{tp("reviewTitle")}</p>
                  <p className="mb-3 text-[10px] leading-relaxed text-[#8a958b]">{tp("reviewNote")}</p>
                  {reviewError ? (
                    <p className="text-[11px] font-bold text-[#b42318]">
                      {isPureLocaleText(reviewError, locale) ? reviewError : t("error")}
                    </p>
                  ) : reviewBusy ? (
                    <p className="text-[11px] text-[#6f7a70]">{t("loading")}</p>
                  ) : review ? (
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold text-[#1a5632]">
                        {tp("reviewCategoryLabel")}: {tp(`reviewCategory.${review.category}`)}
                      </p>
                      {review.summary && (
                        <p className="text-[11px] text-[#6f7a70]">
                          <span className="font-bold">{tp("reviewSummaryLabel")}: </span>
                          {review.summary}
                        </p>
                      )}
                      {review.reply && (
                        <div className="rounded-lg border border-[#e6ddc9] bg-white p-2">
                          <p className="mb-1 text-[10px] font-bold text-[#8a958b]">{tp("reviewReplyLabel")}</p>
                          <p className="text-[11px] leading-relaxed text-[#203026]">{review.reply}</p>
                          <button
                            type="button"
                            onClick={() => void copyReply()}
                            className="mt-2 flex items-center gap-1.5 rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[10px] font-black text-[#1a5632] hover:bg-[#f5ecd6]"
                          >
                            <Copy size={12} />
                            {copied ? tp("copied") : tp("copyReply")}
                          </button>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              )}
            </article>
          ))}
        </V2Panel>
      )}
    </V2Shell>
  );
}
