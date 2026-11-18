const fs = require("fs");
const env = fs.readFileSync(".env", "utf8");
const get = (k) => {
  const m = env.match(new RegExp("^" + k + "=(.*)$", "m"));
  return m ? m[1].trim().replace(/^["']|["']$/g, "") : "";
};
const token = get("VERCEL_TOKEN");
const projectId = "prj_RGqEd1XDA7OJAvxFvXQFMhhFzMkX";
const teamId = "team_O5UR5zMfXBwk7q14yzngMFNf";
const H = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

const keys = ["SMTP_FROM_NAME", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"];

(async () => {
  for (const key of keys) {
    const value = get(key);
    if (!value) {
      console.log(`${key}: فارغ محلياً — تخطّي`);
      continue;
    }
    for (const target of ["production", "preview"]) {
      const res = await fetch(`https://api.vercel.com/v10/projects/${projectId}/env?teamId=${teamId}&upsert=true`, {
        method: "POST",
        headers: H,
        body: JSON.stringify({ key, value, type: "encrypted", target: [target] }),
      });
      const txt = res.ok ? "OK" : (await res.text()).slice(0, 140);
      console.log(`${key} [${target}] ${res.status} ${txt}`);
    }
  }
})();
