"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";

export const v2InputClass =
  "w-full rounded-xl border border-[#e6ddc9] bg-[#fdfcf9] px-3 py-2.5 text-sm text-[#203026] outline-none transition-colors focus:border-[#1a5632]";

export async function v2Api<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { cache: "no-store", ...init });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as any)?.error || `HTTP ${res.status}`);
  return data as T;
}

export function V2Dialog({
  title,
  closeLabel,
  onClose,
  children,
}: {
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0b1f14]/50 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#e6ddc9] bg-white p-6 shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b border-[#f0ead9] pb-4">
          <h2 className="text-lg font-black text-[#123b24]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            title={closeLabel}
            aria-label={closeLabel}
            className="rounded-lg p-1.5 text-[#8a958b] hover:bg-[#f5ecd6]"
          >
            <X size={17} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function V2Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-xs font-black text-[#4d5a50]">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[10px] text-[#9aa399]">{hint}</span>}
    </label>
  );
}

export function V2FormError({ text }: { text: string }) {
  return (
    <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-bold text-red-700">
      {text}
    </p>
  );
}

export function V2FormActions({
  saveLabel,
  cancelLabel,
  busy,
  onCancel,
}: {
  saveLabel: string;
  cancelLabel: string;
  busy: boolean;
  onCancel: () => void;
}) {
  return (
    <div className="mt-6 flex items-center justify-end gap-2 border-t border-[#f0ead9] pt-4">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-xl border border-[#e6ddc9] px-4 py-2 text-xs font-black text-[#6f7a70] hover:bg-[#f5ecd6]"
      >
        {cancelLabel}
      </button>
      <button
        type="submit"
        disabled={busy}
        className="rounded-xl bg-[#123b24] px-5 py-2 text-xs font-black text-white shadow-sm hover:bg-[#1a5632] disabled:opacity-50"
      >
        {saveLabel}
      </button>
    </div>
  );
}

export function V2IconButton({
  label,
  onClick,
  children,
  danger = false,
  disabled = false,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      disabled={disabled}
      className={`rounded-lg border p-1.5 transition-colors disabled:opacity-50 ${
        danger
          ? "border-[#f2c9c4] text-[#b42318] hover:bg-[#fbe9e7]"
          : "border-[#e6ddc9] text-[#6f7a70] hover:bg-[#f5ecd6]"
      }`}
    >
      {children}
    </button>
  );
}

export function V2PrimaryButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-xl bg-[#123b24] px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-[#1a5632]"
    >
      {children}
      {label}
    </button>
  );
}
