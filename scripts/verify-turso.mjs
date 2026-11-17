import "dotenv/config";
import { createClient } from "@libsql/client";

const local = createClient({ url: "file:./prisma/dev.db" });
const u = process.env.TURSO_DATABASE_URL.trim().replace(/[^\x20-\x7E]/g, "");
const t = process.env.TURSO_AUTH_TOKEN.trim().replace(/[^\x20-\x7E]/g, "");
const turso = createClient({ url: u, authToken: t });

const tables = (await local.execute(
  "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_prisma_%' ORDER BY name"
)).rows.map((r) => String(r.name));

let bad = 0;
for (const table of tables) {
  try {
    const lc = Number((await local.execute(`SELECT COUNT(*) AS c FROM "${table}"`)).rows[0].c);
    const tc = Number((await turso.execute(`SELECT COUNT(*) AS c FROM "${table}"`)).rows[0].c);
    const ok = lc === tc;
    if (!ok) bad++;
    console.log(`${ok ? "✅" : "⚠️ "} ${table}: محلي=${lc} / Turso=${tc}`);
  } catch (e) {
    bad++;
    console.log(`❌ ${table}: ${e.message}`);
  }
}

console.log("");
console.log(bad === 0 ? "🎉 جميع الجداول متطابقة" : `⚠️ ${bad} جدول غير متطابق`);
local.close();
turso.close();
process.exitCode = bad === 0 ? 0 : 1;
