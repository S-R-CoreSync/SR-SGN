import "dotenv/config";
import { createClient } from "@libsql/client";

/**
 * يضيف جداول طبقة الذكاء إلى Turso بشكل آمن ومتكرر (idempotent).
 * لا يحذف ولا يعدّل أي جدول موجود، ولا يطبع أي سر.
 * التشغيل: node --env-file=.env scripts/29-ensure-ai-tables.mjs
 */

function clean(value) {
  return (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

const rawUrl = clean(process.env.TURSO_DATABASE_URL);
const token = clean(process.env.TURSO_AUTH_TOKEN);
const url = rawUrl && !/^[a-z]+:\/\//i.test(rawUrl) ? `libsql://${rawUrl}` : rawUrl;

if (!url || !token) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN غير موجودين في البيئة.");
  process.exit(1);
}

const client = createClient({ url, authToken: token });

const statements = [
  `CREATE TABLE IF NOT EXISTS "AIUsage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT,
    "route" TEXT NOT NULL,
    "provider" TEXT,
    "model" TEXT,
    "locale" TEXT,
    "status" TEXT NOT NULL DEFAULT 'success',
    "latencyMs" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  )`,
  `CREATE TABLE IF NOT EXISTS "AIApproval" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "kind" TEXT NOT NULL,
    "title" TEXT,
    "payload" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "requestedBy" TEXT,
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" DATETIME
  )`,
  `CREATE INDEX IF NOT EXISTS "AIUsage_createdAt_idx" ON "AIUsage"("createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AIUsage_userId_createdAt_idx" ON "AIUsage"("userId", "createdAt")`,
  `CREATE INDEX IF NOT EXISTS "AIApproval_status_createdAt_idx" ON "AIApproval"("status", "createdAt")`,
];

for (const sql of statements) {
  await client.execute(sql);
}

for (const table of ["AIUsage", "AIApproval"]) {
  const info = await client.execute({ sql: `PRAGMA table_info("${table}")`, args: [] });
  const count = await client.execute({ sql: `SELECT COUNT(*) AS c FROM "${table}"`, args: [] });
  console.log(`${table}: ${info.rows.length} columns, ${Number(count.rows[0].c)} rows (بدون حذف)`);
}

client.close();
