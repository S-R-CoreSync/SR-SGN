import fs from "fs";
const content = fs.readFileSync(".env", "utf8");
for (const line of content.split("\n")) {
  if (line.trim().startsWith("TURSO_DATABASE_URL=")) {
    const raw = line.split("=").slice(1).join("=").trim();
    console.log("Raw chars:", [...raw.slice(0, 15)].map(c => `${c} (${c.charCodeAt(0)})`));
  }
}
