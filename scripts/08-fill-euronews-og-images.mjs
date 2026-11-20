/**
 * يقرأ صور og:image الحقيقية من صفحات Euronews ويملأ المقالات التي بلا صورة.
 * خلاصة RSS Euronews لا تحتوي صوراً داخل العناصر، لهذا نحتاج قراءة الصفحة نفسها.
 *
 * التشغيل:
 *   node --env-file=.env scripts/08-fill-euronews-og-images.mjs
 *
 * الخيارات:
 *   --limit=N   أقصى عدد مقالات (افتراضي: كل المقالات الفارغة)
 *   --dry-run  Without writing to the database
 */
import { createClient } from "@libsql/client";

const args = process.argv.slice(2);
const limitArg = args.find((a) => a.startsWith("--limit="));
const limit = limitArg ? parseInt(limitArg.split("=")[1], 10) : 0;
const dryRun = args.includes("--dry-run");
const CONCURRENCY = 5;
const DELAY_MS = 150;

const url = process.env.TURSO_DATABASE_URL?.trim().replace(/^["']|["']$/g, "");
const authToken = process.env.TURSO_AUTH_TOKEN?.trim().replace(/^["']|["']$/g, "");
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN missing");
  process.exit(1);
}
const client = createClient({ url, authToken });

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function sourceLink(tags) {
  if (!tags) return null;
  for (const tag of tags.split(",")) {
    const m = tag.trim().match(/^__source:[^:]+:(.+)$/);
    if (m) {
      // الروابط القديمة تبدأ بـ http://www.euronews.com — نرفعها إلى https.
      return m[1].trim().replace(/^http:\/\//, "https://");
    }
  }
  return null;
}

function extractOgImage(html) {
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
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
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const res = await fetch(link, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36",
        Accept: "text/html,application/xhtml+xml",
      },
    });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    const html = await res.text();
    const image = extractOgImage(html);
    return image ? { image } : { error: "no og:image" };
  } catch (e) {
    return { error: String(e?.message || e).slice(0, 120) };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const sql = `SELECT id, title, tags, locale FROM Post
    WHERE source LIKE 'euronews-%' AND (image IS NULL OR image = '')
    ORDER BY createdAt DESC ${limit ? `LIMIT ${limit}` : ""}`;
  const rows = (await client.execute(sql)).rows;
  console.log(`empty euronews posts: ${rows.length}`);

  let filled = 0;
  let failed = 0;
  const errors = {};
  const updates = [];

  for (let i = 0; i < rows.length; i += CONCURRENCY) {
    const batch = rows.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      batch.map(async (row) => {
        const link = sourceLink(row.tags);
        if (!link) return { id: row.id, error: "no source link" };
        const r = await fetchOgImage(link);
        return { id: row.id, ...r };
      })
    );
    for (const r of results) {
      if (r.image) {
        updates.push([r.image, r.id]);
        filled++;
      } else {
        failed++;
        errors[r.error || "unknown"] = (errors[r.error || "unknown"] || 0) + 1;
      }
    }
    process.stdout.write(`\rprocessed ${Math.min(i + CONCURRENCY, rows.length)}/${rows.length}`);
    if (i + CONCURRENCY < rows.length) await sleep(DELAY_MS);
  }
  console.log("");

  console.log("sample_images=" + JSON.stringify(updates.slice(0, 3).map((u) => u[0])));

  if (!dryRun && updates.length) {
    for (let i = 0; i < updates.length; i += 25) {
      const chunk = updates.slice(i, i + 25);
      for (const [image, id] of chunk) {
        await client.execute({
          sql: "UPDATE Post SET image = ? WHERE id = ?",
          args: [image, id],
        });
      }
    }
    console.log(`written to DB: ${updates.length}`);
  } else {
    console.log(`dry-run: ${updates.length} would be written`);
  }

  const sample = (await client.execute(
    `SELECT image, COUNT(*) n FROM Post WHERE source LIKE 'euronews-%' AND image LIKE 'https://www.euronews.com/%' GROUP BY image LIMIT 3`
  )).rows;
  console.log("filled=" + filled + " failed=" + failed);
  console.log("errors=" + JSON.stringify(errors));
  console.log("sample=" + JSON.stringify(sample));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    client.close();
    process.exit(process.exitCode || 0);
  });
