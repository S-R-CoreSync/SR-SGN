"use client";

import { useTranslations } from "next-intl";
import { ExternalLink } from "lucide-react";
import type { AICitationSource } from "@/lib/ai/stream-client";

function safeUrl(url?: string): string | null {
  if (!url) return null;
  if (!url.startsWith("/") || url.startsWith("//")) return null;
  return url;
}

export function SourcesList({ sources }: { sources?: AICitationSource[] }) {
  const t = useTranslations("aiCitations");
  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-3 border-t border-slate-200 dark:border-slate-700 pt-2">
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-1.5">{t("title")}</p>
      <ul className="space-y-1">
        {sources.map((source, index) => {
          const href = safeUrl(source.url);
          const label = `[${index + 1}] ${source.title}`;
          return (
            <li key={`${source.type}-${source.id || source.title}-${index}`} className="text-[11px]">
              {href ? (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400 hover:underline"
                >
                  <span>{label}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-slate-600 dark:text-slate-300">{label}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
