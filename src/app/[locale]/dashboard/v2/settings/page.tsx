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
type MemberCard = {
  id: string;
  memberNumber?: number | null;
  status?: string | null;
  nameAr?: string | null;
  nameNl?: string | null;
  originCity?: string | null;
  nlCity?: string | null;
  whatsapp?: string | null;
  avatar?: string | null;
  showInPublicProfile?: boolean;
  isCvPublic?: boolean;
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
  const tm = useTranslations("dashboardV2.pages.members");
  const locale = useLocale();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [member, setMember] = useState<MemberCard | null>(null);
  const [visibility, setVisibility] = useState({ showInPublicProfile: false, isCvPublic: false });
  const [visibilityBusy, setVisibilityBusy] = useState(false);
  const [visibilityNotice, setVisibilityNotice] = useState("");
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
    }
    try {
      const res = await fetch("/api/member/me", { cache: "no-store" });
      const data = res.ok ? await res.json() : null;
      const card = (data?.member ?? null) as MemberCard | null;
      setMember(card);
      setVisibility({
        showInPublicProfile: Boolean(card?.showInPublicProfile),
        isCvPublic: Boolean(card?.isCvPublic),
      });
    } catch {
      setMember(null);
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

  async function saveVisibility() {
    if (!member) return;
    setVisibilityBusy(true);
    setVisibilityNotice("");
    try {
      await v2Api("/api/member/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(visibility),
      });
      setVisibilityNotice(tp("visibilitySaved"));
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setVisibilityBusy(false);
    }
  }

  function statusKey(status: string | null | undefined) {
    const value = (status ?? "").toLowerCase();
    if (/accepted|approved|active/.test(value)) return "approved";
    if (/pending|waiting|new/.test(value)) return "pending";
    if (/rejected|declined/.test(value)) return "rejected";
    return "other";
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
        <div className="space-y-5">
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

        <V2Panel title={tp("memberTitle")} note={tp("memberNote")}>
          {!member ? (
            <p className="py-8 text-center text-xs text-[#9aa399]">{tp("memberEmpty")}</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-4">
                {member.avatar && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={member.avatar} alt="" className="h-14 w-14 rounded-full object-cover" />
                )}
                <div>
                  <p className="text-sm font-black text-[#203026]">
                    {locale === "ar" ? member.nameAr || member.nameNl : member.nameNl || member.nameAr}
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#8a958b]">
                    <span>
                      {tp("memberNumber")}: {member.memberNumber != null ? formatLocalizedDigits(member.memberNumber, locale) : "—"}
                    </span>
                    <V2Pill
                      tone={
                        statusKey(member.status) === "approved"
                          ? "good"
                          : statusKey(member.status) === "pending"
                            ? "warn"
                            : "neutral"
                      }
                    >
                      {tm(`status.${statusKey(member.status)}`)}
                    </V2Pill>
                  </p>
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-2 rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-3 text-xs font-bold text-[#203026]">
                  <input
                    type="checkbox"
                    checked={visibility.showInPublicProfile}
                    onChange={(e) => setVisibility((prev) => ({ ...prev, showInPublicProfile: e.target.checked }))}
                    className="h-3.5 w-3.5 accent-[#1a5632]"
                  />
                  {tp("publicProfile")}
                </label>
                <label className="flex items-center gap-2 rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-3 text-xs font-bold text-[#203026]">
                  <input
                    type="checkbox"
                    checked={visibility.isCvPublic}
                    onChange={(e) => setVisibility((prev) => ({ ...prev, isCvPublic: e.target.checked }))}
                    className="h-3.5 w-3.5 accent-[#1a5632]"
                  />
                  {tp("publicCv")}
                </label>
              </div>

              {visibilityNotice && (
                <p className="mt-3 rounded-xl border border-[#d8e6d9] bg-[#f1f8f1] px-3 py-2 text-xs font-bold text-[#1a5632]">
                  {visibilityNotice}
                </p>
              )}
              <div className="mt-4">
                <button
                  type="button"
                  disabled={visibilityBusy}
                  onClick={() => void saveVisibility()}
                  className="rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632] disabled:opacity-50"
                >
                  {tp("saveVisibility")}
                </button>
              </div>
            </>
          )}
        </V2Panel>
        </div>
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
