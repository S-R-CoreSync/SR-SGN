import { prisma } from "@/lib/db";

/**
 * أدوات الذكاء المسموحة: قائمة بيضاء صغيرة، للقراءة فقط عدا طلب الموافقة
 * الذي يُنشئ سجلاً ولا ينفّذ أي نشر أو إرسال مباشر.
 */

export const AI_TOOL_NAMES = [
  "search_news",
  "upcoming_events",
  "community_stats",
  "request_statement",
] as const;

export type AIToolName = (typeof AI_TOOL_NAMES)[number];

export type AIToolResult = {
  ok: boolean;
  data?: unknown;
  approvalId?: string;
  error?: string;
};

function asText(value: unknown, max = 200): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export function isAIToolName(name: unknown): name is AIToolName {
  return typeof name === "string" && (AI_TOOL_NAMES as readonly string[]).includes(name);
}

export async function runAITool(name: AIToolName, rawInput: unknown, userId?: string | null): Promise<AIToolResult> {
  const input = (rawInput && typeof rawInput === "object" ? rawInput : {}) as Record<string, unknown>;

  switch (name) {
    case "search_news": {
      const query = asText(input.query, 120);
      if (!query) return { ok: false, error: "missing_query" };
      const posts = await prisma.post.findMany({
        where: {
          published: true,
          OR: [{ title: { contains: query } }, { excerpt: { contains: query } }],
        },
        select: { id: true, title: true, excerpt: true, slug: true, createdAt: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });
      return { ok: true, data: posts };
    }

    case "upcoming_events": {
      const events = await prisma.event.findMany({
        where: { published: true, date: { gte: new Date() } },
        select: { id: true, title: true, date: true, location: true, city: true },
        orderBy: { date: "asc" },
        take: 5,
      });
      return { ok: true, data: events };
    }

    case "community_stats": {
      const [members, posts, events, volunteers] = await Promise.all([
        prisma.member.count(),
        prisma.post.count({ where: { published: true } }),
        prisma.event.count({ where: { published: true } }),
        prisma.volunteer.count(),
      ]);
      return { ok: true, data: { members, posts, events, volunteers } };
    }

    case "request_statement": {
      const title = asText(input.title, 200);
      const body = asText(input.body, 8000);
      if (!title || !body) return { ok: false, error: "missing_fields" };
      const approval = await prisma.aIApproval.create({
        data: {
          kind: "statement",
          title,
          payload: JSON.stringify({ body }),
          status: "pending",
          requestedBy: userId ?? null,
        },
        select: { id: true },
      });
      // لا ننشر ولا نرسل شيئاً هنا — الموافقة وحدها تفتح الباب لخطوة لاحقة.
      return { ok: true, approvalId: approval.id, data: { status: "pending" } };
    }

    default:
      return { ok: false, error: "unknown_tool" };
  }
}
