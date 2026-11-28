"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2Field, V2PrimaryButton, v2Api, v2InputClass } from "@/components/dashboard/v2-form";
import { CheckCircle2, KeyRound, Link2, RefreshCw } from "lucide-react";

type FbStatus = {
  configured: boolean;
  pageId: string | null;
  pageSlug: string;
  tokenValid: boolean;
  hasPageAccess: boolean;
  tokenScopes: string[];
  errorMsg: string;
  authUrl: string;
  appId: string;
};
type SyncResult = {
  success: boolean;
  message?: string;
  fetched?: number;
  new?: number;
  skipped?: number;
  errors?: string[];
};

export default function V2FacebookSyncPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.facebookSync");
  const locale = useLocale();

  const [status, setStatus] = useState<FbStatus | null>(null);
  const [result, setResult] = useState<SyncResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [since, setSince] = useState("");
  const [token, setToken] = useState("");
  const [tokenBusy, setTokenBusy] = useState(false);
  const [tokenNotice, setTokenNotice] = useState<{ ok: boolean; text: string } | null>(null);
  const [callbackNotice, setCallbackNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const success = params.get("success");
    const failure = params.get("error");
    if (success === "token_saved") {
      setCallbackNotice({ ok: true, text: `${tp("callbackSuccess")} ${tp("tokenSavedHint")}` });
    } else if (failure) {
      setCallbackNotice({
        ok: false,
        text: locale === "ar" ? tp("callbackErrorShort") : tp("callbackError", { error: failure }),
      });
    }
    // Read once when the user returns from Facebook.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setStatus(await v2Api<FbStatus>("/api/sync/facebook"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function runSync() {
    setBusy(true);
    setResult(null);
    try {
      const body: Record<string, string> = { action: "sync" };
      if (since.trim()) body.since = since.trim();
      setResult(await v2Api<SyncResult>("/api/sync/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }));
    } catch (e) {
      setResult({ success: false, errors: [e instanceof Error ? e.message : ""] });
    } finally {
      setBusy(false);
    }
  }

  async function verifyToken() {
    if (!token.trim()) return;
    setTokenBusy(true);
    setTokenNotice(null);
    try {
      const data = await v2Api<{
        success?: boolean;
        scopes?: string[];
        error?: string;
        tokenValidMessage?: string;
      }>("/api/sync/facebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set_token", token: token.trim() }),
      });
      if (data.success) {
        setTokenNotice({
          ok: true,
          text: locale === "ar" ? tp("tokenValidShort") : tp("tokenValid", { scopes: (data.scopes ?? []).join(", ") }),
        });
        setToken("");
        await load();
      } else {
        setTokenNotice({
          ok: false,
          text: locale === "ar" ? tp("tokenInvalidShort") : tp("tokenInvalid", { error: data.error ?? "" }),
        });
      }
    } catch (e) {
      setTokenNotice({
        ok: false,
        text: locale === "ar" ? tp("tokenInvalidShort") : tp("tokenInvalid", { error: e instanceof Error ? e.message : "" }),
      });
    } finally {
      setTokenBusy(false);
    }
  }

  const rawMessages = [
    ...(status?.errorMsg ? [status.errorMsg] : []),
    ...(result?.errors ?? []),
  ].filter((message) => message && hasArabicCharacters(message) === (locale === "ar"));

  return (
    <V2Shell active="/dashboard/v2/facebook-sync" section={t("breadcrumbFacebookSync")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          {status?.configured && status.tokenValid && status.hasPageAccess ? (
            <V2Pill tone="good">{tp("connected")}</V2Pill>
          ) : (
            <V2Pill tone="warn">{tp("needsAttention")}</V2Pill>
          )}
          <V2PrimaryButton label={tp("runSync")} onClick={() => void runSync()}>
            {busy ? <RefreshCw size={15} className="animate-spin" /> : <RefreshCw size={15} />}
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

      {callbackNotice && (
        <div
          className={`mb-4 flex items-start gap-2 rounded-xl border px-4 py-3 text-xs font-bold ${
            callbackNotice.ok
              ? "border-[#d8e6d9] bg-[#f1f8f1] text-[#1a5632]"
              : "border-[#f2c9c4] bg-[#fbe9e7] text-[#b42318]"
          }`}
        >
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>{callbackNotice.text}</span>
        </div>
      )}

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <div className="space-y-5">
          <V2Panel title={tp("statusTitle")} note={tp("statusNote")}>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                ["configured", Boolean(status?.configured)],
                ["tokenValid", Boolean(status?.tokenValid)],
                ["pageAccess", Boolean(status?.hasPageAccess)],
              ].map(([key, value]) => (
                <div key={key as string} className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                  <p className="text-[10px] font-black text-[#9aa399]">{tp(`checks.${key as string}`)}</p>
                  <p className="mt-2">
                    <V2Pill tone={value ? "good" : "warn"}>{value ? tp("yes") : tp("no")}</V2Pill>
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-[11px] text-[#6f7a70]">
              {locale !== "ar" && <span>{tp("pageSlug")}: <span dir="ltr">{status?.pageSlug || "—"}</span></span>}
              <span>
                {tp("pageId")}: <span className="tabular-nums">{status?.pageId ? formatLocalizedDigits(status.pageId, locale) : "—"}</span>
              </span>
            </div>
            <div className="mt-5 grid gap-4 border-t border-[#f0ead9] pt-5 sm:grid-cols-2">
              <V2Field label={tp("since")}>
                <input
                  type="date"
                  dir="ltr"
                  value={since}
                  onChange={(event) => setSince(event.target.value)}
                  className={v2InputClass}
                />
              </V2Field>
              <div className="flex flex-col justify-end gap-2">
                {status?.authUrl && (
                  <a
                    href={status.authUrl}
                    className="flex w-fit items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632]"
                  >
                    <Link2 size={14} />
                    {tp("connectPage")}
                  </a>
                )}
                <p className="text-[10px] leading-relaxed text-[#8a958b]">{tp("connectHint")}</p>
              </div>
            </div>
          </V2Panel>

          <V2Panel title={tp("verifyTitle")}>
            <div className="flex flex-wrap gap-2">
              <input
                type="password"
                dir="ltr"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder={tp("tokenPlaceholder")}
                className={`${v2InputClass} min-w-[240px] flex-1`}
              />
              <button
                type="button"
                disabled={tokenBusy || !token.trim()}
                onClick={() => void verifyToken()}
                className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-4 py-2.5 text-xs font-black text-[#1a5632] shadow-sm hover:bg-[#f5ecd6] disabled:opacity-50"
              >
                <KeyRound size={14} />
                {tokenBusy ? tp("verifying") : tp("verify")}
              </button>
            </div>
            {tokenNotice && (
              <p
                className={`mt-3 rounded-xl px-3 py-2 text-xs font-bold ${
                  tokenNotice.ok
                    ? "border border-[#d8e6d9] bg-[#f1f8f1] text-[#1a5632]"
                    : "border border-[#f2c9c4] bg-[#fbe9e7] text-[#b42318]"
                }`}
              >
                {tokenNotice.text}
              </p>
            )}
          </V2Panel>

          {result && (
            <V2Panel title={tp("resultTitle")} note={tp("resultNote")}>
              <div className="flex flex-wrap items-center gap-3">
                <V2Pill tone={result.success ? "good" : "bad"}>{result.success ? tp("success") : tp("failed")}</V2Pill>
                {result.fetched !== undefined && (
                  <span className="text-xs text-[#6f7a70]">{tp("fetched")}: {formatLocalizedDigits(result.fetched, locale)}</span>
                )}
                {result.new !== undefined && (
                  <span className="text-xs text-[#6f7a70]">{tp("new")}: {formatLocalizedDigits(result.new, locale)}</span>
                )}
                {result.skipped !== undefined && (
                  <span className="text-xs text-[#6f7a70]">{tp("skipped")}: {formatLocalizedDigits(result.skipped, locale)}</span>
                )}
              </div>
              {rawMessages.length > 0 && (
                <ul className="mt-4 space-y-2 text-xs text-[#8a958b]">
                  {rawMessages.slice(0, 5).map((message, index) => (
                    <li key={index} className="rounded-lg bg-[#fdfcf9] p-3">{message}</li>
                  ))}
                </ul>
              )}
            </V2Panel>
          )}

          {rawMessages.length > 0 && !result && (
            <V2Panel>
              <ul className="space-y-2 text-xs text-[#8a958b]">
                {rawMessages.map((message, index) => (
                  <li key={index} className="rounded-lg bg-[#fdfcf9] p-3">{message}</li>
                ))}
              </ul>
            </V2Panel>
          )}
        </div>
      )}
    </V2Shell>
  );
}
