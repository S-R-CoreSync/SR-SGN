#!/usr/bin/env node
/**
 * تدقيق أسبوعي لمنع رجوع تكرار الأخبار/الصور.
 * يقرأ قاعدة الإنتاج فقط (لا يكتب فيها شيئاً) ويبلّغ عن:
 *   1) أخبار بلا هوية ثابتة (__key)
 *   2) هويات مكررة داخل نفس اللغة (خبر مخفي بالـ dedup)
 *   3) روابط صورة واحدة تخص أكثر من خبر (صورة قناة/شعار)
 *
 * التشغيل: node scripts/23-audit-duplicates.mjs
 * يكتب تقرير Markdown إلى $GITHUB_STEP_SUMMARY عند وجوده،
 * ويرجع exit 1 إذا وُجدت مشاكل حتى يصل تنبيه GitHub Actions.
 */
import { appendFileSync, readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = process.cwd();
const require = createRequire(resolve(root, "package.json"));
const { createClient } = require("@libsql/client");

function env(name) {
  let value = process.env[name];
  if (!value && existsSync(resolve(root, ".env"))) {
    const m = readFileSync(resolve(root, ".env"), "utf8").match(new RegExp(`^${name}=(.*)$`, "m"));
    if (m) value = m[1];
  }
  return (value || "").trim().replace(/^["']|["']$/g, "").trim();
}

const url = env("TURSO_DATABASE_URL");
const authToken = env("TURSO_AUTH_TOKEN");
if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN غير مضبوطين");
  process.exit(2);
}

const client = createClient({ url, authToken });

function tagValue(tags, prefix) {
  for (const part of String(tags || "").split(",")) {
    const tag = part.trim();
    if (tag.startsWith(prefix)) return tag.slice(prefix.length);
  }
  return null;
}

function isGenericImage(image) {
  if (!image) return true;
  const v = image.trim();
  return (
    !v ||
    v.includes("images.unsplash.com/") ||
    v.includes("source.unsplash.com/") ||
    v.includes("placehold.co/") ||
    v.includes("/api/placeholder")
  );
}

async function main() {
  const rows = (await client.execute(
    "SELECT id, title, slug, locale, tags, image, source FROM Post"
  )).rows;

  const missingKey = [];
  const keyGroups = new Map();
  const imageOwners = new Map();

  for (const row of rows) {
    const key = tagValue(row.tags, "__key:");
    const locale = String(row.locale || "");
    if (!key) {
      missingKey.push(row);
      continue;
    }
    const k = `${locale}|${key}`;
    if (!keyGroups.has(k)) keyGroups.set(k, []);
    keyGroups.get(k).push(row);

    const image = String(row.image || "").trim();
    if (!isGenericImage(image)) {
      if (!imageOwners.has(image)) imageOwners.set(image, new Map());
      const owners = imageOwners.get(image);
      if (!owners.has(key)) owners.set(key, []);
      owners.get(key).push(row);
    }
  }

  const duplicateKeys = [...keyGroups]
    .filter(([, arr]) => arr.length > 1)
    .sort((a, b) => b[1].length - a[1].length);
  const sharedImages = [...imageOwners]
    .filter(([, owners]) => owners.size > 1)
    .sort((a, b) => b[1].size - a[1].size);

  const lines = [
    "# تقرير تدقيق التكرار",
    "",
    `- إجمالي الأخبار: **${rows.length}**`,
    `- بلا هوية ثابتة: **${missingKey.length}**`,
    `- هويات مكررة لنفس اللغة: **${duplicateKeys.length}**`,
    `- صور مشتركة بين أخبار مختلفة: **${sharedImages.length}**`,
    "",
  ];

  if (missingKey.length) {
    lines.push("## أخبار بلا `__key`", "");
    for (const r of missingKey.slice(0, 10)) lines.push(`- ${r.locale} — ${String(r.title).slice(0, 80)}`);
    lines.push("");
  }
  if (duplicateKeys.length) {
    lines.push("## هويات مكررة", "");
    for (const [key, arr] of duplicateKeys.slice(0, 10)) {
      lines.push(`- \`${key}\` × ${arr.length}: ${arr.map((r) => String(r.title).slice(0, 45)).join(" | ")}`);
    }
    lines.push("");
  }
  if (sharedImages.length) {
    lines.push("## صور مشتركة", "");
    for (const [image, owners] of sharedImages.slice(0, 10)) {
      const samples = [...owners.values()].slice(0, 2).map((arr) => String(arr[0].title).slice(0, 45));
      lines.push(`- ${image.slice(0, 100)} — ${owners.size} أخبار: ${samples.join(" | ")}`);
    }
    lines.push("");
  }

  const report = lines.join("\n");
  console.log(report);
  const summary = process.env.GITHUB_STEP_SUMMARY;
  if (summary) appendFileSync(summary, report + "\n");

  const problems = missingKey.length + duplicateKeys.length + sharedImages.length;
  if (problems > 0) {
    console.error(`::error::تدقيق التكرار: ${problems} مشكلة تحتاج مراجعة`);
    process.exitCode = 1;
  } else {
    console.log("✅ لا تكرار ولا أخبار بلا هوية ثابتة");
  }
}

main()
  .catch((e) => {
    console.error("audit failed:", e);
    process.exitCode = 1;
  })
  .finally(() => client.close());
