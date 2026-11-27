import type { ReactNode } from "react";

export function V2Intro({ title, note, children }: { title: string; note: string; children?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-black tracking-tight sm:text-[30px]">{title}</h1>
        <p className="mt-2 text-xs text-[#8a958b]">{note}</p>
      </div>
      {children}
    </div>
  );
}

export function V2Panel({
  title,
  note,
  children,
  className = "",
}: {
  title?: string;
  note?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-2xl border border-[#e6ddc9] bg-white p-6 shadow-sm ${className}`}>
      {title && <h2 className="text-sm font-black">{title}</h2>}
      {note && <p className="mt-1 text-[11px] text-[#8a958b]">{note}</p>}
      {children}
    </section>
  );
}

export function V2Message({ text, error = false }: { text: string; error?: boolean }) {
  return (
    <div
      className={`rounded-2xl border px-6 py-12 text-center text-sm ${
        error ? "border-red-200 bg-red-50 font-bold text-red-700" : "border-[#e6ddc9] bg-white text-[#8a958b]"
      }`}
    >
      {text}
    </div>
  );
}

export function V2Pill({ tone, children }: { tone: "good" | "warn" | "bad" | "neutral"; children: ReactNode }) {
  const styles = {
    good: "bg-[#e7f0e8] text-[#1a5632]",
    warn: "bg-[#f5ecd6] text-[#8a6a1f]",
    bad: "bg-[#fbe9e7] text-[#b42318]",
    neutral: "bg-[#f2f3ef] text-[#6f7a70]",
  }[tone];
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${styles}`}>{children}</span>;
}
