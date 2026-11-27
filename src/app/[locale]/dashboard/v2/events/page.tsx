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
import { Calendar, MapPin, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type EventItem = {
  id: string;
  title: string;
  description?: string | null;
  date: string;
  location?: string | null;
  category?: string | null;
  published?: boolean;
};

type FormState = { title: string; description: string; date: string; location: string; category: string };
const emptyForm: FormState = { title: "", description: "", date: "", location: "", category: "" };

export default function V2EventsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.events");
  const locale = useLocale();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [tab, setTab] = useState<"all" | "upcoming">("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<EventItem | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await v2Api<{ events?: EventItem[] }>("/api/events?limit=25");
      setEvents(data.events ?? []);
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

  function openEdit(item: EventItem) {
    setForm({
      title: item.title,
      description: item.description ?? "",
      date: item.date.slice(0, 10),
      location: item.location ?? "",
      category: item.category ?? "",
    });
    setFormError("");
    setEditing(item);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !form.date || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      const payload = { ...form, category: form.category || tp("defaultCategory") };
      if (editing === "new") {
        await v2Api("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await v2Api("/api/events", {
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

  async function remove(item: EventItem) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/events", {
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

  async function togglePublished(item: EventItem) {
    setBusy(true);
    try {
      await v2Api("/api/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, published: !item.published }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  const visible = tab === "all"
    ? events
    : events.filter((item) => new Date(item.date).getTime() >= Date.now());

  const formatDate = (value: string) =>
    formatLocalizedDigits(
      new Intl.DateTimeFormat(locale === "ar" ? "ar-SY" : locale === "nl" ? "nl-NL" : "en-GB", {
        day: "numeric", month: "long", year: "numeric",
      }).format(new Date(value)),
      locale,
    );

  return (
    <V2Shell active="/dashboard/v2/events" section={t("breadcrumbEvents")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#e6ddc9] bg-white p-1 shadow-sm">
            {(["all", "upcoming"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors ${
                  tab === key ? "bg-[#123b24] text-white" : "text-[#6f7a70] hover:bg-[#f5ecd6]"
                }`}
              >
                {tp(`tabs.${key}`)}
              </button>
            ))}
          </div>
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
      ) : visible.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {visible.map((item) => {
            const isUpcoming = new Date(item.date).getTime() >= Date.now();
            return (
              <article key={item.id} className="py-5 first:pt-0 last:pb-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[#203026]">{item.title}</h2>
                    <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-[#8a958b]">
                      <span className="flex items-center gap-1.5"><Calendar size={13} className="text-[#8a6a1f]" />{formatDate(item.date)}</span>
                      {item.location && <span className="flex items-center gap-1.5"><MapPin size={13} className="text-[#8a6a1f]" />{item.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <V2Pill tone={item.published ? "good" : "neutral"}>
                      {item.published ? tp("published") : tp("hidden")}
                    </V2Pill>
                    <V2Pill tone={isUpcoming ? "warn" : "neutral"}>
                      {isUpcoming ? tp("upcoming") : tp("past")}
                    </V2Pill>
                    <V2IconButton label={t("edit")} onClick={() => openEdit(item)} disabled={busy}>
                      <Pencil size={13} />
                    </V2IconButton>
                    <V2IconButton label={t("delete")} onClick={() => void remove(item)} danger disabled={busy}>
                      <Trash2 size={13} />
                    </V2IconButton>
                  </div>
                </div>
                {item.description && (
                  <p className="mt-3 text-xs leading-relaxed text-[#6f7a70]">{item.description}</p>
                )}
                <button
                  disabled={busy}
                  onClick={() => void togglePublished(item)}
                  className="mt-4 rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                >
                  {item.published ? tp("hide") : tp("publish")}
                </button>
              </article>
            );
          })}
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
            <V2Field label={tp("fields.description")}>
              <textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} className={v2InputClass} />
            </V2Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.date")}>
                <input required type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.location")}>
                <input value={form.location} onChange={(e) => setField("location", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <V2Field label={tp("fields.category")}>
              <input value={form.category} onChange={(e) => setField("category", e.target.value)} className={v2InputClass} />
            </V2Field>
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
