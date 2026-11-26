#!/usr/bin/env node
/**
 * يملأ الأخبار بلا صورة بصورة حقيقية من صفحة المصدر.
 * النقطة المهمة: لا يكتب صورة مشتركة بين خبرين مختلفين،
 * ولا صور شعارات/أيقونات/صفوفات عامة — وإلا رجعنا لمشكلة التكرار.
 *
 * الاستراتيجيات بالترتيب (لكل صفحة):
 *   1) og:image / og:image:url / twitter:image
 *   2) حقل image داخل JSON-LD
 *   3) <link rel="image_src">
 *   4) أول <img> حقيقي داخل المحتوى (لا شعار ولا أيقونة)
 * وكل استراتيجية تُجرَّب بعدة User-Agent لأن بعض المواقع يخفي المحتوى أو يرجّع 406.
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
const DELAY_MS = 600;
const RETRIES = 2;

const USER_AGENTS = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
  "curl/8.0",
  "Googlebot/2.1 (+http://www.google.com/bot.html)",
];

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

function usableImage(raw) {
  if (!raw) return null;
  const image = raw.replace(/&amp;/g, "&").trim();
  if (!/^https?:\/\//i.test(image)) return null;
  if (/(?:logo|favicon|icon|placeholder|default|avatar|share|sgn_02|pixel|tracking)/i.test(image)) return null;
  return image;
}

/** كل الصور المحتملة في الصفحة، مرتّبة بالأولوية. */
function extractImageCandidates(html) {
  const out = [];
  const metaPatterns = [
    /<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::url)?["']/i,
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
    /<link[^>]+rel=["']image_src["'][^>]+href=["']([^"']+)["']/i,
  ];
  for (const re of metaPatterns) {
    const image = usableImage(html.match(re)?.[1]);
    if (image) out.push(image);
  }

  // JSON-LD: "image": "url" أو "image": ["url"] أو ImageObject.url
  for (const block of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const body = block[1];
    const matches = [
      ...body.matchAll(/"image"\s*:\s*"([^"]+)"/gi),
      ...body.matchAll(/"image"\s*:\s*\[\s*"([^"]+)"/gi),
      ...body.matchAll(/"url"\s*:\s*"(https?:[^"\\]+)"/gi),
    ];
    for (const m of matches) {
      const image = usableImage(m[1].replace(/\\\//g, "/"));
      if (image) out.push(image);
    }
  }

  // أول صورة داخل المحتوى — نتخطّى الشعارات والصور الصغيرة جداً
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attrs = m[1];
    const src = attrs.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    const image = usableImage(src);
    if (!image || image.startsWith("data:")) continue;
    const width = parseInt(attrs.match(/\bwidth=["'](\d+)["']/i)?.[1] || "0", 10);
    const height = parseInt(attrs.match(/\bheight=["'](\d+)["']/i)?.[1] || "0", 10);
    if ((width > 0 && width < 200) || (height > 0 && height < 120)) continue;
    out.push(image);
    if (out.length > 24) break;
  }

  return [...new Set(out)];
}

async function fetchCandidates(link) {
  let referer = "https://www.google.com/";
  try { referer = new URL(link).origin + "/"; } catch {}
  let lastError = "no candidates";

  for (const userAgent of USER_AGENTS) {
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);
      try {
        const res = await fetch(link, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": userAgent,
            Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: referer,
          },
        });
        if ((res.status === 406 || res.status === 429 || res.status === 403) && attempt < RETRIES) {
          await sleep(600 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          break; // جرّب UA التالي
        }
        const candidates = extractImageCandidates(await res.text());
        if (candidates.length) return candidates;
        lastError = "no candidates";
        break; // جرّب UA التالي
      } catch (e) {
        lastError = String(e?.message || e).slice(0, 120);
        if (attempt === RETRIES) break;
        await sleep(600 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return { error: lastError };
}

async function main() {
  const where = `(image IS NULL OR image = '')`;
  const sql = `SELECT id, title, tags, locale, source FROM Post
    WHERE ${where}${sourceFilter ? ` AND source = '${sourceFilter.replace(/'/g, "''")}'` : ""}
    ORDER BY createdAt DESC ${limit ? `LIMIT ${limit}` : ""}`;
  const rows = (await client.execute(sql)).rows;

  // صورة مستخدمة فعلاً من خبر آخر (مفتاح مختلف) لا تُستعار أبداً
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
        const r = await fetchCandidates(link);
        if (Array.isArray(r)) return { id: row.id, key: tagValue(row.tags, "__key:"), candidates: r };
        return { id: row.id, error: r.error };
      })
    );
    for (const r of results) {
      const candidate = (r.candidates || []).find((image) => {
        const owners = imageOwners.get(image);
        return !owners || owners.size === 0 || (r.key && owners.has(String(r.key)));
      });
      if (!candidate) {
        if (r.candidates?.length) {
          skipped++;
          errors["all candidates shared"] = (errors["all candidates shared"] || 0) + 1;
        } else {
          failed++;
          errors[r.error || "unknown"] = (errors[r.error || "unknown"] || 0) + 1;
        }
        continue;
      }
      if (!imageOwners.has(candidate)) imageOwners.set(candidate, new Set());
      if (r.key) imageOwners.get(candidate).add(String(r.key));
      updates.push([candidate, r.id]);
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
