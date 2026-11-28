/**
 * فحص مزوّد رؤية البطاقات على أي نشر حي.
 * الاستخدام:
 *   CRON_SECRET=... node scripts/check-vision-provider.mjs https://sgn-drab.vercel.app
 * يطبع اسم المزوّد الناجح فقط — لا يطبع أي مفتاح أو تفاصيل استجابة.
 */

const base = (process.argv[2] || "https://sgn-drab.vercel.app").replace(/\/$/, "");
const secret = process.env.CRON_SECRET?.trim();

if (!secret) {
  console.error("CRON_SECRET is required (same value as the Vercel environment variable).");
  process.exit(2);
}

try {
  const res = await fetch(`${base}/api/ai/vision-check`, {
    headers: { Authorization: `Bearer ${secret}` },
  });
  const body = await res.json().catch(() => ({}));
  if (res.ok && body.ok && body.provider) {
    console.log(`provider=${body.provider}`);
    process.exit(0);
  }
  console.error(`no vision provider available (HTTP ${res.status})`);
  process.exit(1);
} catch (error) {
  console.error(`check failed: ${error instanceof Error ? error.message : "network error"}`);
  process.exit(1);
}
