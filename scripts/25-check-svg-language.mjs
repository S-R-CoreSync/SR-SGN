#!/usr/bin/env node
/**
 * فحص لغوي على مستوى الصفحات المُنتَجة لصور SVG الاحتياطية (data URI).
 * المشكلة اللي يمنعها: نص عربي ثابت داخل placeholder يظهر في صفحات /en و/nl.
 *
 * التشغيل:
 *   node scripts/25-check-svg-language.mjs [baseUrl]
 *   node scripts/25-check-svg-language.mjs http://localhost:3000
 *
 * يفحص الرئيسية ومقالاً بلا صورة لكل لغة، ويخرج بـ exit 1 عند أي مخالفة.
 */
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(resolve(process.cwd(), "package.json"));
const base = (process.argv[2] || "https://sgn-drab.vercel.app").replace(/\/$/, "");
const arabic = /[\u0600-\u06FF]/;

for (const line of readFileSync(resolve(process.cwd(), ".env"), "utf8").split(/\r?\n/)) {
  const match = line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);
  if (match && process.env[match[1]] === undefined) {
    process.env[match[1]] = match[2].trim().replace(/^["']|["']$/g, "").trim();
  }
}

function decodeEntities(value) {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");
}

/** يستخرج نص <text> فقط، لا وسوم SVG (font-family="system-ui" إلخ). */
function svgTextNodes(svg) {
  const nodes = [];
  const pattern = /<text\b([^>]*)>([\s\S]*?)<\/text>/gi;
  let match;
  while ((match = pattern.exec(svg)) !== null) {
    const text = decodeEntities(match[2].replace(/<[^>]*>/g, "")).trim();
    if (text) nodes.push({ text, direction: /direction=["']([^"']+)["']/i.exec(match[1])?.[1] || "" });
  }
  return nodes;
}

function svgsIn(html) {
  const out = [];
  // encodeURIComponent لا يرمّز الأقواس، والـ SVG يحتوي url(#grad) — لا نقطع عند ')'.
  const pattern = /data:image\/svg\+xml;utf8,([^"'\s]+)/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      out.push(decodeURIComponent(match[1]));
    } catch {
      // URI تالف — لا يهمّ للفحص اللغوي
    }
  }
  return out;
}

async function emptyImagePost(locale) {
  if (!existsSync(resolve(process.cwd(), ".env"))) return null;
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) return null;
  try {
    const { createClient } = require("@libsql/client");
    const client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
    const row = (
      await client.execute(
        "select slug from Post where locale = ? and published = 1 and (image is null or image = '') order by createdAt desc limit 1",
        [locale]
      )
    ).rows[0];
    await client.close();
    return row ? String(row.slug) : null;
  } catch {
    return null;
  }
}

let problems = 0;

for (const locale of ["ar", "en", "nl"]) {
  const urls = [`${base}/${locale}`];
  const slug = await emptyImagePost(locale);
  if (slug) urls.push(`${base}/${locale}/news/${encodeURIComponent(slug)}`);

  let svgs = 0;
  let texts = 0;
  for (const url of urls) {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status !== 200) {
      console.error(`❌ ${locale} ${url} → HTTP ${res.status}`);
      problems++;
      continue;
    }
    for (const svg of svgsIn(await res.text())) {
      svgs++;
      for (const node of svgTextNodes(svg)) {
        texts++;
        if (locale === "ar") {
          if (arabic.test(node.text) && node.direction !== "rtl") {
            console.error(`❌ ${locale}: Arabic text without rtl → ${node.text.slice(0, 60)}`);
            problems++;
          }
        } else if (arabic.test(node.text)) {
          console.error(`❌ ${locale}: Arabic text in SVG → ${node.text.slice(0, 60)}`);
          problems++;
        }
      }
    }
  }
  console.log(`${problems === 0 ? "✅" : "•"} ${locale}: pages=${urls.length} svg=${svgs} textNodes=${texts}`);
}

if (problems > 0) {
  console.error(`\n❌ فحص SVG اللغوي: ${problems} مخالفة`);
  process.exit(1);
}
console.log("\n✅ SVG placeholders محايدة لغوياً في كل اللغات");
