import { prisma } from "@/lib/db";

/**
 * أدوات إدارة بيانات التواصل والربط لأعضاء مجلس الإدارة.
 *
 * القاعدة: بيانات التواصل (البريد/الجوال) لا تُعرض للزوار، بل للمشرف فقط،
 * والربط بين عضو اللوحة وحساب الموقع يتم عبر البريد (أو يدوياً من اللوحة).
 */

export const BOARD_ROLES = ["admin", "moderator", "contributor", "member"] as const;
export type BoardRole = (typeof BOARD_ROLES)[number];

export function normalizeRole(value: unknown): BoardRole {
  return BOARD_ROLES.includes(value as BoardRole) ? (value as BoardRole) : "member";
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizePhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const phone = value.replace(/[\s\-()]/g, "").trim();
  return /^\+?[0-9]{8,16}$/.test(phone) ? phone : null;
}

const WRITABLE_FIELDS = [
  "nameAr", "nameEn", "titleAr", "titleEn", "image", "website", "kvkNumber",
  "isFounder", "isLicensing", "committees", "bioPoints",
  "email", "phone", "userId", "role",
] as const;

/** يمنع تمرير حقول حساسة مثل id/createdAt من الواجهة إلى قاعدة البيانات. */
export function sanitizeBoardInput(body: Record<string, any>): Record<string, unknown> {
  const data: Record<string, unknown> = {};

  for (const field of WRITABLE_FIELDS) {
    if (!(field in body)) continue;
    data[field] = body[field];
  }

  if ("email" in data) data.email = normalizeEmail(data.email);
  if ("phone" in data) data.phone = normalizePhone(data.phone);
  if ("role" in data) data.role = normalizeRole(data.role);
  if ("userId" in data && typeof data.userId !== "string") data.userId = null;
  if ("committees" in data && Array.isArray(data.committees)) data.committees = JSON.stringify(data.committees);
  if ("bioPoints" in data && Array.isArray(data.bioPoints)) data.bioPoints = JSON.stringify(data.bioPoints);

  return data;
}

export interface LinkedAccount {
  id: string;
  name: string | null;
  email: string;
  role: string;
}

/** بحث غير حساس لحالة الأحرف (SQLite/Turso لا يدعم mode: insensitive). */
export async function findUserByEmail(email: string | null | undefined): Promise<LinkedAccount | null> {
  if (!email) return null;
  const target = email.toLowerCase();
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
  });
  const match = users.find((u) => u.email?.toLowerCase() === target);
  return match || null;
}

/** يربط العضو بحسابه ويمنح الحساب الدور المحدد في سجل اللوحة. */
export async function linkBoardMemberToUser(
  memberId: string,
  userId: string,
  role: string
): Promise<LinkedAccount | null> {
  const account = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true },
  });
  if (!account) return null;

  await (prisma as any).boardMember.update({
    where: { id: memberId },
    data: { userId, role: normalizeRole(role) },
  });

  // حماية: الربط لا يُخفّض صلاحية حساب إداري موجود بالخطأ؛
  // تغيير دور حساب إلى أدنى يتم صراحةً من لوحة المستخدمين.
  const nextRole = normalizeRole(role);
  if (account.role !== nextRole && !(account.role === "admin" && nextRole !== "admin")) {
    await prisma.user.update({ where: { id: userId }, data: { role: nextRole } });
    account.role = nextRole;
  }
  return account;
}

/**
 * يُستدعى بعد إضافة/تعديل عضو: يربطه تلقائياً بحساب موجود بنفس البريد
 * ويمنحه الدور المحدد، حتى لو لم يضغط المشرف زر الربط يدوياً.
 */
export async function autoLinkByEmail(memberId: string, email: string | null | undefined, role: string) {
  if (!email) return null;
  const account = await findUserByEmail(email);
  if (!account) return null;
  return linkBoardMemberToUser(memberId, account.id, role);
}

/** بيانات الحسابات المرتبطة — تُستخدم في لوحة المشرف فقط. */
export async function getLinkedAccounts(userIds: string[]): Promise<Record<string, LinkedAccount>> {
  if (userIds.length === 0) return {};
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, role: true },
  });
  return Object.fromEntries(users.map((u) => [u.id, u]));
}
