// scripts/sync-translations-to-turso.cjs
// Copy translated columns from local dev.db to production Turso (batched).
require("dotenv/config");
const { createClient } = require("@libsql/client");

const clean = (v) => (v || "").trim().replace(/[^\x20-\x7E]/g, "");

const local = createClient({ url: "file:./prisma/dev.db" });
const remote = createClient({
  url: clean(process.env.TURSO_DATABASE_URL),
  authToken: clean(process.env.TURSO_AUTH_TOKEN),
});

(async () => {
  const rows = await local.execute(
    "SELECT id, titleNl, titleEn, summary FROM Post WHERE titleNl IS NOT NULL"
  );
  console.log("rows to sync:", rows.rows.length);

  const batch = [];
  for (const r of rows.rows) {
    batch.push({
      sql: 'UPDATE "Post" SET "titleNl" = ?, "titleEn" = ?, "summary" = ? WHERE "id" = ?',
      args: [r.titleNl, r.titleEn, r.summary, r.id],
    });
  }

  // 50 per batch to stay under request limits
  for (let i = 0; i < batch.length; i += 50) {
    await remote.batch(batch.slice(i, i + 50));
    console.log("  synced " + Math.min(i + 50, batch.length) + "/" + batch.length);
  }

  const check = await remote.execute(
    "SELECT COUNT(*) AS c FROM Post WHERE titleNl IS NOT NULL"
  );
  console.log("Turso translated rows:", check.rows[0].c);
  local.close();
  remote.close();
})().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
