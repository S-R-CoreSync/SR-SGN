#!/usr/bin/env node
/**
 * scripts/20-push-data.mjs
 *
 * نسخ آمن من SQLite المحلي إلى Turso:
 *   - يستخدم UPSERT حسب المفتاح الأساسي، ولا يمسح الجداول أبداً.
 *   - الصفوف الموجودة في الإنتاج فقط تبقى كما هي (عكس copy-local-to-turso القديم).
 *   - يطلب تأكيداً صريحاً إلا مع --force (يستخدمه أمر ship).
 *
 * الاستخدام:
 *   npm run data:push                       # معاينة + تأكيد
 *   npm run data:push -- --dry-run          # معاينة فقط بلا كتابة
 *   npm run data:push -- --tables=Post,Event
 *   npm run data:push:force                 # للاستخدام داخل ship
 */

import { createClient } from "@libsql/client";
import { createInterface } from "node:readline/promises";
import "dotenv/config";

// جداول المحتوى فقط. جداول الهوية/الجلسات/المجلس مستبعدة عمداً لأن معرّفاتها
// تختلف بين المحلي وTurso، ونسخها قد ينشئ حسابات أو أعضاء مكررين.
const DEFAULT_TABLES = [
  "Post", "Task", "Contact", "Comment", "Event", "Subscriber",
  "Volunteer", "Member", "MemberView", "AppSetting", "Notification",
  "Survey", "SurveyOption", "SurveyVote", "Favorite", "LandingPage",
  "Guide", "EventRegistration", "TaskApplication", "MobileTranslation",
  "MemberDocument", "ServiceReview",
];

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const force = args.includes("--force");
const tablesArg = args.find((a) => a.startsWith("--tables="));
const tables = tablesArg
  ? tablesArg.slice("--tables=".length).split(",").map((t) => t.trim()).filter(Boolean)
  : DEFAULT_TABLES;

function cleanEnv(value) {
  return (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

const rawUrl = cleanEnv(process.env.TURSO_DATABASE_URL);
const authToken = cleanEnv(process.env.TURSO_AUTH_TOKEN);
const url = rawUrl && !/^[a-z]+:\/\//i.test(rawUrl) ? `libsql://${rawUrl}` : rawUrl;

if (!url || !authToken) {
  console.error("❌ TURSO_DATABASE_URL / TURSO_AUTH_TOKEN غير مضبوطين في .env");
  process.exit(1);
}

const local = createClient({ url: "file:./prisma/dev.db" });
const remote = createClient({ url, authToken });

async function primaryKeys(client, table) {
  const info = await client.execute({ sql: `PRAGMA table_info("${table}")`, args: [] });
  return info.rows
    .filter((r) => Number(r.pk) > 0)
    .sort((a, b) => Number(a.pk) - Number(b.pk))
    .map((r) => String(r.name));
}

async function planTable(table) {
  const rows = await local.execute(`SELECT * FROM "${table}"`);
  if (rows.rows.length === 0) return { table, count: 0, skipped: "فارغ" };

  const cols = Object.keys(rows.rows[0]);
  const pk = await primaryKeys(local, table);
  if (pk.length === 0) return { table, count: rows.rows.length, skipped: "لا مفتاح أساسي" };

  const colList = cols.map((c) => `"${c}"`).join(", ");
  const placeholders = cols.map(() => "?").join(", ");
  const conflict = pk.map((c) => `"${c}"`).join(", ");
  const updates = cols.filter((c) => !pk.includes(c));
  const doUpdate = updates.length
    ? `DO UPDATE SET ${updates.map((c) => `"${c}"=excluded."${c}"`).join(", ")}`
    : "DO NOTHING";

  return {
    table,
    count: rows.rows.length,
    sql: `INSERT INTO "${table}" (${colList}) VALUES (${placeholders}) ON CONFLICT(${conflict}) ${doUpdate}`,
    cols,
    rows: rows.rows,
  };
}

async function writeTable(plan) {
  const pk = await primaryKeys(remote, plan.table);
  if (pk.length === 0) throw new Error(`الجدول ${plan.table} غير موجود في Turso — شغّل prisma db push أولاً`);

  let written = 0;
  for (const row of plan.rows) {
    const args = plan.cols.map((c) => row[c] ?? null);
    await remote.execute({ sql: plan.sql, args });
    written++;
  }
  return written;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  🔄 نسخ آمن للبيانات: SQLite المحلي ←→ Turso الإنتاج      ║");
  console.log("╚════════════════════════════════════════════════════════════╝\n");

  const plans = [];
  for (const table of tables) {
    try {
      plans.push(await planTable(table));
    } catch (e) {
      console.log(`  ⚠️ ${table}: ${String(e.message).slice(0, 90)}`);
    }
  }

  const writable = plans.filter((p) => p.sql);
  const total = writable.reduce((n, p) => n + p.count, 0);
  for (const p of plans) {
    console.log(`  ${p.sql ? "✓" : "–"} ${p.table}: ${p.count} صف${p.skipped ? ` (${p.skipped})` : ""}`);
  }
  console.log(`\nالإجمالي القابل للكتابة: ${total} صف في ${writable.length} جدول`);
  console.log("الطريقة: UPSERT — لا يتم حذف أي صف موجود في الإنتاج.");
  console.log("تنبيه: إن اختلفت المعرّفات بين dev.db وTurso قد تظهر صفوف مكرّرة — راجع --dry-run أولاً.\n");

  if (dryRun) {
    console.log("وضع المعاينة فقط — لم تُكتب أي بيانات.");
    return;
  }
  if (total === 0) {
    console.log("لا شيء للنسخ.");
    return;
  }
  if (!force) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const answer = await rl.question("اكتب yes للمتابعة: ");
    rl.close();
    if (answer.trim().toLowerCase() !== "yes") {
      console.log("أُلغي.");
      return;
    }
  }

  let written = 0;
  for (const plan of writable) {
    try {
      const n = await writeTable(plan);
      written += n;
      console.log(`  ✅ ${plan.table}: ${n} صف`);
    } catch (e) {
      console.error(`  ❌ ${plan.table}: ${String(e.message).slice(0, 140)}`);
      process.exitCode = 1;
    }
  }
  console.log(`\n✅ تمّ نسخ ${written} صف إلى Turso (UPSERT، بلا حذف).`);
}

main()
  .catch((e) => {
    console.error("❌", e);
    process.exitCode = 1;
  })
  .finally(() => {
    local.close();
    remote.close();
  });
