"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2IconButton, V2PrimaryButton, v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type Section = { title: string; body: string };
type Regulation = {
  id: string;
  title: string;
  description?: string | null;
  content: string;
  version: number;
  published: boolean;
  pdfPath?: string | null;
  updatedAt: string;
};

function parseSections(value: string | undefined): Section[] {
  try {
    const parsed = JSON.parse(value || "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item) => item && typeof item.title === "string" && typeof item.body === "string")
      .map((item) => ({ title: item.title, body: item.body }));
  } catch {
    return [];
  }
}

export default function V2RegulationsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.regulations");
  const locale = useLocale();

  const [regulation, setRegulation] = useState<Regulation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [sections, setSections] = useState<Section[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRegulation(await v2Api<Regulation | null>("/api/regulations"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openEdit() {
    if (!regulation) return;
    setSections(parseSections(regulation.content));
    setFormError("");
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!regulation || sections.length === 0) return;
    setBusy(true);
    setFormError("");
    try {
      await v2Api("/api/regulations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: regulation.id,
          content: JSON.stringify(sections),
          version: regulation.version + 1,
        }),
      });
      setEditing(false);
      await load();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function updateSection(index: number, key: keyof Section, value: string) {
    setSections((prev) => prev.map((item, i) => (i === index ? { ...item, [key]: value } : item)));
  }

  const displaySections = regulation ? parseSections(regulation.content) : [];
  const languageMatches = regulation
    ? [regulation.title, regulation.description ?? "", ...displaySections.flatMap((section) => [section.title, section.body])]
        .filter(Boolean)
        .every((text) => hasArabicCharacters(text) === (locale === "ar"))
    : false;

  return (
    <V2Shell active="/dashboard/v2/regulations" section={t("breadcrumbRegulations")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          {regulation && (
            <>
              <V2Pill tone="neutral">{tp("version")}: {formatLocalizedDigits(regulation.version, locale)}</V2Pill>
              <V2Pill tone={regulation.published ? "good" : "warn"}>
                {regulation.published ? tp("published") : tp("hidden")}
              </V2Pill>
              <V2PrimaryButton label={t("edit")} onClick={openEdit}>
                <Pencil size={15} />
              </V2PrimaryButton>
            </>
          )}
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
      ) : !regulation ? (
        <V2Message text={tp("empty")} />
      ) : !languageMatches ? (
        <V2Message text={tp("otherLanguage")} />
      ) : displaySections.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel>
          <h2 className="text-base font-black text-[#203026]">{regulation.title}</h2>
          {regulation.description && <p className="mt-2 text-xs text-[#8a958b]">{regulation.description}</p>}
          <p className="mt-2 text-[10px] tabular-nums text-[#9aa399]">
            {formatLocalizedDigits(regulation.updatedAt.slice(0, 10), locale)}
          </p>
          <div className="mt-6 space-y-6">
            {displaySections.map((section, index) => (
              <section key={index} className="border-t border-[#f0ead9] pt-5">
                <h3 className="text-sm font-black text-[#1a5632]">{section.title}</h3>
                <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-[#6f7a70]">{section.body}</p>
              </section>
            ))}
          </div>
        </V2Panel>
      )}

      {editing && (
        <V2Dialog title={tp("editTitle")} closeLabel={t("close")} onClose={() => setEditing(false)}>
          <form onSubmit={(event) => void save(event)}>
            {formError && <V2FormError text={formError} />}
            <p className="mb-4 text-[11px] text-[#8a958b]">{tp("saveHint")}</p>
            <div className="max-h-[55vh] space-y-5 overflow-y-auto rounded-xl border border-[#f0ead9] p-4">
              {sections.map((section, index) => (
                <div key={index} className="rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[10px] font-black text-[#9aa399]">
                      {tp("section")} {formatLocalizedDigits(index + 1, locale)}
                    </p>
                    <V2IconButton
                      label={t("delete")}
                      onClick={() => setSections((prev) => prev.filter((_, i) => i !== index))}
                      danger
                      disabled={sections.length <= 1}
                    >
                      <Trash2 size={13} />
                    </V2IconButton>
                  </div>
                  <V2Field label={tp("fields.title")}>
                    <input value={section.title} onChange={(event) => updateSection(index, "title", event.target.value)} className={v2InputClass} />
                  </V2Field>
                  <V2Field label={tp("fields.body")}>
                    <textarea value={section.body} onChange={(event) => updateSection(index, "body", event.target.value)} className={v2InputClass} />
                  </V2Field>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setSections((prev) => [...prev, { title: "", body: "" }])}
              className="mt-4 flex items-center gap-2 rounded-xl border border-[#e6ddc9] px-4 py-2 text-xs font-black text-[#1a5632] hover:bg-[#f5ecd6]"
            >
              <Plus size={14} />
              {tp("addSection")}
            </button>
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy || sections.length === 0}
              onCancel={() => setEditing(false)}
            />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
