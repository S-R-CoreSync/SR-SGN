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
import { Mail, Pencil, Plus, RefreshCw, Send, Trash2 } from "lucide-react";

type BoardMember = {
  id: string;
  nameAr: string;
  nameEn: string;
  titleAr?: string | null;
  titleEn?: string | null;
  image?: string | null;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  userId?: string | null;
  invitedAt?: string | null;
  createdAt: string;
};

type FormState = {
  nameAr: string; nameEn: string; titleAr: string; titleEn: string;
  email: string; phone: string; role: string; image: string; website: string;
};
const emptyForm: FormState = {
  nameAr: "", nameEn: "", titleAr: "", titleEn: "", email: "", phone: "", role: "member", image: "", website: "",
};

function roleTone(role: string) {
  return role === "admin" ? ("warn" as const) : role === "member" ? ("neutral" as const) : ("good" as const);
}

export default function V2BoardPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.board");
  const locale = useLocale();

  const [members, setMembers] = useState<BoardMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<BoardMember | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setMembers(await v2Api<BoardMember[]>("/api/board"));
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

  function openEdit(member: BoardMember) {
    setForm({
      nameAr: member.nameAr ?? "",
      nameEn: member.nameEn ?? "",
      titleAr: member.titleAr ?? "",
      titleEn: member.titleEn ?? "",
      email: member.email ?? "",
      phone: member.phone ?? "",
      role: member.role ?? "member",
      image: member.image ?? "",
      website: "",
    });
    setFormError("");
    setEditing(member);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.nameAr.trim() || !form.nameEn.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      const payload: Record<string, string> = {
        nameAr: form.nameAr, nameEn: form.nameEn,
        titleAr: form.titleAr, titleEn: form.titleEn,
        email: form.email, phone: form.phone, role: form.role, image: form.image,
      };
      if (form.website) payload.website = form.website;
      if (editing === "new") {
        await v2Api("/api/board", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await v2Api(`/api/board/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
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

  async function remove(member: BoardMember) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api(`/api/board/${member.id}`, { method: "DELETE" });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function invite(member: BoardMember) {
    setBusy(true);
    setNotice("");
    try {
      await v2Api(`/api/board/${member.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "email", locale }),
      });
      setNotice(tp("inviteSent"));
      await load();
    } catch {
      setNotice(tp("inviteFailed"));
    } finally {
      setBusy(false);
    }
  }

  const invitedCount = members.filter((member) => member.invitedAt).length;
  const linkedCount = members.filter((member) => member.userId).length;

  return (
    <V2Shell active="/dashboard/v2/board" section={t("breadcrumbBoard")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="neutral">{tp("total")}: {formatLocalizedDigits(members.length, locale)}</V2Pill>
          <V2Pill tone="good">{tp("linked")}: {formatLocalizedDigits(linkedCount, locale)}</V2Pill>
          <V2Pill tone="warn">{tp("invited")}: {formatLocalizedDigits(invitedCount, locale)}</V2Pill>
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

      {notice && <div className="mb-4 rounded-xl border border-[#e6ddc9] bg-[#f5ecd6] px-4 py-3 text-xs font-bold text-[#6b5417]">{notice}</div>}

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : members.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#e6ddc9] text-[11px] font-black text-[#9aa399]">
                  <th className="py-2.5 text-right">{tp("table.name")}</th>
                  <th className="py-2.5 text-right">{tp("table.title")}</th>
                  <th className="py-2.5 text-right">{tp("table.role")}</th>
                  <th className="py-2.5 text-right">{tp("table.contact")}</th>
                  <th className="py-2.5 text-right">{tp("table.invited")}</th>
                  <th className="py-2.5 text-right">{tp("table.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id} className="border-b border-[#f0ead9]">
                    <td className="py-3.5 font-bold text-[#203026]">
                      {locale === "ar" ? member.nameAr || member.nameEn : member.nameEn || member.nameAr}
                    </td>
                    <td className="py-3.5 text-xs text-[#6f7a70]">
                      {locale === "ar" ? member.titleAr || member.titleEn : member.titleEn || member.titleAr || "—"}
                    </td>
                    <td className="py-3.5"><V2Pill tone={roleTone(member.role ?? "member")}>{tp(`roles.${member.role ?? "member"}`)}</V2Pill></td>
                    <td className="py-3.5 text-xs text-[#6f7a70]" dir="ltr">{member.email || member.phone || "—"}</td>
                    <td className="py-3.5 text-[10px] tabular-nums text-[#8a958b]">
                      {member.invitedAt ? formatLocalizedDigits(member.invitedAt.slice(0, 10), locale) : "—"}
                    </td>
                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5">
                        <V2IconButton label={tp("invite")} onClick={() => void invite(member)} disabled={busy || !member.email}>
                          <Send size={13} />
                        </V2IconButton>
                        <V2IconButton label={t("edit")} onClick={() => openEdit(member)} disabled={busy}>
                          <Pencil size={13} />
                        </V2IconButton>
                        <V2IconButton label={t("delete")} onClick={() => void remove(member)} danger disabled={busy}>
                          <Trash2 size={13} />
                        </V2IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.nameAr")}>
                <input required value={form.nameAr} onChange={(e) => setField("nameAr", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.nameEn")}>
                <input required dir="ltr" value={form.nameEn} onChange={(e) => setField("nameEn", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.titleAr")}>
                <input value={form.titleAr} onChange={(e) => setField("titleAr", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.titleEn")}>
                <input dir="ltr" value={form.titleEn} onChange={(e) => setField("titleEn", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.email")}>
                <input type="email" dir="ltr" value={form.email} onChange={(e) => setField("email", e.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("fields.phone")}>
                <input dir="ltr" value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.role")}>
                <select value={form.role} onChange={(e) => setField("role", e.target.value)} className={v2InputClass}>
                  {(["admin", "moderator", "contributor", "member"] as const).map((role) => (
                    <option key={role} value={role}>{tp(`roles.${role}`)}</option>
                  ))}
                </select>
              </V2Field>
              <V2Field label={tp("fields.website")}>
                <input dir="ltr" value={form.website} onChange={(e) => setField("website", e.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            <V2Field label={tp("fields.image")}>
              <input dir="ltr" value={form.image} onChange={(e) => setField("image", e.target.value)} className={v2InputClass} />
            </V2Field>
            <div className="mb-2 flex items-center gap-2 text-[11px] text-[#9aa399]">
              <Mail size={13} />
              {tp("inviteHint")}
            </div>
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
