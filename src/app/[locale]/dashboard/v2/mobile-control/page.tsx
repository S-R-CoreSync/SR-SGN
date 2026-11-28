"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Field, V2FormActions, V2FormError, v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { RefreshCw, Send } from "lucide-react";

type MobileSettings = {
  banner?: { titleAr?: string; visible?: boolean; image?: string };
  version?: { latest?: string; required?: boolean; alertMessage?: string };
};
type MobileTheme = { primary?: string; accent?: string; background?: string };
type MobileData = { mobile_settings: MobileSettings; mobile_theme: MobileTheme };

export default function V2MobileControlPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.mobileControl");
  const locale = useLocale();

  const [tab, setTab] = useState<"settings" | "push">("settings");
  const [data, setData] = useState<MobileData | null>(null);
  const [bannerVisible, setBannerVisible] = useState(false);
  const [bannerImage, setBannerImage] = useState("");
  const [versionLatest, setVersionLatest] = useState("");
  const [versionRequired, setVersionRequired] = useState(false);
  const [theme, setTheme] = useState<MobileTheme>({});
  const [pushTitle, setPushTitle] = useState("");
  const [pushBody, setPushBody] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [pushResult, setPushResult] = useState<{ count: number; message: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await v2Api<MobileData>("/api/dashboard/mobile");
      setData(result);
      setBannerVisible(Boolean(result.mobile_settings?.banner?.visible));
      setBannerImage(result.mobile_settings?.banner?.image ?? "");
      setVersionLatest(result.mobile_settings?.version?.latest ?? "");
      setVersionRequired(Boolean(result.mobile_settings?.version?.required));
      setTheme(result.mobile_theme ?? {});
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!data) return;
    setBusy(true);
    setNotice("");
    try {
      await v2Api("/api/dashboard/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_settings",
          mobile_settings: {
            ...data.mobile_settings,
            banner: { ...data.mobile_settings?.banner, visible: bannerVisible, image: bannerImage },
            version: {
              ...data.mobile_settings?.version,
              latest: versionLatest,
              required: versionRequired,
            },
          },
          mobile_theme: theme,
        }),
      });
      setNotice(tp("saved"));
      await load();
    } catch {
      setNotice(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function sendPush(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setFormError("");
    setPushResult(null);
    try {
      const result = await v2Api<{ success: boolean; count?: number; message?: string }>("/api/dashboard/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "send_push",
          push: { title: pushTitle, body: pushBody, province: province || undefined, city: city || undefined },
        }),
      });
      const rawMessage = result.message ?? "";
      setPushResult({
        count: result.count ?? 0,
        message: rawMessage && hasArabicCharacters(rawMessage) === (locale === "ar") ? rawMessage : "",
      });
    } catch (e) {
      setFormError(e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <V2Shell active="/dashboard/v2/mobile-control" section={t("breadcrumbMobileControl")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#e6ddc9] bg-white p-1 shadow-sm">
            {(["settings", "push"] as const).map((key) => (
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
          <button
            type="button"
            onClick={() => void load()}
            disabled={busy}
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
      ) : !data ? (
        <V2Message text={tp("empty")} />
      ) : tab === "settings" ? (
        <form onSubmit={(event) => void saveSettings(event)}>
          <V2Panel title={tp("bannerTitle")} note={tp("bannerNote")}>
            <label className="mb-4 flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
              <span className="text-xs font-bold text-[#4d5a50]">{tp("bannerVisible")}</span>
              <input
                type="checkbox"
                checked={bannerVisible}
                onChange={(event) => setBannerVisible(event.target.checked)}
                className="h-4 w-4 accent-[#1a5632]"
              />
            </label>
            <V2Field label={tp("bannerImage")}>
              <input dir="ltr" value={bannerImage} onChange={(event) => setBannerImage(event.target.value)} className={v2InputClass} />
            </V2Field>
            {locale === "ar" && data.mobile_settings?.banner?.titleAr && (
              <p className="mb-4 text-xs text-[#6f7a70]">{data.mobile_settings.banner.titleAr}</p>
            )}
          </V2Panel>

          <div className="mt-5">
            <V2Panel title={tp("versionTitle")} note={tp("versionNote")}>
              <V2Field label={tp("versionLatest")}>
                <input dir="ltr" value={versionLatest} onChange={(event) => setVersionLatest(event.target.value)} className={v2InputClass} />
              </V2Field>
              <label className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                <span className="text-xs font-bold text-[#4d5a50]">{tp("versionRequired")}</span>
                <input
                  type="checkbox"
                  checked={versionRequired}
                  onChange={(event) => setVersionRequired(event.target.checked)}
                  className="h-4 w-4 accent-[#1a5632]"
                />
              </label>
            </V2Panel>
          </div>

          <div className="mt-5">
            <V2Panel title={tp("themeTitle")} note={tp("themeNote")}>
              <div className="grid gap-4 sm:grid-cols-3">
                {(["primary", "accent", "background"] as const).map((key) => (
                  <V2Field key={key} label={tp(`theme.${key}`)}>
                    <input
                      dir="ltr"
                      value={theme[key] ?? ""}
                      onChange={(event) => setTheme((prev) => ({ ...prev, [key]: event.target.value }))}
                      className={v2InputClass}
                    />
                  </V2Field>
                ))}
              </div>
            </V2Panel>
          </div>

          <V2FormActions saveLabel={t("save")} cancelLabel={t("cancel")} busy={busy} onCancel={() => void load()} />
        </form>
      ) : (
        <form onSubmit={(event) => void sendPush(event)}>
          {formError && <V2FormError text={formError} />}
          <V2Panel title={tp("pushTitle")} note={tp("pushNote")}>
            <V2Field label={tp("pushTitleField")}>
              <input required value={pushTitle} onChange={(event) => setPushTitle(event.target.value)} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("pushBodyField")}>
              <textarea required value={pushBody} onChange={(event) => setPushBody(event.target.value)} className={v2InputClass} />
            </V2Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("province")}>
                <input dir="ltr" value={province} onChange={(event) => setProvince(event.target.value)} className={v2InputClass} />
              </V2Field>
              <V2Field label={tp("city")}>
                <input dir="ltr" value={city} onChange={(event) => setCity(event.target.value)} className={v2InputClass} />
              </V2Field>
            </div>
            {pushResult && (
              <div className="mt-2 rounded-xl border border-[#e6ddc9] bg-[#f5ecd6] p-4 text-xs font-bold text-[#6b5417]">
                {tp("sentCount")}: {formatLocalizedDigits(pushResult.count, locale)}
                {pushResult.message && <span className="mt-1 block font-normal">{pushResult.message}</span>}
              </div>
            )}
            <div className="mt-6 flex justify-end border-t border-[#f0ead9] pt-4">
              <button
                type="submit"
                disabled={busy}
                className="flex items-center gap-2 rounded-xl bg-[#123b24] px-5 py-2 text-xs font-black text-white hover:bg-[#1a5632] disabled:opacity-50"
              >
                <Send size={14} />
                {tp("send")}
              </button>
            </div>
          </V2Panel>
        </form>
      )}
    </V2Shell>
  );
}
