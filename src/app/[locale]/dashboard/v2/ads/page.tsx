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
import { MousePointerClick, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type Ad = {
  id: string;
  title: string;
  image: string;
  link?: string | null;
  position: string;
  clicks: number;
  active: boolean;
  startDate?: string | null;
  endDate?: string | null;
  createdAt: string;
};

type FormState = {
  title: string; image: string; link: string; position: string;
  startDate: string; endDate: string; active: boolean;
};
const emptyForm: FormState = {
  title: "", image: "", link: "", position: "sidebar", startDate: "", endDate: "", active: true,
};

export default function V2AdsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.ads");
  const locale = useLocale();

  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Ad | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setAds(await v2Api<Ad[]>("/api/ads"));
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

  function openEdit(item: Ad) {
    setForm({
      title: item.title,
      image: item.image,
      link: item.link ?? "",
      position: item.position,
      startDate: item.startDate?.slice(0, 10) ?? "",
      endDate: item.endDate?.slice(0, 10) ?? "",
      active: item.active,
    });
    setFormError("");
    setEditing(item);
  }

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.image.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      const payload = { ...form };
      if (editing === "new") {
        await v2Api("/api/ads", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await v2Api("/api/ads", {
          method: "PUT",
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

  async function remove(item: Ad) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/ads", {
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

  async function toggle(item: Ad) {
    setBusy(true);
    try {
      await v2Api("/api/ads", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks ?? 0), 0);
  const activeCount = ads.filter((ad) => ad.active).length;

  return (
    <V2Shell active="/dashboard/v2/ads" section={t("breadcrumbAds")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("active")}: {formatLocalizedDigits(activeCount, locale)}</V2Pill>
          <V2Pill tone="neutral">{tp("clicks")}: {formatLocalizedDigits(totalClicks, locale)}</V2Pill>
          <V2PrimaryButton label={tp("createTitle")} onClick={openNew}>
            <Plus size={15} />
          </V2PrimaryButton>
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
      ) : ads.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {ads.map((ad) => (
            <article key={ad.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="text-sm font-black text-[#203026]">{ad.title}</h2>
                  <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8a958b]">
                    <span>{tp("position")}: {ad.position}</span>
                    <span className="flex items-center gap-1.5">
                      <MousePointerClick size={13} className="text-[#8a6a1f]" />
                      {formatLocalizedDigits(ad.clicks ?? 0, locale)}
                    </span>
                    {ad.endDate && (
                      <span>{tp("ends")}: {formatLocalizedDigits(ad.endDate.slice(0, 10), locale)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <V2Pill tone={ad.active ? "good" : "neutral"}>
                    {ad.active ? tp("activeOne") : tp("paused")}
                  </V2Pill>
                  <V2IconButton label={t("edit")} onClick={() => openEdit(ad)} disabled={busy}>
                    <Pencil size={13} />
                  </V2IconButton>
                  <V2IconButton label={t("delete")} onClick={() => void remove(ad)} danger disabled={busy}>
                    <Trash2 size={13} />
                  </V2IconButton>
                  <button
                    disabled={busy}
                    onClick={() => void toggle(ad)}
                    className="rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                  >
                    {ad.active ? tp("pause") : tp("activate")}
                  </button>
                </div>
              </div>
            </article>
          ))}
        </V2Panel>
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
            <V2Field label={tp("fields.image")}>
              <input required dir="ltr" value={form.image} onChange={(e) => setField("image", e.target.value)} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.link")}>
              <input dir="ltr" value={form.link} onChange={(e) => setField("link", e.target.value)} className={v2InputClass} />
            </V2Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.position")}>
                <input value={form.position} onChange={(e) => setField("position", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.startDate")}>
                <input type="date" value={form.startDate} onChange={(e) => setField("startDate", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <V2Field label={tp("fields.endDate")}>
              <input type="date" value={form.endDate} onChange={(e) => setField("endDate", e.target.value)} className={v2InputClass} />
            </V2Field>
            <label className="mb-2 flex items-center gap-2 text-xs font-black text-[#4d5a50]">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => setField("active", e.target.checked)}
                className="h-4 w-4 accent-[#1a5632]"
              />
              {tp("fields.active")}
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
