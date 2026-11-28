"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, isPureLocaleText } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2IconButton, V2PrimaryButton,
  v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { Eye, Pencil, Plus, RefreshCw, Search, Sparkles, Star, Trash2, Upload } from "lucide-react";

type Post = {
  id: string;
  title: string;
  slug: string;
  excerpt?: string | null;
  content?: string | null;
  category?: string | null;
  views?: number | null;
  published?: boolean;
  featured?: boolean;
  membersOnly?: boolean;
  image?: string | null;
  tags?: string | null;
  source?: string | null;
  createdAt: string;
};

const SHARE_PLATFORMS = ["facebook", "instagram", "x", "telegram", "whatsapp", "youtube", "tiktok"] as const;

type Draft = { title: string; excerpt: string; content: string; tags: string };

type FormState = {
  title: string; excerpt: string; content: string; category: string;
  slug: string; image: string; tags: string; source: string;
  featured: boolean; membersOnly: boolean; publishTo: string[];
};
const emptyForm: FormState = {
  title: "", excerpt: "", content: "", category: "", slug: "", image: "", tags: "", source: "",
  featured: false, membersOnly: false, publishTo: [],
};

export default function V2ContentPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.content");
  const locale = useLocale();

  const [posts, setPosts] = useState<Post[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Post | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [idea, setIdea] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [suggestionId, setSuggestionId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNotice, setAiNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setPosts(await v2Api<Post[]>("/api/pages"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openNew() {
    setForm(emptyForm);
    setFormError("");
    setIdea("");
    setDraft(null);
    setSuggestionId("");
    setAiNotice("");
    setEditing("new");
  }

  function openEdit(post: Post) {
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      category: post.category ?? "",
      slug: post.slug ?? "",
      image: post.image ?? "",
      tags: post.tags ?? "",
      source: post.source ?? "",
      featured: Boolean(post.featured),
      membersOnly: Boolean(post.membersOnly),
      publishTo: [],
    });
    setFormError("");
    setIdea(post.title);
    setDraft(null);
    setSuggestionId("");
    setAiNotice("");
    setEditing(post);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function uploadImage(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setFormError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await v2Api<{ url?: string }>("/api/upload", { method: "POST", body });
      if (!result.url) throw new Error("missing url");
      setField("image", result.url);
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function toggleShare(platform: string) {
    setForm((prev) => ({
      ...prev,
      publishTo: prev.publishTo.includes(platform)
        ? prev.publishTo.filter((item) => item !== platform)
        : [...prev.publishTo, platform],
    }));
  }

  async function suggestDraft() {
    if (!idea.trim()) return;
    setAiBusy(true);
    setAiNotice("");
    setDraft(null);
    setSuggestionId("");
    try {
      const result = await v2Api<{ draft: Draft; suggestionId: string }>("/api/ai/content-draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idea: idea.trim() }),
      });
      const safe: Draft = {
        title: isPureLocaleText(result.draft.title, locale) ? result.draft.title : "",
        excerpt: isPureLocaleText(result.draft.excerpt, locale) ? result.draft.excerpt : "",
        content: isPureLocaleText(result.draft.content, locale) ? result.draft.content : "",
        tags: isPureLocaleText(result.draft.tags, locale) ? result.draft.tags : "",
      };
      if (!safe.title || !safe.content) {
        setAiNotice(t("error"));
        return;
      }
      setDraft(safe);
      setSuggestionId(result.suggestionId);
    } catch (e) {
      setAiNotice(e instanceof Error ? e.message : t("error"));
    } finally {
      setAiBusy(false);
    }
  }

  function adoptDraft() {
    if (!draft) return;
    setForm((prev) => ({
      ...prev,
      title: draft.title,
      excerpt: draft.excerpt,
      content: draft.content,
      tags: draft.tags,
    }));
    setDraft(null);
    setAiNotice(tp("aiAdoptedHint"));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      const { publishTo, ...fields } = form;
      const payload = {
        ...fields,
        category: form.category || tp("defaultCategory"),
        slug: form.slug.trim() || `post-${Date.now().toString(36)}`,
      };
      if (editing === "new") {
        await v2Api("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload, publishTo, suggestionId: suggestionId || undefined }),
        });
      } else {
        await v2Api("/api/pages", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...payload }),
        });
      }
      setEditing(null);
      await load();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(post: Post) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/pages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function togglePublished(post: Post) {
    setBusy(true);
    try {
      await v2Api("/api/pages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id, published: !post.published }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const visible = posts.filter((post) =>
    !query.trim() || post.title.toLowerCase().includes(query.trim().toLowerCase()),
  ).slice(0, 25);

  const totalViews = posts.reduce((sum, post) => sum + (post.views ?? 0), 0);
  const publishedCount = posts.filter((post) => post.published).length;

  return (
    <V2Shell active="/dashboard/v2/content" section={t("breadcrumbContent")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2PrimaryButton label={tp("createTitle")} onClick={openNew}>
            <Plus size={15} />
          </V2PrimaryButton>
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
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { key: "total", value: posts.length },
              { key: "published", value: publishedCount },
              { key: "views", value: totalViews },
            ].map((item) => (
              <div key={item.key} className="rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-sm">
                <p className="text-xs font-bold text-[#6f7a70]">{tp(`stats.${item.key}`)}</p>
                <p className="mt-1 text-2xl font-black tabular-nums text-[#123b24]">
                  {formatLocalizedDigits(item.value.toLocaleString(), locale)}
                </p>
              </div>
            ))}
          </div>

          <V2Panel className="divide-y divide-[#f0ead9]">
            {visible.length === 0 ? (
              <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
            ) : (
              visible.map((post) => (
                <article key={post.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-sm font-bold leading-snug text-[#203026]">{post.title}</h2>
                      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8a958b]">
                        <span className="flex items-center gap-1.5"><Eye size={13} className="text-[#8a6a1f]" />{formatLocalizedDigits((post.views ?? 0).toLocaleString(), locale)}</span>
                        <span className="tabular-nums">{formatLocalizedDigits(post.createdAt.slice(0, 10), locale)}</span>
                        {post.featured && <span className="flex items-center gap-1.5 font-bold text-[#8a6a1f]"><Star size={12} />{tp("featured")}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <V2Pill tone={post.published ? "good" : "neutral"}>
                        {post.published ? tp("published") : tp("hidden")}
                      </V2Pill>
                      <V2IconButton label={t("edit")} onClick={() => openEdit(post)} disabled={busy}>
                        <Pencil size={13} />
                      </V2IconButton>
                      <V2IconButton label={t("delete")} onClick={() => void remove(post)} danger disabled={busy}>
                        <Trash2 size={13} />
                      </V2IconButton>
                      <button
                        disabled={busy}
                        onClick={() => void togglePublished(post)}
                        className="rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                      >
                        {post.published ? tp("hide") : tp("publish")}
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </V2Panel>
        </div>
      )}

      {editing && (
        <V2Dialog
          title={editing === "new" ? tp("createTitle") : tp("editTitle")}
          closeLabel={t("close")}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={(event) => void save(event)}>
            <div className="mb-5 rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-3">
              <p className="mb-1 flex items-center gap-2 text-xs font-black text-[#1a5632]">
                <Sparkles size={14} className="text-[#8a6a1f]" />
                {tp("aiTitle")}
              </p>
              <p className="mb-3 text-[10px] leading-relaxed text-[#8a958b]">{tp("aiNote")}</p>
              <div className="flex flex-wrap gap-2">
                <textarea
                  rows={2}
                  dir={locale === "ar" ? "rtl" : "ltr"}
                  value={idea}
                  onChange={(event) => setIdea(event.target.value)}
                  placeholder={tp("aiIdeaPlaceholder")}
                  className={`${v2InputClass} min-w-[200px] flex-1`}
                />
                <button
                  type="button"
                  disabled={aiBusy || !idea.trim()}
                  onClick={() => void suggestDraft()}
                  className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-4 py-2 text-xs font-black text-[#1a5632] shadow-sm hover:bg-[#f5ecd6] disabled:opacity-50"
                >
                  <Sparkles size={14} />
                  {aiBusy ? tp("aiBusy") : tp("aiSuggest")}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-[#9aa399]">{tp("aiNoNumbersHint")}</p>
              {aiNotice && (
                <p className="mt-3 rounded-lg border border-[#f2c9c4] bg-[#fbe9e7] px-3 py-2 text-[11px] font-bold text-[#b42318]">
                  {isPureLocaleText(aiNotice, locale) ? aiNotice : t("error")}
                </p>
              )}
              {draft && (
                <div className="mt-3 rounded-lg border border-[#d8e6d9] bg-white p-3">
                  <p className="mb-2 text-[10px] font-black text-[#8a6a1f]">{tp("aiDraftNote")}</p>
                  <p className="text-xs font-bold text-[#203026]">{draft.title}</p>
                  <p className="mt-1 text-[11px] text-[#6f7a70]">{draft.excerpt}</p>
                  <p className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-[#8a958b]">{draft.content}</p>
                  {draft.tags && <p className="mt-1 text-[10px] text-[#8a958b]">{draft.tags}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={adoptDraft}
                      className="rounded-lg bg-[#123b24] px-3 py-2 text-[11px] font-black text-white hover:bg-[#1a5632]"
                    >
                      {tp("aiAdopt")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(null)}
                      className="rounded-lg border border-[#e6ddc9] px-3 py-2 text-[11px] font-bold text-[#6f7a70] hover:bg-[#f5ecd6]"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </div>
              )}
            </div>
            {formError && <V2FormError text={formError} />}
            <V2Field label={tp("fields.title")}>
              <input required value={form.title} onChange={(e) => setField("title", e.target.value)} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.excerpt")}>
              <input value={form.excerpt} onChange={(e) => setField("excerpt", e.target.value)} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.content")}>
              <textarea required rows={6} value={form.content} onChange={(e) => setField("content", e.target.value)} className={v2InputClass} />
            </V2Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.category")}>
                <input value={form.category} onChange={(e) => setField("category", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("slugLabel")}>
                <input dir="ltr" value={form.slug} onChange={(e) => setField("slug", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("imageLabel")}>
                <input dir="ltr" value={form.image} onChange={(e) => setField("image", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("sourceLabel")}>
                <input value={form.source} onChange={(e) => setField("source", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("tagsLabel")}>
                <input value={form.tags} onChange={(e) => setField("tags", e.target.value)} className={v2InputClass} />
              </V2Field>
              <label className="flex cursor-pointer items-end gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 text-xs font-black text-[#1a5632] hover:bg-[#f5ecd6]">
                <Upload size={14} />
                {tp("uploadImage")}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
                  disabled={busy}
                  className="hidden"
                  onChange={(event) => void uploadImage(event.target.files?.[0])}
                />
              </label>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 text-xs font-black text-[#4d5a50]">
                <input
                  type="checkbox"
                  checked={form.featured}
                  onChange={(e) => setField("featured", e.target.checked)}
                  className="h-4 w-4 accent-[#1a5632]"
                />
                {tp("featured")}
              </label>
              <label className="flex items-center gap-2 text-xs font-black text-[#4d5a50]">
                <input
                  type="checkbox"
                  checked={form.membersOnly}
                  onChange={(e) => setField("membersOnly", e.target.checked)}
                  className="h-4 w-4 accent-[#1a5632]"
                />
                {tp("membersOnly")}
              </label>
            </div>
            {editing === "new" && (
              <div className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-3">
                <p className="mb-3 text-xs font-black text-[#4d5a50]">{tp("socialTitle")}</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {SHARE_PLATFORMS.map((platform) => (
                    <label key={platform} className="flex items-center gap-2 text-[11px] font-bold text-[#6f7a70]">
                      <input
                        type="checkbox"
                        checked={form.publishTo.includes(platform)}
                        onChange={() => toggleShare(platform)}
                        className="h-3.5 w-3.5 accent-[#1a5632]"
                      />
                      {tp(`share.${platform}`)}
                    </label>
                  ))}
                </div>
              </div>
            )}
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setEditing(null)}
            />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
