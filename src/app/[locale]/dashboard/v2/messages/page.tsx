"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Check, RefreshCw, Trash2 } from "lucide-react";

type Contact = {
  id: string;
  name?: string | null;
  email?: string | null;
  subject?: string | null;
  message?: string | null;
  read: boolean;
  createdAt: string;
};

export default function V2MessagesPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.messages");
  const locale = useLocale();

  const [messages, setMessages] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setMessages(await v2Api<Contact[]>("/api/contact"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(item: Contact) {
    setBusy(true);
    try {
      await v2Api("/api/contact", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, read: true }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Contact) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/contact", {
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

  const unread = messages.filter((item) => !item.read).length;

  return (
    <V2Shell active="/dashboard/v2/messages" section={t("breadcrumbMessages")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone={unread > 0 ? "warn" : "good"}>
            {tp("unread")}: {formatLocalizedDigits(unread, locale)}
          </V2Pill>
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
      ) : messages.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {messages.map((item) => (
            <article key={item.id} className="py-5 first:pt-0 last:pb-0">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black text-[#203026]">{item.name || tp("anonymous")}</h2>
                  <p className="mt-1 text-[11px] text-[#8a958b]" dir="ltr">
                    {item.email || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <V2Pill tone={item.read ? "good" : "warn"}>{item.read ? tp("read") : tp("unreadOne")}</V2Pill>
                  <span className="text-[10px] tabular-nums text-[#9aa399]">
                    {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                  </span>
                  <V2IconButton label={t("delete")} onClick={() => void remove(item)} danger disabled={busy}>
                    <Trash2 size={13} />
                  </V2IconButton>
                </div>
              </div>
              {item.subject && <p className="mt-3 text-xs font-bold text-[#1a5632]">{item.subject}</p>}
              <p className="mt-2 text-xs leading-relaxed text-[#6f7a70]">{item.message}</p>
              {!item.read && (
                <button
                  disabled={busy}
                  onClick={() => void markRead(item)}
                  className="mt-4 flex items-center gap-1.5 rounded-lg border border-[#e6ddc9] px-3 py-1.5 text-[11px] font-black text-[#1a5632] hover:bg-[#f5ecd6] disabled:opacity-50"
                >
                  <Check size={13} />
                  {tp("markRead")}
                </button>
              )}
            </article>
          ))}
        </V2Panel>
      )}
    </V2Shell>
  );
}
