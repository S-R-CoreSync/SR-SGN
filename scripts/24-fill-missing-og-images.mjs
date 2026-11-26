#!/usr/bin/env node
/**
 * يملأ الأخبار بلا صورة بصورة og:image الحقيقية من صفحة المصدر.
 * النقطة المهمة: لا يكتب صورة مشتركة بين خبرين مختلفين،
 * ولا صور شعارات/أيقونات/صفوفات عامة — وإلا رجعنا لمشكلة التكرار.
 *
 * التشغيل:
 *   node --env-file=.env scripts/24-fill-missing-og-images.mjs --dry-run --limit=10
 *   node --env-file=.env scripts/24-fill-missing-og-images.mjs
 * الخيارات: --limit=N  --dry-run  --source=اسم_المصدر
 */
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const argValue = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const limit = parseInt(argValue("limit") || "0", 10) || 0;
const dryRun = args.includes("--dry-run");
const sourceFilter = argValue("source") || "";
const CONCURRENCY = 2;
const DELAY_MS = 800;
const RETRIES = 3;

const url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "");
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing");
  process.exit(1);
}
const client = createClient({ url, authToken });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function tagValue(tags, prefix) {
  for (const part of String(tags || "").split(",")) {
    const tag = part.trim();
    if (tag.startsWith(prefix)) return tag.slice(prefix.length);
  }
  return null;
}

function sourceLink(tags) {
  const raw = tagValue(tags, "__source:");
  if (!raw) return null;
  const idx = raw.indexOf(":");
  if (idx < 0) return null;
  const link = raw.slice(idx + 1).trim().replace(/^http:\/\//, "https://");
  if (!/^https?:\/\//i.test(link)) return null;
  // خلاصة RSS أو صفحة المصدر الرئيسية ليست صفحة خبر — og:image فيها شعار.
  if (/(?:\/rss(?:[/?]|$)|[?&]feed=|wp-json|\/feed(?:\/|$))/i.test(link)) return null;
  try {
    const parsed = new URL(link);
    if (parsed.pathname.replace(/\/$/, "") === "") return null;
  } catch {
    return null;
  }
  return link;
}

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::url)?["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (!m) continue;
    const image = m[1].replace(/&amp;/g, "&").trim();
    if (!/^https?:\/\//i.test(image)) continue;
    if (/(?:logo|favicon|icon|placeholder|default|avatar|share|sgn_02)/i.test(image)) continue;
    return image;
  }
  return null;
}

async function fetchOgImage(link) {
  let referer = "https://www.google.com/";
  try { referer = new URL(link).origin + "/"; } catch {}
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    try {
      const res = await fetch(link, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          Referer: referer,
        },
      });
      if ((res.status === 406 || res.status === 429) && attempt < RETRIES) {
        await sleep(1200 * (attempt + 1) + Math.floor(Math.random() * 600));
        continue;
      }
      if (!res.ok) return { error: `HTTP ${res.status}` };
      const image = extractOgImage(await res.text());
      return image ? { image } : { error: "no og:image" };
    } catch (e) {
      if (attempt === RETRIES) return { error: String(e?.message || e).slice(0, 120) };
      await sleep(800 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: "retries exhausted" };
}

async function main() {
  const where = `(image IS NULL OR image = '')`;
  const sql = `SELECT id, title, tags, locale, source FROM Post
    WHERE ${where}${sourceFilter ? ` AND source = '${sourceFilter.replace(/'/g, "''")}'` : ""}
    ORDER BY createdAt DESC ${limit ? `LIMIT ${limit}` : ""}`;
  const rows = (await client.execute(sql)).rows;

  // صورة مستخدمة فعلاً من خبر khác (مفتاح مختلف) لا تُستعار أبداً
  const imageOwners = new Map();
  for (const row of (await client.execute("SELECT image, tags FROM Post WHERE image IS NOT NULL AND image <> ''")).rows) {
    const image = String(row.image).trim();
    const key = tagValue(row.tags, "__key:") || row.id;
    if (!imageOwners.has(image)) imageOwners.set(image, new Set());
    imageOwners.get(image).add(String(key));
  }

  console.log(`empty posts: ${rows.length}${sourceFilter ? ` (source=${sourceFilter})` : ""}`);
  let filled = 0;
  let skipped = 0;
  let failed = 0;
  const errors = {};
  const updates = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (row) => {
        const link = sourceLink(row.tags);
        if (!link) return { id: row.id, error: "no article link" };
        const r = await fetchOgImage(link);
        return { id: row.id, key: tagValue(row.tags, "__key:"), ...r };
      })
    );
    for (const r of results) {
      if (!r.image) {
        failed++;
        errors[r.error || "unknown"] = (errors[r.error || "unknown"] || 0) + 1;
        continue;
      }
      const owners = imageOwners.get(r.image);
      if (owners && owners.size > 0 && !(r.key && owners.has(String(r.key)))) {
        skipped++;
        errors["shared image"] = (errors["shared image"] || 0) + 1;
        continue;
      }
      if (!imageOwners.has(r.image)) imageOwners.set(r.image, new Set());
      if (r.key) imageOwners.get(r.image).add(String(r.key));
      updates.push([r.image, r.id]);
      filled++;
    }
    process.stdout.write(`\rprocessed ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}`);
    if (i + CONCURRENCY < rows.length) await sleep(DELAY_MS);
  }
  console.log("");

  if (!dryRun && updates.length) {
    for (let i = 0; i < updates.length; i += 25) {
      for (const [image, id] of updates.slice(i, i + 25)) {
        await client.execute({ sql: "UPDATE Post SET image = ? WHERE id = ?", args: [image, id] });
      }
    }
    console.log(`written to DB: ${updates.length}`);
  } else {
    console.log(`dry-run: ${updates.length} would be written`);
  }

  console.log(`filled=${filled} skippedShared=${skipped} failed=${failed}`);
  console.log("errors=" + JSON.stringify(errors));
  console.log("sample=" + JSON.stringify(updates.slice(0, 3).map((u) => u[0])));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => client.close());
