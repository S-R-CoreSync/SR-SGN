/**
 * فحص ملفات البيئة: هل تحتوي قيماً بديلة (placeholders) مثل [SENSITIVE]؟
 * لا يطبع أي قيمة سرية — فقط طولها وأول 6 محارف ووجود النمط.
 */
const fs = require("fs");
const path = require("path");

const files = [".env", ".env.local", ".env.production", ".env.production.local", ".env.vercel"];
const keys = /^(NEXTAUTH_URL|NEXT_PUBLIC_APP_URL|TURSO_DATABASE_URL|QDRANT_URL|DATABASE_URL)$/;

for (const f of files) {
  const p = path.join(process.cwd(), f);
  if (!fs.existsSync(p)) {
    console.log(`\n${f}: (غير موجود)`);
    continue;
  }
  const stat = fs.statSync(p);
  console.log(`\n${f}  (${stat.size} bytes)`);
  for (const raw of fs.readFileSync(p, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i < 0) continue;
    const k = line.slice(0, i).trim();
    if (!keys.test(k)) continue;
    const v = line.slice(i + 1).trim().replace(/^["']|["']$/g, "");
    const placeholder = /\[SENSITIVE\]|\[REDACTED\]|xxx|your-/i.test(v);
    const host = (() => {
      try {
        return new URL(v).host;
      } catch {
        return "!! غير صالح";
      }
    })();
    console.log(`  ${k}: len=${v.length} host=${host} placeholder=${placeholder}`);
  }
}
