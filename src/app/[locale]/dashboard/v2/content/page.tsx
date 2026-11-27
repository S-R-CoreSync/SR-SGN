"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2IconButton, V2PrimaryButton,
  v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { Eye, Pencil, Plus, RefreshCw, Search, Star, Trash2 } from "lucide-react";

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
  createdAt: string;
};

type FormState = { title: string; excerpt: string; content: string; category: string; featured: boolean };
const emptyForm: FormState = { title: "", excerpt: "", content: "", category: "", featured: false };

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
    setEditing("new");
  }

  function openEdit(post: Post) {
    setForm({
      title: post.title,
      excerpt: post.excerpt ?? "",
      content: post.content ?? "",
      category: post.category ?? "",
      featured: Boolean(post.featured),
    });
    setFormError("");
    setEditing(post);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      const payload = { ...form, category: form.category || tp("defaultCategory") };
      if (editing === "new") {
        await v2Api("/api/pages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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
            <V2Field label={tp("fields.category")}>
              <input value={form.category} onChange={(e) => setField("category", e.target.value)} className={v2InputClass} />
            </V2Field>
            <label className="mb-2 flex items-center gap-2 text-xs font-black text-[#4d5a50]">
              <input
                type="checkbox"
                checked={form.featured}
                onChange={(e) => setField("featured", e.target.checked)}
                className="h-4 w-4 accent-[#1a5632]"
              />
              {tp("featured")}
            </label>
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
