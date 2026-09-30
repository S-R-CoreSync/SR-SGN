import http from 'http';

const routes = [
  "",
  "/ads",
  "/ai",
  "/board",
  "/comments",
  "/donations",
  "/events",
  "/facebook-sync",
  "/landing",
  "/media",
  "/member-profile",
  "/members",
  "/members/vault",
  "/membership-settings",
  "/messages",
  "/mobile-control",
  "/pages",
  "/regulations",
  "/revenue",
  "/roles",
  "/settings",
  "/stats",
  "/subscribers",
  "/surveys",
  "/tasks",
  "/users",
  "/volunteers",
];

async function checkRoute(locale: string, path: string) {
  const url = `http://localhost:3000/${locale}/dashboard${path}`;
  const start = Date.now();
  try {
    const res = await fetch(url);
    const duration = Date.now() - start;
    const text = await res.text();
    const hasMissingMsg = text.includes("MISSING_MESSAGE");
    const hasError = text.includes("Error:") || text.includes("Unhandled Runtime Error");
    return {
      url,
      status: res.status,
      duration,
      hasMissingMsg,
      hasError,
      length: text.length,
    };
  } catch (e: any) {
    return {
      url,
      status: 0,
      duration: Date.now() - start,
      hasMissingMsg: false,
      hasError: true,
      error: e.message,
    };
  }
}

async function runAudit() {
  console.log("==================================================");
  console.log("🔍 SGN Dashboard Routes Comprehensive Audit");
  console.log("==================================================\n");

  const results = [];
  for (const r of routes) {
    const res = await checkRoute("ar", r);
    results.push(res);
    const statusIcon = res.status === 200 && !res.hasMissingMsg && !res.hasError ? "✅" : "❌";
    console.log(`${statusIcon} /dashboard${r || "/"} [${res.status}] in ${res.duration}ms ${res.hasMissingMsg ? "⚠️ MISSING_MESSAGE" : ""} ${res.hasError ? "⚠️ ERROR" : ""}`);
  }

  console.log("\nAudit Complete!");
}

runAudit().catch(console.error);
