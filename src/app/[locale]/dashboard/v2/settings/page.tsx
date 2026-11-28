"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2PrimaryButton, v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { Pencil, RefreshCw } from "lucide-react";

type Profile = {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  bio?: string | null;
  phone?: string | null;
  location?: string | null;
  website?: string | null;
  image?: string | null;
  _count?: { posts?: number };
};
type FormState = { name: string; bio: string; phone: string; location: string; website: string; image: string };

function localized(value: string | null | undefined, locale: string) {
  if (!value) return "—";
  return hasArabicCharacters(value) === (locale === "ar") ? value : "—";
}

const KNOWN_ROLES = ["admin", "moderator", "contributor", "member"];

export default function V2SettingsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.settings");
  const locale = useLocale();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState(false);
  const [formError, setFormError] = useState("");
  const [form, setForm] = useState<FormState>({ name: "", bio: "", phone: "", location: "", website: "", image: "" });

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setProfile(await v2Api<Profile>("/api/user/profile"));
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
    if (!profile) return;
    setForm({
      name: profile.name ?? "",
      bio: profile.bio ?? "",
      phone: profile.phone ?? "",
      location: profile.location ?? "",
      website: profile.website ?? "",
      image: profile.image ?? "",
    });
    setFormError("");
    setEditing(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    try {
      await v2Api("/api/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setEditing(false);
      await load();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <V2Shell active="/dashboard/v2/settings" section={t("breadcrumbSettings")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          {profile && (
            <V2PrimaryButton label={tp("edit")} onClick={openEdit}>
              <Pencil size={15} />
            </V2PrimaryButton>
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
      ) : !profile ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#203026]">{localized(profile.name, locale)}</h2>
              <p className="mt-1 text-xs text-[#8a958b]" dir="ltr">{profile.email || "—"}</p>
            </div>
            <V2Pill tone="good">
              {profile.role && KNOWN_ROLES.includes(profile.role) ? tp(`roles.${profile.role}`) : "—"}
            </V2Pill>
          </div>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[
              ["bio", profile.bio],
              ["phone", profile.phone],
              ["location", profile.location],
              ["website", profile.website],
            ].map(([key, value]) => (
              <div key={key as string} className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                <p className="text-[10px] font-black text-[#9aa399]">{tp(`fields.${key as string}`)}</p>
                <p className="mt-1.5 text-xs font-bold text-[#203026]" dir={key === "phone" || key === "website" ? "ltr" : undefined}>
                  {key === "bio" || key === "location" ? localized(value as string | null, locale) : (value || "—")}
                </p>
              </div>
            ))}
          </div>
          {profile._count?.posts !== undefined && (
            <p className="mt-5 text-[11px] text-[#8a958b]">
              {tp("postsCount")}: {formatLocalizedDigits(profile._count.posts, locale)}
            </p>
          )}
        </V2Panel>
      )}

      {editing && (
        <V2Dialog title={tp("edit")} closeLabel={t("close")} onClose={() => setEditing(false)}>
          <form onSubmit={(event) => void save(event)}>
            {formError && <V2FormError text={formError} />}
            <V2Field label={tp("fields.name")}>
              <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.bio")}>
              <textarea value={form.bio} onChange={(event) => setForm((prev) => ({ ...prev, bio: event.target.value }))} className={v2InputClass} />
            </V2Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.phone")}>
                <input dir="ltr" value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.website")}>
                <input dir="ltr" value={form.website} onChange={(event) => setForm((prev) => ({ ...prev, website: event.target.value }))} className={v2InputClass} />
              </V2Field>
            </div>
            <V2Field label={tp("fields.location")}>
              <input value={form.location} onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.image")}>
              <input dir="ltr" value={form.image} onChange={(event) => setForm((prev) => ({ ...prev, image: event.target.value }))} className={v2InputClass} />
            </V2Field>
            <V2FormActions saveLabel={t("save")} cancelLabel={t("cancel")} busy={busy} onCancel={() => setEditing(false)} />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
