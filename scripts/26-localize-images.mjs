#!/usr/bin/env node
/**
 * تنزيل صور المصادر محلياً في public/images/news/ بصيغة WebP،
 * ثم استبدال روابط Post.image في قاعدة البيانات بالمسار المحلي.
 *
 * الهدف: حماية البطاقات من انقطاع الـ hotlink أو انتهاء روابط فيسبوك،
 * وتقليل حجم الصور (~70%) بلا تغيير في مخطط Prisma ولا في واجهات الويب/الموبايل.
 *
 * ملاحظات مهمة:
 *  - المزامنة لا تعيد كتابة صورة موجودة غير عامة (db-sync.ts)، فالاستبدال ثابت.
 *  - الصورة المشتركة بين هويات __key مختلفة تُتخطّى حتى لا نكسر تدقيق التكرار.
 *  - الترجمات لنفس الخبر تتشارك نفس الملف المحلي مقصوداً.
 *  - يُكتب سجل في scripts/data/localized-images.json للرجوع أو التحقق لاحقاً.
 *
 * التشغيل:
 *   node --env-file=.env scripts/26-localize-images.mjs --dry-run --limit=3
 *   node --env-file=.env scripts/26-localize-images.mjs
 *   node --env-file=.env scripts/26-localize-images.mjs --recompress
 * الخيارات: --dry-run  --limit=N  --recompress (تصغير الملفات المحلية بدون شبكة)
 */
import { createClient } from "@libsql/client";
import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const args = process.argv.slice(2);
const argValue = (name) => args.find((a) => a.startsWith(`--${name}=`))?.split("=")[1];
const limit = parseInt(argValue("limit") || "0", 10) || 0;
const dryRun = args.includes("--dry-run");
const recompress = args.includes("--recompress");

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "public", "images", "news");
const MANIFEST = path.join(ROOT, "scripts", "data", "localized-images.json");
const CONCURRENCY = 4;
const DELAY_MS = 250;
const MAX_WIDTH = 760;
const MAX_HEIGHT = 560;
const QUALITY = 66;
const MIN_BYTES = 2048;

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

function isGenericImage(value) {
  const v = String(value || "").trim();
  return (
    !v ||
    v.includes("images.unsplash.com/") ||
    v.includes("source.unsplash.com/") ||
    v.includes("placehold.co/") ||
    v.includes("/api/placeholder") ||
    v.startsWith("/images/news/")
  );
}

/** الصورة الرقمية الثابتة مشتقة من الرابط الأصلي — العملية قابلة للتكرار. */
function localName(imageUrl) {
  return `news-${createHash("sha256").update(imageUrl).digest("hex").slice(0, 16)}.webp`;
}

/**
 * zyrosite يخدم AVIF تحت امتداد .jpg عبر cdn-cgi/image/format=auto،
 * وSharp لا يقرأه في هذه النسخة. نطلب الأصل بدون تحويل الصيغة.
 * الرابط الأصلي يبقى كما هو في قاعدة البيانات للاستبدال والمطابقة.
 */
function sourceUrl(imageUrl) {
  if (imageUrl.includes("cdn-cgi/image/")) {
    return imageUrl.replace(/cdn-cgi\/image\/[^/]+\//, "");
  }
  if (imageUrl.includes("images.unsplash.com/")) return imageUrl;
  return imageUrl;
}

async function downloadWebp(originalUrl) {
  const imageUrl = sourceUrl(originalUrl);
  let referer = "https://www.google.com/";
  let origin = "https://www.google.com/";
  try {
    const parsed = new URL(imageUrl);
    origin = parsed.origin;
    referer = parsed.origin + "/";
  } catch {
    return { error: "invalid url" };
  }
  if (imageUrl.includes("fbcdn.net")) referer = "https://www.facebook.com/";

  let lastError = "download failed";
  for (const userAgent of USER_AGENTS) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        const res = await fetch(imageUrl, {
          signal: controller.signal,
          redirect: "follow",
          headers: {
            "User-Agent": userAgent,
            Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
            Referer: referer,
            Origin: origin,
          },
        });
        if ([403, 406, 429, 500, 502, 503].includes(res.status) && attempt < 1) {
          await sleep(500 * (attempt + 1));
          continue;
        }
        if (!res.ok) {
          lastError = `HTTP ${res.status}`;
          break;
        }
        const buffer = Buffer.from(await res.arrayBuffer());
        if (buffer.length < MIN_BYTES) {
          lastError = "too small";
          break;
        }
        const image = sharp(buffer, { limitInputPixels: false }).rotate();
        const meta = await image.metadata();
        if ((meta.width || 0) < 200 || (meta.height || 0) < 120) {
          lastError = "too small dimensions";
          break;
        }
        const webp = await image
          .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
          .webp({ quality: QUALITY })
          .toBuffer();
        if (webp.length < MIN_BYTES) {
          lastError = "webp too small";
          break;
        }
        return { buffer: webp, width: meta.width, height: meta.height };
      } catch (e) {
        lastError = String(e?.message || e).slice(0, 120);
        if (attempt < 1) await sleep(500 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
  }
  return { error: lastError };
}

async function recompressLocalFiles() {
  const names = (await readdir(OUT_DIR)).filter((n) => n.endsWith(".webp"));
  let before = 0;
  let after = 0;
  let failed = 0;
  for (const name of names) {
    const target = path.join(OUT_DIR, name);
    try {
      const input = await readFile(target);
      before += input.length;
      const output = await sharp(input)
        .rotate()
        .resize({ width: MAX_WIDTH, height: MAX_HEIGHT, fit: "inside", withoutEnlargement: true })
        .webp({ quality: QUALITY })
        .toBuffer();
      if (output.length < input.length) await writeFile(target, output);
      after += Math.min(input.length, output.length);
    } catch {
      failed += 1;
    }
  }
  console.log(
    `recompress files=${names.length} MB ${(before / 1048576).toFixed(1)} -> ${(after / 1048576).toFixed(1)} failed=${failed}`
  );
  await client.close();
}

async function main() {
  if (recompress) return recompressLocalFiles();

  const rows = (
    await client.execute(
      "SELECT id, image, tags FROM Post WHERE image IS NOT NULL AND image <> ''"
    )
  ).rows;

  // تجميع الصفوف حسب الرابط: نحتاج معرفة هل الرابط مشترك بين هويات مختلفة؟
  const groups = new Map();
  for (const row of rows) {
    const image = String(row.image || "").trim();
    if (!/^https?:\/\//i.test(image) || isGenericImage(image)) continue;
    if (!groups.has(image)) groups.set(image, { image, keys: new Set(), count: 0 });
    const g = groups.get(image);
    g.count += 1;
    const key = tagValue(row.tags, "__key:");
    if (key) g.keys.add(key);
  }

  let list = [...groups.values()];
  if (limit) list = list.slice(0, limit);

  if (!dryRun) {
    await mkdir(OUT_DIR, { recursive: true });
    await mkdir(path.dirname(MANIFEST), { recursive: true });
  }

  const stats = { groups: list.length, posts: 0, written: 0, reused: 0, skippedShared: 0, failed: 0, bytes: 0 };
  const failures = [];
  const manifest = {};
  try {
    manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  } catch {}

  let cursor = 0;
  async function worker() {
    while (cursor < list.length) {
      const group = list[cursor++];
      if (group.keys.size > 1) {
        stats.skippedShared += 1;
        failures.push({ image: group.image, error: "shared across keys", keys: group.keys.size });
        continue;
      }
      const name = localName(group.image);
      const localPath = `/images/news/${name}`;
      const target = path.join(OUT_DIR, name);

      if (!dryRun) {
        let existing = null;
        try {
          const { size } = await import("node:fs/promises").then((fs) => fs.stat(target));
          if (size > MIN_BYTES) existing = size;
        } catch {}
        if (existing) {
          stats.reused += 1;
          stats.bytes += existing;
        } else {
          const result = await downloadWebp(group.image);
          if (result.error) {
            stats.failed += 1;
            failures.push({ image: group.image, error: result.error });
            continue;
          }
          await writeFile(target, result.buffer);
          stats.written += 1;
          stats.bytes += result.buffer.length;
        }
        await client.execute({
          sql: "UPDATE Post SET image = ? WHERE image = ?",
          args: [localPath, group.image],
        });
        manifest[group.image] = localPath;
      } else {
        stats.written += 1; // عدد الصور التي سيتم تنزيلها
      }
      stats.posts += group.count;
      await sleep(DELAY_MS);
    }
  }

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, list.length || 1) }, () => worker()));

  if (!dryRun) {
    await writeFile(MANIFEST, JSON.stringify(manifest, null, 2) + "\n", "utf8");
  }

  const remaining = (
    await client.execute(
      "SELECT count(*) AS n FROM Post WHERE image IS NOT NULL AND image <> '' AND image LIKE 'http%'"
    )
  ).rows[0]?.n;

  console.log(`mode=${dryRun ? "dry-run" : "write"} groups=${stats.groups} affectedPosts=${stats.posts}`);
  console.log(
    `${dryRun ? "would write" : "written"}=${stats.written} reused=${stats.reused} skippedShared=${stats.skippedShared} failed=${stats.failed}` +
      (dryRun ? "" : ` MB=${(stats.bytes / 1024 / 1024).toFixed(1)}`)
  );
  console.log(`remainingRemote=${remaining}`);
  if (failures.length) {
    console.log("failures=" + JSON.stringify(failures.slice(0, 12)));
  }
  console.log("samples=" + JSON.stringify(list.slice(0, 3).map((g) => `/images/news/${localName(g.image)}`)));
  await client.close();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
