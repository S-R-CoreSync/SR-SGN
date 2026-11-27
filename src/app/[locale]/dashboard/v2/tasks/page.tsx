"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Pill } from "@/components/dashboard/v2-ui";
import { ArrowLeft, ArrowRight, CheckSquare, RefreshCw } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  createdAt: string;
};

function columnOf(status: string): "pending" | "progress" | "done" {
  const value = status.toLowerCase();
  if (/progress|doing|active/.test(value)) return "progress";
  if (/done|complete|closed/.test(value)) return "done";
  return "pending";
}

function priorityOf(priority: string) {
  const value = priority.toLowerCase();
  if (/high|urgent/.test(value)) return { key: "high", tone: "bad" as const };
  if (/low/.test(value)) return { key: "low", tone: "neutral" as const };
  return { key: "medium", tone: "warn" as const };
}

export default function V2TasksPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.tasks");
  const locale = useLocale();
  const isRtl = locale === "ar";

  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/tasks", { cache: "no-store" });
      if (!res.ok) throw new Error("tasks");
      setTasks(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function move(task: Task, status: string) {
    setBusy(task.id);
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status }),
      });
      if (!res.ok) throw new Error("patch");
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(null);
    }
  }

  const columns: { key: "pending" | "progress" | "done"; status: string }[] = [
    { key: "pending", status: "pending" },
    { key: "progress", status: "in_progress" },
    { key: "done", status: "completed" },
  ];

  return (
    <V2Shell active="/dashboard/v2/tasks" section={t("breadcrumbTasks")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <button
          onClick={() => void load()}
          title={t("retry")}
          aria-label={t("retry")}
          className="rounded-xl border border-[#e6ddc9] bg-white p-2 text-[#6f7a70] shadow-sm hover:bg-[#f5ecd6]"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
        </button>
      </V2Intro>

      {error ? (
        <V2Message text={t("error")} error />
      ) : loading ? (
        <V2Message text={t("loading")} />
      ) : (
        <div className="grid gap-5 lg:grid-cols-3">
          {columns.map((column) => {
            const items = tasks.filter((task) => columnOf(task.status) === column.key);
            return (
              <section
                key={column.key}
                className="rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-sm"
              >
                <div className="mb-4 flex items-center justify-between border-b border-[#f0ead9] pb-3">
                  <h2 className="text-sm font-black">{tp(`columns.${column.key}`)}</h2>
                  <span className="rounded-full bg-[#f5ecd6] px-2.5 py-1 text-[10px] font-black text-[#8a6a1f]">
                    {formatLocalizedDigits(items.length, locale)}
                  </span>
                </div>

                {items.length === 0 ? (
                  <p className="py-8 text-center text-xs text-[#9aa399]">{tp("empty")}</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((task) => {
                      const priority = priorityOf(task.priority);
                      return (
                        <article key={task.id} className="rounded-xl border border-[#f0ead9] bg-[#fdfcf9] p-4">
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold leading-snug text-[#203026]">{task.title}</h3>
                            <V2Pill tone={priority.tone}>{tp(`priority.${priority.key}`)}</V2Pill>
                          </div>
                          {task.description && (
                            <p className="mt-2 text-xs leading-relaxed text-[#8a958b]">{task.description}</p>
                          )}
                          <div className="mt-4 flex items-center justify-between border-t border-[#f0ead9] pt-3">
                            <span className="text-[10px] tabular-nums text-[#9aa399]">
                              {formatLocalizedDigits(task.createdAt.slice(0, 10), locale)}
                            </span>
                            {column.key !== "done" && (
                              <button
                                disabled={busy === task.id}
                                onClick={() => void move(task, column.status)}
                                className="flex items-center gap-1 text-[11px] font-black text-[#1a5632] hover:underline disabled:opacity-50"
                              >
                                {tp(column.key === "pending" ? "start" : "complete")}
                                {column.key === "pending" ? (
                                  isRtl ? <ArrowLeft size={13} className="rotate-180" /> : <ArrowRight size={13} />
                                ) : (
                                  <CheckSquare size={13} />
                                )}
                              </button>
                            )}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </V2Shell>
  );
}
