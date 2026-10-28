import type { Permission } from "./permissions";
import { hasPermission, getRolePermissions, getModuleFromPermission } from "./permissions";

// Re-exported for backward compatibility: this is a pure utility with no
// server/DB dependency, so it lives in permissions.ts, but existing callers
// import it from this module.
export { getModuleFromPermission };

// `prisma` is imported lazily (rather than at module scope) so that pure,
// DB-free helpers in this file (like `getModuleFromPermission`) can be
// imported/tested without requiring a generated Prisma client to be present.
async function getPrisma() {
  const { prisma } = await import("@/lib/db");
  return prisma;
}

export async function authorize(
  userId: string | undefined,
  permission: Permission
): Promise<boolean> {
  if (!userId) return false;

  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      role: true,
      permissions: { where: { granted: true }, select: { permission: true } },
    },
  });

  if (!user) return false;
  if (user.role === "admin") return true;

  const explicitPerms = user.permissions.map((p: { permission: string }) => p.permission);
  return hasPermission(user.role, explicitPerms, permission);
}

export type PrivilegeChangeCheck = { ok: true } | { ok: false; status: number; error: string };

const DENY: PrivilegeChangeCheck = { ok: false, status: 403, error: "Forbidden" };

/**
 * Privilege ceiling for user-management mutations.
 *
 * Holding `users.edit_role` alone is not sufficient to change privileges. Unless the
 * actor is a persisted administrator, the actor:
 *  - may not modify their own role or permissions,
 *  - may not modify an administrator account,
 *  - may not grant the `admin` role, nor any role / permission they do not already hold.
 * Administrators are unrestricted, as before.
 */
export async function checkPrivilegeChange(opts: {
  actorId: string;
  targetId: string;
  role?: unknown;
  roleId?: unknown;
  permissions?: string[];
}): Promise<PrivilegeChangeCheck> {
  const { actorId, targetId, role, roleId, permissions } = opts;

  const prisma = await getPrisma();
  const actor = await prisma.user.findUnique({
    where: { id: actorId },
    select: {
      role: true,
      permissions: { where: { granted: true }, select: { permission: true } },
    },
  });
  if (!actor) return DENY;
  if (actor.role === "admin") return { ok: true };

  if (actorId === targetId) return DENY;

  const target = await prisma.user.findUnique({ where: { id: targetId }, select: { role: true } });
  if (!target) return { ok: false, status: 404, error: "Not found" };
  if (target.role === "admin") return DENY;

  const held = new Set<string>([
    ...getRolePermissions(actor.role),
    ...actor.permissions.map((p: { permission: string }) => p.permission),
  ]);
  const withinCeiling = (perms: string[]) => perms.every((p) => held.has(p));

  if (role !== undefined) {
    if (typeof role !== "string" || role === "admin") return DENY;
    if (!withinCeiling(getRolePermissions(role))) return DENY;
  }

  if (roleId !== undefined && roleId !== null) {
    if (typeof roleId !== "string") return DENY;
    const customRole = await prisma.role.findUnique({
      where: { id: roleId },
      select: { name: true, permissions: true },
    });
    if (!customRole || customRole.name === "admin") return DENY;
    let rolePerms: string[] = [];
    try {
      const parsed = JSON.parse(customRole.permissions);
      if (Array.isArray(parsed)) rolePerms = parsed.filter((p): p is string => typeof p === "string");
    } catch {
      return DENY;
    }
    if (!withinCeiling([...rolePerms, ...getRolePermissions(customRole.name)])) return DENY;
  }

  if (permissions && !withinCeiling(permissions)) return DENY;

  return { ok: true };
}
