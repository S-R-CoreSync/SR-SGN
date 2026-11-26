#!/usr/bin/env node
/**
 * تدقيق أسبوعي/دوري لمنع رجوع تكرار الأخبار والصور.
 * يقرأ قاعدة الإنتاج فقط (لا يكتب فيها شيئاً) ويبلّغ عن:
 *   1) أخبار بلا هوية ثابتة (__key)
 *   2) هويات مكررة داخل نفس اللغة (خبر مخفي بالـ dedup)
 *   3) روابط صورة واحدة تخص أكثر من خبر (صورة قناة/شعار)
 *
 * التشغيل: npm run audit:dedup
 * يكتب تقرير Markdown إلى $GITHUB_STEP_SUMMARY عند وجوده،
 * ويرجع exit 1 إذا وُجدت مشاكل حتى يصل تنبيه GitHub Actions.
 */
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatAuditMarkdown, runDuplicateAudit } from "../src/lib/audit-duplicates";

const root = process.cwd();
if (existsSync(resolve(root, ".env"))) {
  for (const line of readFileSync(resolve(root, ".env"), "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
    if (match && process.env[match[1]] === undefined) {
      process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "").trim();
    }
  }
}

async function main() {
  const report = await runDuplicateAudit();
  const text = formatAuditMarkdown(report);
  console.log(text);

  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, text + "\n");

  if (report.problems > 0) {
    console.error(`::error::تدقيق التكرار: ${report.problems} مشكلة تحتاج مراجعة`);
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error("audit failed:", error);
  process.exitCode = 1;
});
