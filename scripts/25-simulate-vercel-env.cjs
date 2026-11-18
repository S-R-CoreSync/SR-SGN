/**
 * يبني ملف بيئة يحاكي متغيرات Vercel بالضبط (9 متغيرات فقط)
 * لاختبار ما إذا كان غياب متغير محلي هو سبب خطأ 500 في الإنتاج.
 */
const fs = require("fs");

const KEYS = [
  "AI_PROVIDER",
  "GEMINI_API_KEY",
  "GROQ_API_KEY",
  "GROQ_MODEL",
  "JINA_API_KEY",
  "QDRANT_API_KEY",
  "QDRANT_URL",
  "TURSO_AUTH_TOKEN",
  "TURSO_DATABASE_URL",
];

const local = {};
for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const i = t.indexOf("=");
  if (i < 0) continue;
  local[t.slice(0, i).trim()] = t.slice(i + 1).trim().replace(/^["']|["']$/g, "");
}

const out = [];
for (const k of KEYS) {
  if (local[k]) out.push(`${k}="${local[k]}"`);
  else console.log(`⚠ غير موجود محلياً: ${k}`);
}
fs.writeFileSync(".env.production.local", out.join("\n") + "\n", "utf8");
console.log(`✅ كتبت ${out.length} متغيراً في .env.production.local (محاكاة Vercel)`);
