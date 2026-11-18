const fs = require("fs");

const raw = fs.readFileSync(".env");
console.log("first bytes:", [...raw.slice(0, 3)].map((b) => b.toString(16)).join(" "));
const text = raw.toString("utf8");

const fixed = text.replace(/^SMTP_FROM_NAME=.*$/m, 'SMTP_FROM_NAME="SGN"');
if (fixed === text) {
  console.log("SMTP_FROM_NAME line not found");
} else {
  fs.writeFileSync(".env", fixed, "utf8");
  console.log("SMTP_FROM_NAME fixed to SGN");
}

const check = fs.readFileSync(".env", "utf8");
const line = check.split(/\r?\n/).find((l) => l.startsWith("SMTP_FROM_NAME="));
console.log("now:", line);
console.log("keys:", check.split(/\r?\n/).filter((l) => /^[A-Z0-9_]+=/.test(l)).length);
