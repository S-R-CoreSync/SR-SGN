import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";

export interface AIUsageInput {
  userId?: string | null;
  route: string;
  provider?: string | null;
  model?: string | null;
  locale?: string | null;
  status?: string;
  latencyMs?: number;
  error?: string | null;
}

/** تسجيل استخدام الذكاء الاصطناعي دون إيقاف الميزة عند أي خلل في قاعدة البيانات. */
export async function logAIUsage(input: AIUsageInput): Promise<void> {
  try {
    await prisma.aIUsage.create({
      data: {
        userId: input.userId ?? null,
        route: input.route.slice(0, 160),
        provider: input.provider?.slice(0, 80) ?? null,
        model: input.model?.slice(0, 120) ?? null,
        locale: input.locale?.slice(0, 20) ?? null,
        status: input.status ?? "success",
        latencyMs: Math.max(0, Math.round(input.latencyMs ?? 0)),
        error: input.error?.slice(0, 500) ?? null,
      },
    });
  } catch (error) {
    logger.warn("AIUsage", "Could not record AI usage", error instanceof Error ? error.message : "unknown");
  }
}

/** ملخّص حقيقي للوحة الذكاء — كل الأرقام محسوبة من الجداول، لا قيم ثابتة. */
export async function getAIOpsSummary() {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [total, failed, avg, recent, byProvider, pendingApprovals, approvals] = await Promise.all([
    prisma.aIUsage.count({ where: { createdAt: { gte: since } } }),
    prisma.aIUsage.count({ where: { createdAt: { gte: since }, status: "error" } }),
    prisma.aIUsage.aggregate({ where: { createdAt: { gte: since } }, _avg: { latencyMs: true } }),
    prisma.aIUsage.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.aIUsage.groupBy({ by: ["provider"], where: { createdAt: { gte: since } }, _count: { _all: true } }),
    prisma.aIApproval.count({ where: { status: "pending" } }),
    prisma.aIApproval.findMany({
      where: { status: "pending" },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  return {
    windowDays: 7,
    total,
    failed,
    avgLatencyMs: Math.round(avg._avg.latencyMs ?? 0),
    byProvider: byProvider.map((row) => ({ provider: row.provider || "unknown", count: row._count._all })),
    recent: recent.map((row) => ({
      id: row.id,
      route: row.route,
      provider: row.provider,
      model: row.model,
      status: row.status,
      latencyMs: row.latencyMs,
      createdAt: row.createdAt.toISOString(),
    })),
    pendingApprovals,
    approvals: approvals.map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      payload: row.payload,
      createdAt: row.createdAt.toISOString(),
    })),
  };
}
