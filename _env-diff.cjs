const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};
const token = get("VERCEL_TOKEN");
const projectId = "prj_RGqEd1XDA7OJAvxFvXQFMhhFzMkX";
const teamId = "team_O5UR5zMfXBwk7q14yzngMFNf";
const H = { Authorization: `Bearer ${token}` };

const localKeys = [...new Set(env.split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).map((l) => l.split("=")[0]))];

(async () => {
  const res = await fetch(`https://api.vercel.com/v9/projects/${projectId}/env?teamId=${teamId}&decrypt=false&per_page=100`, { headers: H });
  const json = await res.json();
  if (!res.ok) return console.log("list failed:", res.status, JSON.stringify(json).slice(0, 200));
  const remote = json.envs || [];
  const remoteKeys = new Set(remote.map((e) => e.key));
  console.log("vercel keys:", remoteKeys.size, "| local keys:", localKeys.length);
  console.log("\nموجود محلياً وغائب عن Vercel:");
  const missing = localKeys.filter((k) => !remoteKeys.has(k));
  console.log(missing.length ? missing.join(", ") : "  (لا شيء)");
  console.log("\nموجود على Vercel وليس محلياً:");
  console.log([...remoteKeys].filter((k) => !localKeys.includes(k)).join(", ") || "  (لا شيء)");

  const targets = {};
  for (const e of remote) targets[e.key] = (targets[e.key] || []).concat(e.target);
  console.log("\nتفاصيل المفاتيح المشتركة (targets):");
  for (const k of localKeys.filter((k) => remoteKeys.has(k))) console.log(`  ${k.padEnd(28)} ${targets[k].join(",")}`);
})();
