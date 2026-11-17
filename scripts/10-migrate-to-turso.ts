/**
 * ترحيل قاعدة البيانات من SQLite المحلية (prisma/dev.db) إلى Turso.
 *
 * الاستخدام:
 *   1) ضع TURSO_DATABASE_URL و TURSO_AUTH_TOKEN في ملف .env (قيم حقيقية، ليست [SENSITIVE]).
 *   2) npm run db:migrate:turso
 *
 * ما يفعله:
 *   - يتحقق من الاتصال بـ Turso.
 *   - يولّد مخطط قاعدة البيانات (DDL) من prisma/schema.prisma وينفّذه على Turso.
 *   - ينسخ بيانات كل الجداول المحلية إلى Turso على دفعات.
 *   - يتحقق من تطابق عدد الصفوف في كل جدول.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { execFileSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";

const LOCAL_DB = path.resolve(process.cwd(), "prisma/dev.db");
const BATCH_SIZE = 100;

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function log(msg: string) {
  console.log(msg);
}

/**
 * تنظيف القيم القادمة من .env: إزالة علامات التنصيص، الأحرف غير اللاتينية (مثل حرف عربي
 * لُصق بالخطأ)، المسافات، والشرطة المائلة الأخيرة. بدون هذا يفشل الاتصال بـ Turso.
 */
function cleanSecret(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\/+$/, "");
}

async function main() {
  const url = cleanSecret(process.env.TURSO_DATABASE_URL);
  const token = cleanSecret(process.env.TURSO_AUTH_TOKEN);

  if (!url || !token || url === "[SENSITIVE]" || token === "[SENSITIVE]") {
    fail(
      "بيانات Turso غير موجودة في .env.\n" +
        "افتح ملف .env وضع القيم الحقيقية في:\n" +
        "  TURSO_DATABASE_URL=libsql://xxxx.turso.io\n" +
        "  TURSO_AUTH_TOKEN=eyJ..."
    );
  }
  // إن كان المستخدم لصق العنوان بدون بروتوكول (مثلاً sgn-prod-salim-grav.turso.io) نضيفه تلقائياً
  const finalUrl = /^[a-z]+:\/\//i.test(url) ? url : `libsql://${url}`;
  if (!/^(libsql|https?):\/\//.test(finalUrl)) {
    fail(`عنوان Turso غير صالح: ${url} (يجب أن يبدأ بـ libsql:// أو https://)`);
  }
  if (!fs.existsSync(LOCAL_DB)) {
    fail(`قاعدة البيانات المحلية غير موجودة: ${LOCAL_DB}`);
  }

  log("📂 المصدر: prisma/dev.db");
  log(`☁️  الهدف: ${finalUrl.replace(/\/\/.*@/, "//")}`);
  log("");

  const local = createClient({ url: `file:${LOCAL_DB}` });
  const turso = createClient({ url: finalUrl, authToken: token });

  // ١) التحقق من الاتصال
  try {
    await turso.execute("SELECT 1");
    log("✅ الاتصال بـ Turso ناجح");
  } catch (e: any) {
    fail(`تعذّر الاتصال بـ Turso: ${e.message}`);
  }

  // ٢) توليد مخطط قاعدة البيانات من Prisma
  log("\n🏗  توليد مخطط قاعدة البيانات من prisma/schema.prisma …");
  let ddl = "";
  try {
    const prismaCli = path.resolve(process.cwd(), "node_modules/prisma/build/index.js");
    // Prisma v7: الخيار --to-schema-datamodel أُزيل واستُبدل بـ --to-schema
    ddl = execFileSync(
      process.execPath,
      [
        prismaCli,
        "migrate",
        "diff",
        "--from-empty",
        "--to-schema",
        "./prisma/schema.prisma",
        "--script",
      ],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch (e: any) {
    fail(`فشل توليد المخطط: ${e.stderr?.toString() || e.message}`);
  }
  if (!ddl.trim()) fail("المخطط المولّد فارغ — تحقق من prisma/schema.prisma");

  // ٣) تنفيذ المخطط على Turso (مع تجاهل الأخطاء المتعلقة بالجداول الموجودة مسبقاً)
  const statements = ddl
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !/^--/.test(s) && !/^PRAGMA/i.test(s));

  log(`   تنفيذ ${statements.length} عبارة إنشاء على Turso …`);
  let created = 0;
  let skipped = 0;
  for (const stmt of statements) {
    try {
      await turso.execute(stmt);
      created++;
    } catch (e: any) {
      if (/already exists/i.test(e.message)) {
        skipped++;
      } else {
        console.warn(`   ⚠️ ${e.message}`);
      }
    }
  }
  log(`   ✅ تم التنفيذ (${created} جديد، ${skipped} موجود مسبقاً)`);

  // ٤) قائمة الجداول المحلية
  const tablesRes = await local.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
  );
  const tables = tablesRes.rows.map((r) => String(r.name));
  log(`\n📋 عدد الجداول: ${tables.length}`);

  // ٥) نسخ البيانات
  log("\n📦 نسخ البيانات …\n");
  let totalRows = 0;
  const problems: string[] = [];

  for (const table of tables) {
    try {
      const rowsRes = await local.execute(`SELECT * FROM "${table}"`);
      const rows = rowsRes.rows as Record<string, unknown>[];
      if (rows.length === 0) {
        log(`   - ${table}: 0`);
        continue;
      }

      const cols = Object.keys(rows[0]);
      const colList = cols.map((c) => `"${c}"`).join(", ");
      const placeholders = cols.map(() => "?").join(", ");
      const sql = `INSERT OR REPLACE INTO "${table}" (${colList}) VALUES (${placeholders})`;

      // مسح الجدول أولاً لتجنّب التكرار
      await turso.execute(`DELETE FROM "${table}"`);

      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH_SIZE) {
        const chunk = rows.slice(i, i + BATCH_SIZE);
        await turso.batch(
          chunk.map((row: Record<string, unknown>) => ({
            sql,
            args: cols.map((c) => (row[c] === undefined ? null : row[c])) as any[],
          })),
          "write"
        );
        inserted += chunk.length;
      }

      totalRows += inserted;
      log(`   - ${table}: ${inserted}`);
    } catch (e: any) {
      problems.push(`${table}: ${e.message}`);
      log(`   ⚠️ ${table}: فشل — ${e.message}`);
    }
  }

  // ٦) التحقق من الأعداد
  log("\n🔍 التحقق من عدد الصفوف …");
  let mismatches = 0;
  for (const table of tables) {
    try {
      const l = await local.execute(`SELECT COUNT(*) AS c FROM "${table}"`);
      const t = await turso.execute(`SELECT COUNT(*) AS c FROM "${table}"`);
      const lc = Number(l.rows[0].c);
      const tc = Number(t.rows[0].c);
      if (lc !== tc) {
        mismatches++;
        log(`   ⚠️ ${table}: محلي=${lc} / Turso=${tc}`);
      }
    } catch {
      /* تجاهل الجداول غير الموجودة في Turso */
    }
  }

  local.close();
  turso.close();

  log("\n════════════════════════════════════════");
  log(`✅ إجمالي الصفوف المنسوخة: ${totalRows}`);
  log(`📋 الجداول: ${tables.length}`);
  if (mismatches === 0 && problems.length === 0) {
    log("🎉 الترحيل مكتمل والبيانات متطابقة بالكامل");
  } else {
    log(`⚠️ جداول غير متطابقة: ${mismatches} | مشاكل: ${problems.length}`);
    for (const p of problems) log(`   - ${p}`);
    process.exitCode = 1;
  }
  log("════════════════════════════════════════\n");
}

main().catch((e) => fail(e?.message || String(e)));
