"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits, hasArabicCharacters } from "@/lib/language-guard";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2IconButton, V2PrimaryButton,
  v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { ArrowLeft, ArrowRight, CheckSquare, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";

type Task = {
  id: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  assignedTo?: string | null;
  createdAt: string;
};

type AccountOption = { id: string; name?: string | null; email?: string | null };

type FormState = { title: string; description: string; priority: string; status: string; assignedTo: string };
const emptyForm: FormState = { title: "", description: "", priority: "medium", status: "pending", assignedTo: "" };

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
  const [users, setUsers] = useState<AccountOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Task | "new" | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setTasks(await v2Api<Task[]>("/api/tasks"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void (async () => {
      try {
        const result = await v2Api<{ users?: AccountOption[] }>("/api/users?limit=200");
        setUsers(result.users ?? []);
      } catch {
        setUsers([]);
      }
    })();
  }, []);

  function accountLabel(id: string | null | undefined) {
    if (!id) return tp("unassigned");
    const index = users.findIndex((item) => item.id === id);
    const account = users[index];
    const name = account?.name || "";
    if (hasArabicCharacters(name)) {
      return locale === "ar" ? name : account?.email || id;
    }
    if (locale === "ar") {
      return `${tp("accountFallback")} ${formatLocalizedDigits(Math.max(index + 1, 1), locale)}`;
    }
    return name || account?.email || id;
  }

  function openNew() {
    setForm(emptyForm);
    setFormError("");
    setEditing("new");
  }

  function openEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description ?? "",
      priority: task.priority,
      status: task.status,
      assignedTo: task.assignedTo ?? "",
    });
    setFormError("");
    setEditing(task);
  }

  function setField(key: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim() || !editing) return;
    setBusy(true);
    setFormError("");
    try {
      if (editing === "new") {
        await v2Api("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
      } else {
        await v2Api("/api/tasks", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editing.id, ...form }),
        });
      }
      setEditing(null);
      await load();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function remove(task: Task) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function move(task: Task, status: string) {
    setBusy(true);
    try {
      await v2Api("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: task.id, status }),
      });
      await load();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
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
        <div className="flex items-center gap-2">
          <V2PrimaryButton label={tp("createTitle")} onClick={openNew}>
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
        <div className="grid gap-5 lg:grid-cols-3">
          {columns.map((column) => {
            const items = tasks.filter((task) => columnOf(task.status) === column.key);
            return (
              <section key={column.key} className="rounded-2xl border border-[#e6ddc9] bg-white p-5 shadow-sm">
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
                          <p className="mt-2 text-[10px] font-bold text-[#8a6a1f]">
                            {tp("assignedTo", { name: accountLabel(task.assignedTo) })}
                          </p>
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[#f0ead9] pt-3">
                            <span className="text-[10px] tabular-nums text-[#9aa399]">
                              {formatLocalizedDigits(task.createdAt.slice(0, 10), locale)}
                            </span>
                            <div className="flex items-center gap-2">
                              <V2IconButton label={t("edit")} onClick={() => openEdit(task)} disabled={busy}>
                                <Pencil size={13} />
                              </V2IconButton>
                              <V2IconButton label={t("delete")} onClick={() => void remove(task)} danger disabled={busy}>
                                <Trash2 size={13} />
                              </V2IconButton>
                              {column.key !== "done" && (
                                <button
                                  disabled={busy}
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

      {editing && (
        <V2Dialog
          title={editing === "new" ? tp("createTitle") : tp("editTitle")}
          closeLabel={t("close")}
          onClose={() => setEditing(null)}
        >
          <form onSubmit={(event) => void save(event)}>
            {formError && <V2FormError text={formError} />}
            <V2Field label={tp("fields.title")}>
              <input
                required
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                className={v2InputClass}
              />
            </V2Field>
            <V2Field label={tp("fields.description")}>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setField("description", e.target.value)}
                className={v2InputClass}
              />
            </V2Field>
            <div className="mt-4">
              <V2Field label={tp("assignedToLabel")}>
                <select value={form.assignedTo} onChange={(e) => setField("assignedTo", e.target.value)} className={v2InputClass}>
                  <option value="">{tp("unassigned")}</option>
                  {users.map((user, index) => (
                    <option key={user.id} value={user.id}>
                      {locale === "ar"
                        ? hasArabicCharacters(user.name || "")
                          ? user.name
                          : `${tp("accountFallback")} ${formatLocalizedDigits(index + 1, locale)}`
                        : hasArabicCharacters(user.name || "")
                          ? user.email || user.id
                          : user.name || user.email || user.id}
                    </option>
                  ))}
                </select>
              </V2Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label={tp("fields.priority")}>
                <select value={form.priority} onChange={(e) => setField("priority", e.target.value)} className={v2InputClass}>
                  <option value="low">{tp("priority.low")}</option>
                  <option value="medium">{tp("priority.medium")}</option>
                  <option value="high">{tp("priority.high")}</option>
                </select>
              </V2Field>
              <V2Field label={tp("fields.status")}>
                <select value={form.status} onChange={(e) => setField("status", e.target.value)} className={v2InputClass}>
                  <option value="pending">{tp("columns.pending")}</option>
                  <option value="in_progress">{tp("columns.progress")}</option>
                  <option value="completed">{tp("columns.done")}</option>
                </select>
              </V2Field>
            </div>
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setEditing(null)}
            />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
