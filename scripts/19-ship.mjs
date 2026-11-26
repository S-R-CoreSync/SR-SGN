#!/usr/bin/env node
/**
 * scripts/19-ship.mjs
 *
 * أمر واحد ينقل الشغل من المحلي إلى رابط الزبون بلا تخمين:
 *   1) فحوصات (i18n + typecheck + build)
 *   2) commit + push إلى main
 *   3) انتظار نجاح نشر Vercel فعلياً (حالة GitHub)
 *   4) نسخ بيانات SQLite المحلية إلى Turso عبر UPSERT
 *   5) فحص الرابط الحي (health + صفحات) بلا كاش
 *
 * الاستخدام:
 *   npm run ship -- "وصف التعديل"
 *   npm run ship:fast -- "وصف التعديل"     # بدون build محلي
 *   npm run ship -- "وصف" --with-data     # نسخ dev.db إلى Turso (استثناء صريح)
 *
 * القاعدة: Turso هو مصدر البيانات. مع USE_TURSO=1 يكتب المطوّر فيه مباشرة،
 * لذلك نسخ dev.db متوقف افتراضياً ولا يُفعّل إلا بـ --with-data.
 *
 * لا أسرار داخل الكود: GITHUB_TOKEN اختياري (لتفادي حدّ GitHub API).
 */

import { spawn, execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const REPO = "S-R-CoreSync/SR-SGN";
const SITE = "https://sgn-drab.vercel.app";
const args = process.argv.slice(2);
const flags = args.filter((a) => a.startsWith("--"));
const noBuild = flags.includes("--no-build");
const withData = flags.includes("--with-data");
const message = args.filter((a) => !a.startsWith("--")).join(" ").trim();

if (!message) {
  console.error("الاستخدام: npm run ship -- \"وصف التعديل\"");
  process.exit(1);
}

function run(cmd, cmdArgs, env = {}) {
  return new Promise((resolve) => {
    console.log(`\n▶ ${cmd} ${cmdArgs.join(" ")}`);
    const child = spawn(cmd, cmdArgs, {
      stdio: "inherit",
      cwd: process.cwd(),
      env: { ...process.env, ...env },
    });
    child.on("close", (code) => resolve(code ?? 1));
  });
}

async function npmScript(name) {
  // المسار يحتوي على & — نمرّر عبر cmd.exe على Windows مثل بقية سكربتات المشروع
  if (process.platform === "win32") {
    return run("cmd.exe", ["/d", "/s", "/c", `npm run ${name}`]);
  }
  return run("npm", ["run", name]);
}

function git(argsArray) {
  return execFileSync("git", argsArray, { cwd: process.cwd(), encoding: "utf8" }).trim();
}

function fail(step, detail = "") {
  console.error(`\n❌ توقّف عند: ${step}${detail ? `\n   ${detail}` : ""}`);
  process.exit(1);
}

async function check(step, ok) {
  if (!ok) fail(step);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// فحص حالة Vercel يحتاج GitHub API. بدون توكن ينفد حد الزائرين (60/ساعة)
// فيُرجِع 403 ويفشل الشحن مع أن النشر نجح فعلاً. نقرأ المتغيّر وحده من .env
// (لا نحمّل بقية الأسرار ولا نعتمد على حزمة dotenv غير مُعلَنة).
if (!process.env.GITHUB_TOKEN && existsSync(".env")) {
  const line = readFileSync(".env", "utf8").match(/^GITHUB_TOKEN=(.*)$/m);
  if (line) process.env.GITHUB_TOKEN = line[1].trim().replace(/^["']|["']$/g, "");
}

async function waitForVercel(sha) {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "sgn-ship",
    ...(process.env.GITHUB_TOKEN ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` } : {}),
  };
  const url = `https://api.github.com/repos/${REPO}/commits/${sha}/status`;

  for (let i = 0; i < 48; i++) {
    let json;
    try {
      const res = await fetch(url, { headers, cache: "no-store" });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      json = await res.json();
    } catch (e) {
      console.log(`  ⏳ تعذّر قراءة الحالة (${String(e.message).slice(0, 60)}) — إعادة...`);
      await sleep(15000);
      continue;
    }

    const vercel = (json.statuses || []).find((s) => s.context === "Vercel");
    const state = vercel?.state || json.state;
    if (state === "success") {
      console.log(`  ✅ Vercel: نشر مكتمل (${vercel?.updated_at || json.updated_at})`);
      return true;
    }
    if (state === "failure" || state === "error") {
      fail("نشر Vercel", `${vercel?.description || ""}\n   ${vercel?.target_url || ""}`);
    }
    if (i % 4 === 0) console.log(`  ⏳ Vercel: ${state} — انتظار...`);
    await sleep(15000);
  }
  fail("نشر Vercel", "انتهت مهلة الانتظار (١٢ دقيقة). تحقق يدوياً من صفحة الكومِت.");
}

async function smokeTest(sha) {
  const checks = [
    { name: "api/health", url: `${SITE}/api/health?ship=${sha}`, kind: "json" },
    { name: "ar/services", url: `${SITE}/ar/services?ship=${sha}`, kind: "html" },
    { name: "ar/technology", url: `${SITE}/ar/technology?ship=${sha}`, kind: "html" },
    { name: "en/services", url: `${SITE}/en/services?ship=${sha}`, kind: "html" },
  ];
  let ok = true;
  for (const c of checks) {
    try {
      const res = await fetch(c.url, { cache: "no-store" });
      const body = await res.text();
      let good = res.status === 200;
      if (c.kind === "json") {
        const j = JSON.parse(body);
        good = good && j.status !== "error";
      } else {
        good = good && !body.includes("MISSING_MESSAGE");
      }
      console.log(`  ${good ? "✅" : "❌"} ${c.name} → HTTP ${res.status}`);
      if (!good) ok = false;
    } catch (e) {
      console.log(`  ❌ ${c.name} → ${String(e.message).slice(0, 90)}`);
      ok = false;
    }
  }
  const svgOk = (await run(process.execPath, ["scripts/25-check-svg-language.mjs", SITE])) === 0;
  console.log(`  ${svgOk ? "✅" : "❌"} svg language check`);
  return ok && svgOk;
}

async function main() {
  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log("║  🚀 SHIP — من المحلي إلى رابط الزبون في أمر واحد          ║");
  console.log(`║  ${message.slice(0, 58).padEnd(58)} ║`);
  console.log("╚════════════════════════════════════════════════════════════╝");

  // 1) الفحوصات
  console.log("\n── 1/5 الفحوصات");
  await check("i18n:check", (await npmScript("i18n:check")) === 0);
  await check("typecheck", (await npmScript("typecheck")) === 0);
  if (!noBuild) await check("build", (await npmScript("build")) === 0);
  else console.log("  (تم تخطي build محلياً — CI وVercel سيبنيان المشروع)");

  // 2) الرفع
  console.log("\n── 2/5 الرفع إلى main");
  const dirty = git(["status", "--porcelain"]);
  if (dirty) {
    await check("git add -A", (await run("git", ["add", "-A"])) === 0);
    await check("git commit", (await run("git", ["commit", "-m", message])) === 0);
  } else {
    console.log("  لا تعديلات جديدة — سيتم الدفع كما هو.");
  }
  await check("git push", (await run("git", ["push", "origin", "main"])) === 0);
  const sha = git(["rev-parse", "HEAD"]).slice(0, 12);
  console.log(`  SHA: ${sha}`);

  // 3) انتظار النشر
  console.log("\n── 3/5 انتظار نشر Vercel");
  await waitForVercel(sha);

  // 4) نسخ البيانات (موقوف افتراضياً — Turso هو المصدر)
  console.log("\n── 4/5 نسخ البيانات إلى Turso (UPSERT)");
  if (!withData) {
    console.log("  (متوقف: Turso هو مصدر البيانات — أضف USE_TURSO=1 في .env للكتابة مباشرة)");
    console.log("  إن كنت تقصد نسخ dev.db فعلاً: أعد الشغل مع --with-data");
  } else {
    await check("data:push", (await run(process.execPath, ["scripts/20-push-data.mjs", "--force"])) === 0);
  }

  // 5) التأكد من الرابط الحي
  console.log("\n── 5/5 فحص الرابط الحي");
  const live = await smokeTest(sha);

  console.log("\n╔════════════════════════════════════════════════════════════╗");
  console.log(`║  ${live ? "✅ SHIP مكتمل" : "⚠️  SHIP مكتمل لكن فحص الرابط تعثّر"}                            ║`);
  console.log(`║  الكومِت: ${sha}   الرابط: ${SITE}   ║`);
  console.log("╚════════════════════════════════════════════════════════════╝");
  if (!live) process.exitCode = 1;
}

main().catch((e) => fail("خطأ غير متوقع", String(e?.stack || e)));
