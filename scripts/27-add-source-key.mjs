#!/usr/bin/env node
/**
 * ترحيل Turso: إضافة عمود Post.sourceKey وتعبئته من وسم __key،
 * ثم إنشاء قيد فريد مركّب (sourceKey, locale).
 *
 * لماذا مركّب؟ الترجمات لنفس الخبر تتشارك المفتاح ذاته بين ar/en/nl،
 * فالقيد على sourceKey وحده يكسر الترجمات.
 *
 * idempotent: يمكن إعادة تشغيله بأمان.
 *   node --env-file=.env scripts/27-add-source-key.mjs --dry-run
 *   node --env-file=.env scripts/27-add-source-key.mjs
 */
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "");
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing");
  process.exit(1);
}
const client = createClient({ url, authToken });

function tagValue(tags, prefix) {
  for (const part of String(tags || "").split(",")) {
    const tag = part.trim();
    if (tag.startsWith(prefix)) return tag.slice(prefix.length);
  }
  return null;
}

async function run() {
  const info = await client.execute(`PRAGMA table_info("Post")`);
  const hasColumn = info.rows.some((r) => String(r.name) === "sourceKey");
  console.log(`sourceKeyColumn=${hasColumn}`);

  const rows = (
    await client.execute(
      hasColumn
        ? `SELECT id, locale, tags, sourceKey FROM "Post"`
        : `SELECT id, locale, tags, NULL AS sourceKey FROM "Post"`
    )
  ).rows;
  const planned = [];
  const owners = new Map();
  for (const row of rows) {
    const key = tagValue(row.tags, "__key:");
    const locale = String(row.locale || "ar");
    if (key) {
      const identity = `${locale}|${key}`;
      if (!owners.has(identity)) owners.set(identity, []);
      owners.get(identity).push(String(row.id));
    }
    if (key && String(row.sourceKey || "") !== key) {
      planned.push({ id: String(row.id), key });
    }
  }

  const duplicates = [...owners].filter(([, ids]) => ids.length > 1);
  console.log(`rows=${rows.length} toBackfill=${planned.length} duplicateKeys=${duplicates.length}`);
  if (duplicates.length) {
    console.error("DUPLICATES=" + JSON.stringify(duplicates.slice(0, 5)));
    throw new Error("هويات مكررة — لا يمكن وضع قيد فريد قبل حلّها"); // i18n-ignore — رسالة ترحيل إدارية
  }

  if (dryRun) {
    console.log("dry-run: بلا كتابة ولا قيد");
    await client.close();
    return;
  }

  if (!hasColumn) {
    await client.execute(`ALTER TABLE "Post" ADD COLUMN sourceKey TEXT`);
    console.log("column added");
  }

  for (let i = 0; i < planned.length; i += 100) {
    const chunk = planned.slice(i, i + 100).map((p) => ({
      sql: `UPDATE "Post" SET sourceKey = ? WHERE id = ?`,
      args: [p.key, p.id],
    }));
    await client.batch(chunk);
  }
  console.log(`backfilled=${planned.length}`);

  await client.execute(
    `CREATE UNIQUE INDEX IF NOT EXISTS "Post_sourceKey_locale_key" ON "Post"("sourceKey", "locale")`
  );
  console.log("unique index ready");

  const check = (
    await client.execute(
      `SELECT count(*) AS n FROM "Post" WHERE sourceKey IS NULL OR sourceKey = ''`
    )
  ).rows[0]?.n;
  const dupCheck = (
    await client.execute(
      `SELECT count(*) AS n FROM (SELECT sourceKey, locale FROM "Post" WHERE sourceKey IS NOT NULL GROUP BY sourceKey, locale HAVING count(*) > 1)`
    )
  ).rows[0]?.n;
  console.log(`verify missingKey=${check} duplicateKeys=${dupCheck}`);
  if (Number(check) > 0 || Number(dupCheck) > 0) throw new Error("التحقق بعد الترحيل فشل"); // i18n-ignore — رسالة ترحيل إدارية

  await client.close();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
