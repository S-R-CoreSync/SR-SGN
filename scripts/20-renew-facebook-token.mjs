#!/usr/bin/env node
/**
 * scripts/20-renew-facebook-token.mjs
 *
 * تحديث توكن صفحة فيسبوك بعد تجديده من Meta Business Suite.
 * لا يكتب أي سرّ داخل الكود: التوكن يُقرأ من ملف محلي أو من المتغيّر NEW_FACEBOOK_TOKEN.
 *
 * الاستخدام:
 *   node --env-file=.env scripts/20-renew-facebook-token.mjs <path-to-token-file>
 *   NEW_FACEBOOK_TOKEN="..." node --env-file=.env scripts/20-renew-facebook-token.mjs
 *
 * يتحقق السكربت من: صلاحية التوكن، عدم انتهائه، صلاحية pages_read_engagement،
 * ومطابقته لمعرّف الصفحة، ثم يحدّث .env وكل متغيرات FACEBOOK_PAGE_TOKEN على Vercel.
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("-"));
const token = (process.env.NEW_FACEBOOK_TOKEN || (file && existsSync(file) ? readFileSync(file, "utf8") : ""))
  .trim()
  .replace(/^["']|["']$/g, "")
  .trim();

if (!token) {
  console.error("الاستخدام: node --env-file=.env scripts/20-renew-facebook-token.mjs <path-to-token-file>");
  process.exit(1);
}

const pageId = process.env.FACEBOOK_PAGE_ID;
const appId = process.env.FACEBOOK_CLIENT_ID;
const appSecret = process.env.FACEBOOK_CLIENT_SECRET;
const vercelToken = process.env.VERCEL_TOKEN;
const projectId = "prj_RGqEd1XDA7OJAvxFvXQFMhhFzMkX";
const api = "https://graph.facebook.com/v19.0";

function die(msg) {
  console.error("❌ " + msg);
  process.exit(1);
}

async function graph(path, accessToken) {
  const url = `${api}/${path}${path.includes("?") ? "&" : "?"}access_token=${encodeURIComponent(accessToken)}`;
  const res = await fetch(url, { cache: "no-store" });
  const json = await res.json();
  return { ok: res.ok, json };
}

async function validate() {
  // debug_token ب التوكن نفسه: يعمل مع System User وتوكن الصفحة الدائم.
  let d = await graph(`debug_token?input_token=${encodeURIComponent(token)}`, token);
  if (!d.json.data && appId && appSecret) {
    d = await graph(`debug_token?input_token=${encodeURIComponent(token)}`, `${appId}|${appSecret}`);
  }
  if (!d.json.data?.is_valid) {
    die("التوكن غير صالح: " + (d.json.error?.message || "unknown error"));
  }
  const expiresAt = d.json.data.expires_at ?? 0;
  const scopes = d.json.data.scopes || [];
  if (expiresAt !== 0 && expiresAt - Date.now() / 1000 < 7 * 86_400) {
    die(`التوكن ينتهي قريباً (${new Date(expiresAt * 1000).toISOString()}) — استخدم System User token دائم`);
  }
  if (!scopes.includes("pages_read_engagement")) {
    die("التوكن لا يملك pages_read_engagement; scopes=" + JSON.stringify(scopes));
  }
  console.log(`✅ التوكن صالح | expires=${expiresAt === 0 ? "never" : new Date(expiresAt * 1000).toISOString()} | scopes=${scopes.join(",")}`);

  if (pageId) {
    const page = await graph(`${pageId}?fields=id,name`, token);
    if (!page.ok) die("التوكن لا يصل إلى الصفحة " + pageId + ": " + (page.json.error?.message || ""));
    console.log(`✅ الصفحة: ${page.json.name} (${page.json.id})`);
    const feed = await graph(`${pageId}/feed?limit=1`, token);
    if (!feed.ok) die("قراءة المنشورات فشلت: " + (feed.json.error?.message || ""));
    console.log("✅ قراءة feed تعمل (pages_read_engagement فعّال)");
  }
}

function updateEnvFile() {
  if (!existsSync(".env")) die(".env غير موجود");
  const src = readFileSync(".env", "utf8");
  if (!/^FACEBOOK_PAGE_TOKEN=/m.test(src)) die("لا يوجد FACEBOOK_PAGE_TOKEN في .env");
  writeFileSync(".env", src.replace(/^FACEBOOK_PAGE_TOKEN=.*$/m, `FACEBOOK_PAGE_TOKEN=${token}`));
  console.log("✅ .env تحدّث");
}

async function updateVercel() {
  if (!vercelToken) die("VERCEL_TOKEN غير متوفر — شغّل بـ node --env-file=.env");
  const H = { Authorization: `Bearer ${vercelToken}`, "Content-Type": "application/json" };
  const list = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?limit=100`, { headers: H, cache: "no-store" });
  const j = await list.json();
  if (!list.ok) die("قراءة متغيرات Vercel فشلت: " + (j.error?.message || list.status));
  const rows = j.envs.filter((e) => e.key === "FACEBOOK_PAGE_TOKEN");
  for (const e of rows) {
    const r = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env/${e.id}`, {
      method: "PATCH",
      headers: H,
      body: JSON.stringify({ key: e.key, value: token, target: e.target }),
      cache: "no-store",
    });
    const p = await r.json();
    if (!r.ok) die(`تحديث ${e.id} فشل: ` + (p.error?.message || r.status));
    console.log(`✅ Vercel ${JSON.stringify(e.target)} تحدّث`);
  }
  if (!rows.length) die("لا يوجد FACEBOOK_PAGE_TOKEN على Vercel");
}

await validate();
updateEnvFile();
await updateVercel();
console.log("\n✅ انتهى. أعد النشر إن لزم: npm run ship:fast -- \"chore: تحديث توكن فيسبوك\"");
