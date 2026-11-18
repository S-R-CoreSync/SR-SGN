const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};
const secret = get("CRON_SECRET");
const base = "https://sgn-drab.vercel.app";
const sources = ["sy-nl.org", "youtube", "facebook-sgn", "nos-netherlands", "euronews-europe", "euronews-business", "euronews-culture"];

(async () => {
  for (const src of sources) {
    const started = Date.now();
    try {
      const r = await fetch(base + "/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-cron-secret": secret },
        body: JSON.stringify({ source: src }),
        signal: AbortSignal.timeout(75_000),
      });
      const t = await r.text();
      let brief = t.slice(0, 200);
      try {
        const j = JSON.parse(t);
        const x = j.results?.[0];
        brief = x
          ? `fetched=${x.fetched} new=${x.new} updated=${x.updated} skipped=${x.skipped} errors=${x.errors.length}`
          : brief;
      } catch {}
      console.log(`${String(r.status).padEnd(4)} ${src.padEnd(20)} ${((Date.now() - started) / 1000).toFixed(1)}s  ${brief}`);
    } catch (e) {
      console.log(`ERR  ${src.padEnd(20)} ${((Date.now() - started) / 1000).toFixed(1)}s  ${e.name}`);
    }
  }
})();
