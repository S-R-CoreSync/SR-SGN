/**
 * set-env.ts
 *
 * Build-time script that sets the API URL for the mobile app.
 *
 * Usage:
 *   npx tsx scripts/set-env.ts dev   →  http://localhost:3000
 *   npx tsx scripts/set-env.ts prod  →  https://sgn-drab.vercel.app
 *
 * This overwrites the base URL in constants/config.ts
 * so the built APK/IPA connects to the correct server.
 */

import * as fs from "fs";
import * as path from "path";

const CONFIG_PATH = path.resolve(__dirname, "../constants/config.ts");
const mode = process.argv[2]; // "dev" | "prod"

if (!mode || !["dev", "prod"].includes(mode)) {
  console.error("Usage: npx tsx scripts/set-env.ts <dev|prod>");
  process.exit(1);
}

const PRODUCTION_URL = "https://sgn-drab.vercel.app";
const DEV_URL = "http://localhost:3000";

let content = fs.readFileSync(CONFIG_PATH, "utf-8");
let changed = 0;

/** استبدال آمن: يتحقق من وجود النمط قبل التعديل */
function replace(pattern: RegExp, replacement: string) {
  if (pattern.test(content)) {
    content = content.replace(pattern, replacement);
    changed++;
  }
}

// 1) رابط الإنتاج الأساسي (تُشتق منه API_URL و WS_URL)
replace(/const PRODUCTION_BASE_URL = "[^"]*"/, `const PRODUCTION_BASE_URL = "${PRODUCTION_URL}"`);

// 2) قاعدة التطوير
replace(
  /const DEV_API_BASE = process\.env\.EXPO_PUBLIC_API_URL \|\| "[^"]*"/,
  `const DEV_API_BASE = process.env.EXPO_PUBLIC_API_URL || "${DEV_URL}"`
);

// 3) دعم الإصدارات القديمة من config.ts (نسخة API/WS المنفصلة)
replace(/const PRODUCTION_API_URL = "[^"]*"/, `const PRODUCTION_API_URL = "${PRODUCTION_URL}/api"`);
replace(/const PRODUCTION_WS_URL = "[^"]*"/, `const PRODUCTION_WS_URL = "wss://${new URL(PRODUCTION_URL).host}"`);
replace(/APP_URL: IS_PRODUCTION \? "[^"]*" : DEV_API_BASE/, `APP_URL: IS_PRODUCTION ? "${PRODUCTION_URL}" : DEV_API_BASE`);

if (changed === 0) {
  console.error("[set-env] لم يتم العثور على أي نمط قابل للتعديل في constants/config.ts");
  process.exit(1);
}

fs.writeFileSync(CONFIG_PATH, content, "utf-8");
console.log(`[set-env] Mobile environment = ${mode}`);
console.log(`[set-env] Development base: ${DEV_URL}`);
console.log(`[set-env] Production base : ${PRODUCTION_URL}`);
