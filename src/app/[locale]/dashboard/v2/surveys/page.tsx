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
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type Option = { id: string; text: string; votes: number };
type Survey = {
  id: string;
  title: string;
  description?: string | null;
  active: boolean;
  options: Option[];
  _count?: { votes: number };
  createdAt: string;
};

type FormState = { title: string; description: string; options: string; active: boolean };
const emptyForm: FormState = { title: "", description: "", options: "", active: true };

export default function V2SurveysPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.surveys");
  const locale = useLocale();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Survey | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setSurveys(await v2Api<Survey[]>("/api/surveys"));
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

  function openEdit(item: Survey) {
    setForm({
      title: item.title,
      description: item.description ?? "",
      options: "",
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
    if (!form.title.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      if (editing === "new") {
        const options = form.options.split("\n").map((line) => line.trim()).filter(Boolean);
        if (options.length === 0) {
          setFormError(tp("optionsRequired"));
          setBusy(false);
          return;
        }
        await v2Api("/api/surveys", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: form.title, description: form.description, active: form.active, options }),
        });
      } else {
        await v2Api("/api/surveys", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: editing.id,
            title: form.title,
            description: form.description,
            active: form.active,
          }),
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

  async function remove(item: Survey) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/surveys", {
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

  async function toggle(item: Survey) {
    setBusy(true);
    try {
      await v2Api("/api/surveys", {
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

  const activeCount = surveys.filter((survey) => survey.active).length;

  return (
    <V2Shell active="/dashboard/v2/surveys" section={t("breadcrumbSurveys")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("active")}: {formatLocalizedDigits(activeCount, locale)}</V2Pill>
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
      ) : surveys.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {surveys.map((survey) => {
            const votes = survey._count?.votes ?? 0;
            const max = Math.max(1, ...survey.options.map((option) => option.votes ?? 0));
            return (
              <V2Panel key={survey.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-[#203026]">{survey.title}</h2>
                    {survey.description && (
                      <p className="mt-2 text-xs leading-relaxed text-[#8a958b]">{survey.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <V2Pill tone={survey.active ? "good" : "neutral"}>
                      {survey.active ? tp("activeOne") : tp("paused")}
                    </V2Pill>
                    <V2IconButton label={t("edit")} onClick={() => openEdit(survey)} disabled={busy}>
                      <Pencil size={13} />
                    </V2IconButton>
                    <V2IconButton label={t("delete")} onClick={() => void remove(survey)} danger disabled={busy}>
                      <Trash2 size={13} />
                    </V2IconButton>
                    <button
                      disabled={busy}
                      onClick={() => void toggle(survey)}
                      className="rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                    >
                      {survey.active ? tp("pause") : tp("activate")}
                    </button>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {survey.options.map((option) => (
                    <div key={option.id}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="font-bold text-[#4d5a50]">{option.text}</span>
                        <span className="font-black tabular-nums text-[#123b24]">
                          {formatLocalizedDigits(option.votes ?? 0, locale)}
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-[#f0ead9]">
                        <div
                          className="h-full rounded-full bg-[#1a5632]"
                          style={{ width: `${Math.max(2, ((option.votes ?? 0) / max) * 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {survey.options.length === 0 && (
                    <p className="text-xs text-[#9aa399]">{tp("noOptions")}</p>
                  )}
                </div>

                <p className="mt-5 border-t border-[#f0ead9] pt-3 text-[11px] text-[#9aa399]">
                  {tp("totalVotes")}: {formatLocalizedDigits(votes, locale)}
                </p>
              </V2Panel>
            );
          })}
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
            <V2Field label={tp("fields.description")}>
              <textarea rows={3} value={form.description} onChange={(e) => setField("description", e.target.value)} className={v2InputClass} />
            </V2Field>
            {editing === "new" && (
              <V2Field label={tp("fields.options")} hint={tp("fields.optionsHint")}>
                <textarea
                  rows={4}
                  value={form.options}
                  onChange={(e) => setField("options", e.target.value)}
                  className={v2InputClass}
                />
              </V2Field>
            )}
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
