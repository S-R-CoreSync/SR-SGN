import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logger } from "@/lib/logger";
import { createRateLimiter } from "@/lib/rate-limit";
import { tooMany } from "@/lib/request-guard";
import { getAIOpsSummary, logAIUsage } from "@/lib/ai/usage";
import { isAIToolName, runAITool } from "@/lib/ai/tools";

export const runtime = "nodejs";

const opsLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000, name: "ai-ops" });

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user?.role !== "admin") return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  return { userId: String(session.user?.id || "") };
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;
  try {
    return NextResponse.json({ success: true, ...(await getAIOpsSummary()) });
  } catch (error) {
    logger.error("API/dashboard/ai/ops", error);
    return NextResponse.json({ error: "Could not load AI operations" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (auth.error) return auth.error;

  const limited = tooMany(opsLimiter, auth.userId || "anon");
  if (limited) return limited;

  const started = Date.now();
  let status = "success";
  let errorText: string | null = null;

  try {
    const body = (await req.json()) as Record<string, unknown>;
    const action = body.action;

    if (action === "run_tool") {
      if (!isAIToolName(body.tool)) {
        return NextResponse.json({ error: "unknown_tool" }, { status: 400 });
      }
      const result = await runAITool(body.tool, body.input, auth.userId);
      status = result.ok ? "success" : "error";
      errorText = result.error ?? null;
      return NextResponse.json({ success: result.ok, tool: body.tool, ...result });
    }

    if (action === "review") {
      const id = typeof body.id === "string" ? body.id : "";
      const decision = body.decision === "approve" ? "approved" : body.decision === "reject" ? "rejected" : "";
      if (!id || !decision) {
        return NextResponse.json({ error: "invalid_request" }, { status: 400 });
      }
      const updated = await prisma.aIApproval.updateMany({
        where: { id, status: "pending" },
        data: {
          status: decision,
          reviewedBy: auth.userId || null,
          reviewNote: typeof body.note === "string" ? body.note.slice(0, 500) : null,
          reviewedAt: new Date(),
        },
      });
      if (updated.count === 0) {
        status = "error";
        errorText = "not_found_or_reviewed";
        return NextResponse.json({ error: errorText }, { status: 404 });
      }
      return NextResponse.json({ success: true, id, status: decision });
    }

    status = "error";
    errorText = "invalid_action";
    return NextResponse.json({ error: errorText }, { status: 400 });
  } catch (error) {
    status = "error";
    errorText = error instanceof Error ? error.message.slice(0, 300) : "unknown_error";
    logger.error("API/dashboard/ai/ops", error);
    return NextResponse.json({ error: "AI operations request failed" }, { status: 500 });
  } finally {
    await logAIUsage({
      userId: auth.userId,
      route: "/api/dashboard/ai/ops",
      status,
      latencyMs: Date.now() - started,
      error: errorText,
    });
  }
}
