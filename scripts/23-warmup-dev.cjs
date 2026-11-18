#!/usr/bin/env node
/**
 * تسخين خادم التطوير (Warm-up)
 * ------------------------------------------------------------
 * Next.js في وضع التطوير يترجم كل مسار عند أول زيارة فقط، وقد يستغرق
 * 5–25 ثانية للمسار الواحد. هذا يجعل الموقع يبدو «معلّقاً» عند أول نقرة
 * على تصنيف أو خبر. هذا السكربت يزور المسارات الأساسية مسبقاً حتى تكون
 * جاهزة عند فتح المتصفح.
 *
 * الاستخدام:  node scripts/23-warmup-dev.cjs
 */

const BASE = process.env.WARMUP_BASE || "http://localhost:3000";

const ROUTES = [
  "/api/health",
  "/api/news/categories?locale=ar",
  "/api/news?locale=ar&limit=12&offset=0",
  "/api/news?locale=ar&limit=12&offset=0&category=" + encodeURIComponent("أخبار هولندا"),
  "/api/news?locale=ar&limit=12&offset=0&video=true",
  "/news",
  "/en/news",
  "/nl/news",
  "/",
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function ping(url, timeoutMs = 180000) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + url, { signal: controller.signal });
    await res.arrayBuffer();
    return { ok: res.ok, status: res.status, ms: Date.now() - started };
  } catch (err) {
    return { ok: false, status: 0, ms: Date.now() - started, error: String(err).slice(0, 80) };
  } finally {
    clearTimeout(timer);
  }
}

async function waitForServer(maxMs = 180000) {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    const r = await ping("/api/health", 15000);
    if (r.ok) return true;
    await sleep(2000);
  }
  return false;
}

(async () => {
  console.log("[warmup] بانتظار الخادم على " + BASE + " ...");
  if (!(await waitForServer())) {
    console.log("[warmup] الخادم لم يستجب — تم الإلغاء.");
    process.exit(1);
  }
  console.log("[warmup] الخادم جاهز. جارٍ تسخين المسارات...");
  for (const route of ROUTES) {
    const r = await ping(route);
    console.log(`[warmup] ${r.status || "ERR"} ${r.ms}ms  ${decodeURIComponent(route)}`);
  }
  console.log("[warmup] انتهى ✅");
})();
