"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { v2Api } from "@/components/dashboard/v2-form";
import { RefreshCw } from "lucide-react";

type SettingsMap = Record<string, boolean>;

// مفاتيح الذكاء الاصطناعي تُحفظ كما هي دون عرضها في الواجهة إطلاقاً.
const VISIBLE_KEYS = [
  "nameAr", "nameNl", "birthYear", "gender", "originCity", "whatsapp", "email",
  "nlProvincie", "nlCity", "expNl", "expOutside", "educationLevel", "profession",
  "skills", "maritalStatus",
] as const;

export default function V2MembershipSettingsPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.membershipSettings");
  const [settings, setSettings] = useState<SettingsMap>({});
  const [saved, setSaved] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    setNotice("");
    try {
      const data = await v2Api<SettingsMap>("/api/settings/membership");
      setSettings(data);
      setSaved(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(key: string) {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  async function save() {
    setBusy(true);
    setNotice("");
    try {
      // إرسال الخريطة كاملة حتى لا نفقد مفاتيح مخفية أو قديمة.
      const payload = { ...saved, ...settings };
      await v2Api("/api/settings/membership", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSaved(payload);
      setNotice(tp("saved"));
    } catch {
      setNotice(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  const changed = VISIBLE_KEYS.some((key) => Boolean(settings[key]) !== Boolean(saved[key]));

  return (
    <V2Shell active="/dashboard/v2/membership-settings" section={t("breadcrumbMembershipSettings")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone={changed ? "warn" : "good"}>{changed ? tp("unsaved") : tp("upToDate")}</V2Pill>
          <button
            onClick={() => void save()}
            disabled={busy || !changed}
            className="flex items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632] disabled:opacity-50"
          >
            {busy ? <RefreshCw size={15} className="animate-spin" /> : null}
            {t("save")}
          </button>
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy || !changed}
            title={tp("discard")}
            className="flex items-center gap-1.5 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 text-[11px] font-black text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6] disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            {tp("discard")}
          </button>
        </div>
      </V2Intro>

      {notice && <div className="mb-4 rounded-xl border border-[#e6ddc9] bg-[#f5ecd6] px-4 py-3 text-xs font-bold text-[#6b5417]">{notice}</div>}

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <V2Panel>
          <div className="grid gap-3 sm:grid-cols-2">
            {VISIBLE_KEYS.map((key) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4"
              >
                <span className="text-xs font-bold text-[#4d5a50]">{tp(`keys.${key}`)}</span>
                <input
                  type="checkbox"
                  checked={Boolean(settings[key])}
                  onChange={() => toggle(key)}
                  className="h-4 w-4 accent-[#1a5632]"
                />
              </label>
            ))}
          </div>
          <p className="mt-5 text-[10px] text-[#9aa399]">{tp("hiddenHint")}</p>
        </V2Panel>
      )}
    </V2Shell>
  );
}
