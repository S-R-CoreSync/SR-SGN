"use client";

import { useCallback, useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatLocalizedDigits } from "@/lib/language-guard";
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type Permission } from "@/lib/permissions";
import { V2Shell } from "@/components/dashboard/v2-shell";
import { V2Intro, V2Message, V2Panel, V2Pill } from "@/components/dashboard/v2-ui";
import {
  V2Dialog, V2Field, V2FormActions, V2FormError, V2IconButton, V2PrimaryButton,
  v2Api, v2InputClass,
} from "@/components/dashboard/v2-form";
import { KeyRound, Pencil, Plus, RefreshCw, Search, Shield, Trash2 } from "lucide-react";

type UserItem = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  roleId?: string | null;
  createdAt: string;
};
type RoleItem = {
  id: string;
  name: string;
  description?: string | null;
  permissions: string;
  isSystem?: boolean;
};
type RoleForm = { name: string; description: string; permissions: string[] };
const emptyRole: RoleForm = { name: "", description: "", permissions: [] };

function parsePermissions(value: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

export default function V2UsersPage() {
  const t = useTranslations("dashboardV2");
  const tp = useTranslations("dashboardV2.pages.users");
  const locale = useLocale();

  const [tab, setTab] = useState<"users" | "roles">("users");
  const [users, setUsers] = useState<UserItem[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");

  const [permUser, setPermUser] = useState<UserItem | null>(null);
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);
  const [editingRole, setEditingRole] = useState<RoleItem | "new" | null>(null);
  const [roleForm, setRoleForm] = useState<RoleForm>(emptyRole);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const params = new URLSearchParams({ limit: "50" });
      if (query.trim()) params.set("search", query.trim());
      const data = await v2Api<{ users?: UserItem[]; total?: number }>(`/api/users?${params.toString()}`);
      setUsers(data.users ?? []);
      setUsersTotal(data.total ?? 0);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadRoles = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      setRoles(await v2Api<RoleItem[]>("/api/roles"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (tab === "users") void loadUsers();
    else void loadRoles();
  }, [tab, loadUsers, loadRoles]);

  async function changeRole(user: UserItem, role: string) {
    setBusy(true);
    try {
      await v2Api("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id, role }),
      });
      await loadUsers();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function removeUser(user: UserItem) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: user.id }),
      });
      await loadUsers();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  async function openPerms(user: UserItem) {
    setBusy(true);
    setFormError("");
    try {
      const list = await v2Api<{ permission: string; granted: boolean }[]>(`/api/users/${user.id}/permissions`);
      setSelectedPerms(list.filter((item) => item.granted).map((item) => item.permission));
      setPermUser(user);
    } catch {
      setFormError(t("saveFailed"));
      setPermUser(user);
    } finally {
      setBusy(false);
    }
  }

  async function savePerms(event: React.FormEvent) {
    event.preventDefault();
    if (!permUser) return;
    setBusy(true);
    setFormError("");
    try {
      await v2Api(`/api/users/${permUser.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ permissions: selectedPerms.map((permission) => ({ permission, granted: true })) }),
      });
      setPermUser(null);
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  function openNewRole() {
    setRoleForm(emptyRole);
    setFormError("");
    setEditingRole("new");
  }

  function openEditRole(role: RoleItem) {
    setRoleForm({ name: role.name, description: role.description ?? "", permissions: parsePermissions(role.permissions) });
    setFormError("");
    setEditingRole(role);
  }

  async function saveRole(event: React.FormEvent) {
    event.preventDefault();
    if (!roleForm.name.trim() || !editingRole) return;
    setBusy(true);
    setFormError("");
    try {
      const payload = { name: roleForm.name, description: roleForm.description, permissions: roleForm.permissions };
      if (editingRole === "new") {
        await v2Api("/api/roles", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        await v2Api("/api/roles", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editingRole.id, ...payload }),
        });
      }
      setEditingRole(null);
      await loadRoles();
    } catch {
      setFormError(t("saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  async function removeRole(role: RoleItem) {
    if (!window.confirm(t("confirmDelete"))) return;
    setBusy(true);
    try {
      await v2Api("/api/roles", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: role.id }),
      });
      await loadRoles();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  function permissionCheckbox(permission: Permission) {
    const checked = selectedPerms.includes(permission);
    return (
      <label key={permission} className="flex items-center gap-2 text-[11px] text-[#4d5a50]">
        <input
          type="checkbox"
          checked={checked}
          onChange={() => setSelectedPerms((prev) => checked ? prev.filter((p) => p !== permission) : [...prev, permission])}
          className="h-3.5 w-3.5 accent-[#1a5632]"
        />
        {t(`permissions.${permission}`)}
      </label>
    );
  }

  return (
    <V2Shell active="/dashboard/v2/users" section={t("breadcrumbUsers")}>
      <V2Intro title={tp("title")} note={tp("note")}>
        <div className="flex items-center gap-2">
          <div className="flex rounded-xl border border-[#e6ddc9] bg-white p-1 shadow-sm">
            {(["users", "roles"] as const).map((key) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-black transition-colors ${
                  tab === key ? "bg-[#123b24] text-white" : "text-[#6f7a70] hover:bg-[#f5ecd6]"
                }`}
              >
                {tp(`tabs.${key}`)}
              </button>
            ))}
          </div>
          {tab === "users" && (
            <div className="flex items-center gap-2 rounded-xl border border-[#e6ddc9] bg-white px-3 py-2 shadow-sm">
              <Search size={15} className="text-[#8a6a1f]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={tp("searchPlaceholder")}
                className="w-36 bg-transparent text-xs outline-none"
              />
            </div>
          )}
          {tab === "roles" && (
            <V2PrimaryButton label={tp("createRole")} onClick={openNewRole}>
              <Plus size={15} />
            </V2PrimaryButton>
          )}
          <button
            onClick={() => void (tab === "users" ? loadUsers() : loadRoles())}
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
      ) : tab === "users" ? (
        <V2Panel>
          <p className="mb-4 text-xs font-black text-[#1a5632]">
            {tp("total")}: {formatLocalizedDigits(usersTotal, locale)}
          </p>
          {users.length === 0 ? (
            <p className="py-10 text-center text-xs text-[#9aa399]">{tp("emptyUsers")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#e6ddc9] text-[11px] font-black text-[#9aa399]">
                    <th className="py-2.5 text-right">{tp("table.name")}</th>
                    <th className="py-2.5 text-right">{tp("table.email")}</th>
                    <th className="py-2.5 text-right">{tp("table.role")}</th>
                    <th className="py-2.5 text-right">{tp("table.joined")}</th>
                    <th className="py-2.5 text-right">{tp("table.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b border-[#f0ead9]">
                      <td className="py-3.5 font-bold text-[#203026]">{user.name || "—"}</td>
                      <td className="py-3.5 text-xs text-[#6f7a70]" dir="ltr">{user.email || "—"}</td>
                      <td className="py-3.5">
                        <select
                          disabled={busy}
                          value={user.role === "admin" || user.role === "member" ? user.role : "member"}
                          onChange={(e) => void changeRole(user, e.target.value)}
                          className="rounded-lg border border-[#e6ddc9] bg-white px-2 py-1 text-[11px] font-black text-[#1a5632]"
                        >
                          <option value="member">{tp("roles.member")}</option>
                          <option value="admin">{tp("roles.admin")}</option>
                        </select>
                      </td>
                      <td className="py-3.5 text-[10px] tabular-nums text-[#8a958b]">
                        {formatLocalizedDigits(user.createdAt.slice(0, 10), locale)}
                      </td>
                      <td className="py-3.5">
                        <div className="flex items-center gap-1.5">
                          <V2IconButton label={tp("permissions")} onClick={() => void openPerms(user)} disabled={busy}>
                            <KeyRound size={13} />
                          </V2IconButton>
                          <V2IconButton label={t("delete")} onClick={() => void removeUser(user)} danger disabled={busy}>
                            <Trash2 size={13} />
                          </V2IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </V2Panel>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {roles.length === 0 ? (
            <V2Message text={tp("emptyRoles")} />
          ) : (
            roles.map((role) => (
              <V2Panel key={role.id}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-sm font-black text-[#203026]">
                      <Shield size={15} className="text-[#8a6a1f]" />
                      {role.name}
                    </h2>
                    {role.description && <p className="mt-2 text-xs text-[#8a958b]">{role.description}</p>}
                    <p className="mt-2 text-[10px] text-[#9aa399]">
                      {tp("permissionCount")}: {formatLocalizedDigits(parsePermissions(role.permissions).length, locale)}
                    </p>
                  </div>
                  {!role.isSystem && (
                    <div className="flex items-center gap-1.5">
                      <V2IconButton label={t("edit")} onClick={() => openEditRole(role)} disabled={busy}>
                        <Pencil size={13} />
                      </V2IconButton>
                      <V2IconButton label={t("delete")} onClick={() => void removeRole(role)} danger disabled={busy}>
                        <Trash2 size={13} />
                      </V2IconButton>
                    </div>
                  )}
                </div>
              </V2Panel>
            ))
          )}
        </div>
      )}

      {permUser && (
        <V2Dialog title={tp("editPermissions")} closeLabel={t("close")} onClose={() => setPermUser(null)}>
          <form onSubmit={(event) => void savePerms(event)}>
            {formError && <V2FormError text={formError} />}
            <p className="mb-4 text-xs text-[#6f7a70]">{permUser.name || permUser.email}</p>
            <div className="max-h-[50vh] space-y-4 overflow-y-auto rounded-xl border border-[#f0ead9] p-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.module}>
                  <p className="mb-2 text-[11px] font-black text-[#8a6a1f]">{t(`modules.${group.module}`)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map(permissionCheckbox)}
                  </div>
                </div>
              ))}
            </div>
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setPermUser(null)}
            />
          </form>
        </V2Dialog>
      )}

      {editingRole && (
        <V2Dialog
          title={editingRole === "new" ? tp("createRole") : tp("editRole")}
          closeLabel={t("close")}
          onClose={() => setEditingRole(null)}
        >
          <form onSubmit={(event) => void saveRole(event)}>
            {formError && <V2FormError text={formError} />}
            <V2Field label={tp("fields.roleName")}>
              <input required disabled={editingRole !== "new"} value={roleForm.name} onChange={(e) => setRoleForm((prev) => ({ ...prev, name: e.target.value }))} className={v2InputClass} />
            </V2Field>
            <V2Field label={tp("fields.roleDescription")}>
              <input value={roleForm.description} onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))} className={v2InputClass} />
            </V2Field>
            <div className="max-h-[40vh] space-y-4 overflow-y-auto rounded-xl border border-[#f0ead9] p-4">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.module}>
                  <p className="mb-2 text-[11px] font-black text-[#8a6a1f]">{t(`modules.${group.module}`)}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.permissions.map((permission) => {
                      const checked = roleForm.permissions.includes(permission);
                      return (
                        <label key={permission} className="flex items-center gap-2 text-[11px] text-[#4d5a50]">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => setRoleForm((prev) => ({
                              ...prev,
                              permissions: checked
                                ? prev.permissions.filter((p) => p !== permission)
                                : [...prev.permissions, permission],
                            }))}
                            className="h-3.5 w-3.5 accent-[#1a5632]"
                          />
                          {t(`permissions.${permission}`)}
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-[#9aa399]">
              {tp("allCount")}: {formatLocalizedDigits(ALL_PERMISSIONS.length, locale)}
            </p>
            <V2FormActions
              saveLabel={t("save")}
              cancelLabel={t("cancel")}
              busy={busy}
              onCancel={() => setEditingRole(null)}
            />
          </form>
        </V2Dialog>
      )}
    </V2Shell>
  );
}
