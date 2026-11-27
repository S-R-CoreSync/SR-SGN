"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { RefreshCw } from "lucide-react";

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

export default function V2SurveysPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.surveys");
  const locale = useLocale();

  const [surveys, setSurveys] = useState<Survey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/surveys", { cache: "no-store" });
      if (!res.ok) throw new Error("surveys");
      setSurveys(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(item: Survey) {
    setBusy(item.id);
    try {
      const res = await fetch("/api/surveys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, active: !item.active }),
      });
      if (!res.ok) throw new Error("put");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const activeCount = surveys.filter((s) => s.active).length;

  return (
    <V2Shell active="/dashboard/v2/surveys" section={t("breadcrumbSurveys")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("active")}: {formatLocalizedDigits(activeCount, locale)}</V2Pill>
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
                    <button
                      disabled={busy === survey.id}
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
    </V2Shell>
  );
}
