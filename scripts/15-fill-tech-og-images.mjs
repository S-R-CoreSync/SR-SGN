/**
 * يملأ صور og:image الحقيقية لمقالات قسم التقنية التي بلا صورة.
 * خلاصات Tweakers و NU.nl و TechCrunch لا تحتوي صوراً داخل العناصر.
 *
 * التشغيل:
 *   node --env-file=.env scripts/15-fill-tech-og-images.mjs [--limit=N] [--dry-run]
 */
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
const dryRun = args.includes("--dry-run");
const CONCURRENCY = 3;
const DELAY_MS = 500;
const RETRIES = 2;

const url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "");
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing");
  process.exit(1);
}
const client = createClient({ url, authToken });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function sourceLink(tags) {
  if (!tags) return null;
  for (const tag of tags.split(",")) {
    const m = tag.trim().match(/^__source:[^:]+:(.+)$/);
    if (m) return m[1].trim().replace(/^http:\/\//, "https://");
  }
  return null;
}

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["']+[^>]*property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      const img = m[1].replace(/&amp;/g, "&").trim();
      if (/^https?:\/\//i.test(img) && !/logo|favicon|icon/i.test(img)) return img;
    }
  }
  return null;
}

async function fetchOgImage(link) {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(link, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!res.ok) {
        if (attempt < RETRIES) { await sleep(600 * (attempt + 1)); continue; }
        return { error: `HTTP ${res.status}` };
      }
      const html = await res.text();
      const image = extractOgImage(html);
      return image ? { image } : { error: "no og:image" };
    } catch (e) {
      if (attempt === RETRIES) return { error: String(e?.message || e).slice(0, 120) };
      await sleep(600 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  return { error: "retries exhausted" };
}

async function main() {
  const sql = `SELECT id, tags, locale FROM Post
    WHERE source IN ('tweakers-tech','nu-tech','techcrunch-tech','arstechnica-tech','wired-tech')
      AND (image IS NULL OR image = '')
    ORDER BY createdAt DESC ${limit ? `LIMIT ${limit}` : ""}`;
  const rows = (await client.execute(sql)).rows;
  console.log(`empty tech posts: ${rows.length}`);

  const seenLinks = new Set();
  const imageByLink = new Map();
  const updates = [];
  const errors = {};
  let failed = 0;

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (row) => {
      const link = sourceLink(row.tags);
      if (!link) { failed++; errors["no source link"] = (errors["no source link"] || 0) + 1; return; }
      // نفس المقال مخزّن بثلاث لغات — نجلب صورته مرة واحدة فقط
      if (imageByLink.has(link)) return;
      if (seenLinks.has(link)) return;
      seenLinks.add(link);
      const r = await fetchOgImage(link);
      imageByLink.set(link, r.image || null);
      if (!r.image) { failed++; errors[r.error || "unknown"] = (errors[r.error || "unknown"] || 0) + 1; }
    }));
    for (const row of batch) {
      const link = sourceLink(row.tags);
      const image = link ? imageByLink.get(link) : null;
      if (image) updates.push([image, row.id]);
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

  console.log(`filled=${updates.length} failed=${failed}`);
  console.log("errors=" + JSON.stringify(errors));
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1; })
  .finally(() => { client.close(); process.exit(process.exitCode || 0); });
