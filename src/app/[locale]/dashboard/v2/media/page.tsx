"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import SafeImage from "@/components/ui/safe-image";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import { V2Dialog, V2FormError, V2IconButton, v2Api } from "@/components/dashboard/v2-form";
import { Copy, RefreshCw, Upload } from "lucide-react";

type MediaItem = {
  url: string;
  title: string;
  slug?: string;
  category?: string;
  createdAt?: string;
  source: "post" | "upload";
};

export default function V2MediaPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.media");
  const locale = useLocale();

  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [generatedUrl, setGeneratedUrl] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setItems(await v2Api<MediaItem[]>(`/api/uploads?locale=${encodeURIComponent(locale)}`));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setUploadError("");
    setCopied(false);
    setGeneratedUrl("");
    try {
      const body = new FormData();
      body.append("file", file);
      const result = await v2Api<{ url?: string }>("/api/upload", { method: "POST", body });
      if (!result.url) throw new Error("missing url");
      setGeneratedUrl(result.url);
    } catch {
      setUploadError(t("saveFailed"));
    } finally {
      setUploading(false);
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(generatedUrl);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  const postCount = items.filter((item) => item.source === "post").length;
  const uploadCount = items.filter((item) => item.source === "upload").length;

  return (
    <V2Shell active="/dashboard/v2/media" section={t("breadcrumbMedia")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <V2Pill tone="neutral">{tp("total")}: {formatLocalizedDigits(items.length, locale)}</V2Pill>
          <V2Pill tone="good">{tp("fromPosts")}: {formatLocalizedDigits(postCount, locale)}</V2Pill>
          <V2Pill tone="warn">{tp("fromUploads")}: {formatLocalizedDigits(uploadCount, locale)}</V2Pill>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632]">
            {uploading ? <RefreshCw size={15} className="animate-spin" /> : <Upload size={15} />}
            {tp("upload")}
            <input
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp,image/svg+xml"
              disabled={uploading}
              className="hidden"
              onChange={(event) => void upload(event.target.files?.[0])}
            />
          </label>
          <V2IconButton label={t("retry")} onClick={() => void load()} disabled={loading}>
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </V2IconButton>
        </div>
      </V2Intro>

      <p className="mb-5 rounded-xl border border-[#e6ddc9] bg-[#f5ecd6] px-4 py-3 text-xs font-bold text-[#6b5417]">
        {tp("uploadHint")}
      </p>

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : items.length === 0 ? (
        <V2Message text={tp("empty")} />
      ) : (
        <V2Panel>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {items.map((item) => (
              <article
                key={item.url}
                className="overflow-hidden rounded-xl border border-[#e6ddc9] bg-[#fdfcf9]"
              >
                <div className="h-36 bg-[#f2f3ef]">
                  <SafeImage
                    src={item.url}
                    alt={item.title}
                    fallbackSrc="/images/board/placeholder.svg"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="p-3">
                  <h2 className="truncate text-xs font-black text-[#203026]" title={item.title}>{item.title}</h2>
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <V2Pill tone={item.source === "post" ? "good" : "warn"}>
                      {item.source === "post" ? tp("fromPosts") : tp("fromUploads")}
                    </V2Pill>
                    {item.createdAt && (
                      <span className="text-[10px] tabular-nums text-[#9aa399]">
                        {formatLocalizedDigits(item.createdAt.slice(0, 10), locale)}
                      </span>
                    )}
                  </div>
                  {item.category && (
                    <p className="mt-2 truncate text-[10px] text-[#8a958b]">{item.category}</p>
                  )}
                </div>
              </article>
            ))}
          </div>
        </V2Panel>
      )}

      {generatedUrl && (
        <V2Dialog title={tp("uploadResult")} closeLabel={t("close")} onClose={() => setGeneratedUrl("")}>
          <p className="mb-4 text-xs text-[#6f7a70]">{tp("copyHint")}</p>
          <div className="mb-4 h-40 overflow-hidden rounded-xl border border-[#e6ddc9] bg-[#f2f3ef]">
            <SafeImage
              src={generatedUrl}
              alt={tp("uploadResult")}
              fallbackSrc="/images/board/placeholder.svg"
              className="h-full w-full object-contain"
            />
          </div>
          <textarea
            readOnly
            dir="ltr"
            value={generatedUrl}
            className="h-24 w-full resize-none rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] p-3 text-[10px] text-[#4d5a50] outline-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setGeneratedUrl("")}
              className="rounded-xl border border-[#e6ddc9] px-4 py-2 text-xs font-black text-[#6f7a70] hover:bg-[#f5ecd6]"
            >
              {t("close")}
            </button>
            <button
              type="button"
              onClick={() => void copyUrl()}
              className="flex items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2 text-xs font-black text-white hover:bg-[#1a5632]"
            >
              <Copy size={14} />
              {copied ? tp("copied") : tp("copy")}
            </button>
          </div>
        </V2Dialog>
      )}

      {uploadError && <div className="mt-4"><V2FormError text={uploadError} /></div>}
    </V2Shell>
  );
}
