
const dashboardRoutes = [
  "/dashboard",
  "/dashboard/ai",
  "/dashboard/stats",
  "/dashboard/member-profile",
  "/dashboard/settings",
  "/dashboard/pages",
  "/dashboard/events",
  "/dashboard/regulations",
  "/dashboard/board",
  "/dashboard/landing",
  "/dashboard/media",
  "/dashboard/facebook-sync",
  "/dashboard/members",
  "/dashboard/members/vault",
  "/dashboard/membership-settings",
  "/dashboard/volunteers",
  "/dashboard/tasks",
  "/dashboard/messages",
  "/dashboard/comments",
  "/dashboard/subscribers",
  "/dashboard/donations",
  "/dashboard/ads",
  "/dashboard/surveys",
  "/dashboard/mobile-control",
  "/dashboard/users",
  "/dashboard/roles",
];

async function checkAll() {
  console.log("🔍 Checking all dashboard routes on http://localhost:3000...\n");
  const locales = ["ar", "nl", "en"];
  let failures = 0;

  for (const route of dashboardRoutes) {
    for (const locale of locales) {
      const url = `http://localhost:3000/${locale}${route}`;
      try {
        const start = Date.now();
        const res = await fetch(url, { redirect: "manual" });
        const time = Date.now() - start;
        const text = await res.text();
        const hasMissingKey = text.includes("MISSING_MESSAGE") || text.includes("Could not resolve");
        const has500 = res.status >= 500;
        
        if (hasMissingKey || has500 || res.status === 404) {
          failures++;
          console.error(`❌ [${res.status}] [${time}ms] ${url}`);
          if (hasMissingKey) {
            const matches = text.match(/MISSING_MESSAGE:[^\n<]+/g);
            console.error("   Missing keys:", matches ? matches.slice(0, 3) : "Unknown");
          }
        } else {
          console.log(`✅ [${res.status}] [${time}ms] ${url}`);
        }
      } catch (e: any) {
        failures++;
        console.error(`❌ [ERROR] ${url}:`, e.message);
      }
    }
  }

  console.log(`\nSummary: ${failures === 0 ? "ALL ROUTES PASSED PERFECTLY!" : `Found ${failures} issues.`}`);
}

checkAll().catch(console.error);
