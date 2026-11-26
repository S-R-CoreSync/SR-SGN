import { NextRequest, NextResponse } from "next/server";
import { formatAuditMarkdown, runDuplicateAudit } from "@/lib/audit-duplicates";
import { sendAuditReportEmail } from "@/lib/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Weekly duplicate audit + admin email.
 * Triggered by the Sunday job in .github/workflows/sync.yml using CRON_SECRET.
 * Reuses the Vercel SMTP_* variables, so no new GitHub secret is required.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const header = req.headers.get("x-cron-secret");
  const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "").trim();
  if (!secret || (header !== secret && bearer !== secret)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const report = await runDuplicateAudit();
    const emailed = await sendAuditReportEmail(report);
    return NextResponse.json({
      status: report.problems === 0 ? "ok" : "problems",
      total: report.total,
      problems: report.problems,
      emailed,
      report: formatAuditMarkdown(report),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "audit failed", detail: String((error as Error)?.message || error).slice(0, 200) },
      { status: 500 }
    );
  }
}

export const GET = handle;
export const POST = handle;
