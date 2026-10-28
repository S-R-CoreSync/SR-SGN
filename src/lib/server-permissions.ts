import type { Permission } from "./permissions";
import { hasPermission } from "./permissions";

// `@/lib/db` eagerly instantiates the Prisma client, which requires a
// generated client on disk. The functions below are only ever called from
// server (API route) contexts, so the dependency is loaded lazily on first
// use. This keeps pure helpers in this module (e.g. getModuleFromPermission)
// importable in isolation (e.g. from unit tests) without requiring a
// generated Prisma client.
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

/**
 * Returns true only when the user's current role in the database is "admin".
 * Used for highly sensitive resources (e.g. government ID documents) that must
 * not be reachable through delegable, role-based permissions.
 */
export async function isAdminUser(userId: string | undefined): Promise<boolean> {
  if (!userId) return false;
  const prisma = await getPrisma();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role === "admin";
}

export function getModuleFromPermission(perm: Permission): string {
  return perm.split(".")[0];
}
