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
import { Plus, RefreshCw, Search, Trash2 } from "lucide-react";

type Subscriber = { id: string; email: string; createdAt: string };

export default function V2SubscribersPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.subscribers");
  const locale = useLocale();

  const [items, setItems] = useState<Subscriber[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adding, setAdding] = useState(false);
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await v2Api<Subscriber[]>("/api/subscribe"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function openAdd() {
    setEmail("");
    setFormError("");
    setAdding(true);
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    setFormError("");
    try {
      await v2Api("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setAdding(false);
      await load();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: Subscriber) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/subscribe", {
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

  const visible = items.filter((item) =>
    !query.trim() || item.email.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <V2Shell active="/dashboard/v2/subscribers" section={t("breadcrumbSubscribers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="good">{tp("total")}: {formatLocalizedDigits(items.length, locale)}</V2Pill>
          <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
            <Search size={15} className="text-[#8a6a1f]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={tp("searchPlaceholder")}
              className="w-40 bg-transparent text-xs outline-none"
            />
          </div>
          <V2PrimaryButton label={tp("createTitle")} onClick={openAdd}>
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

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <V2Panel className="divide-y divide-[#f0ead9]">
          {visible.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
          ) : (
            visible.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-[#203026]" dir="ltr">{item.email}</p>
                  <p className="mt-1 text-[10px] tabular-nums text-[#9aa399]">
                    {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                  </p>
                </div>
                <V2IconButton label={tp("delete")} onClick={() => void remove(item)} danger disabled={busy}>
                  <Trash2 size={14} />
                </V2IconButton>
              </div>
            ))
          )}
        </V2Panel>
      )}

      {adding && (
        <V2Dialog title={tp("createTitle")} closeLabel={t("close")} onClose={() => setAdding(false)}>
          <form onSubmit={(event) => void save(event)}>
            {formError && <V2FormError text={formError} />}
            <V2Field label={tp("fields.email")}>
              <input
                required
                type="email"
                dir="ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={v2InputClass}
              />
            </V2Field>
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setAdding(false)}
            />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
