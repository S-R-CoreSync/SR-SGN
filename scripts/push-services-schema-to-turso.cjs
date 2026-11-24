/**
 * دفع نماذج الخدمات الجديدة (PartnerStore, BazaarItem, Supplier, CollectiveDeal)
 * من prisma/schema.prisma إلى قاعدة Turso الإنتاجية.
 *
 * الاستخدام: node scripts/push-services-schema-to-turso.cjs
 *
 * يقرأ TURSO_DATABASE_URL و TURSO_AUTH_TOKEN من .env وينشئ الجداول الأربعة
 * والفهارس المرتبطة بها مباشرة على Turso عبر @libsql/client.
 * آمن للتشغيل المتكرر (CREATE TABLE IF NOT EXISTS).
 */
const { createClient } = require("@libsql/client");
const path = require("path");
const fs = require("fs");

// تحميل .env يدوياً
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const m = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/);
    if (m) {
      const key = m[1].trim();
      const val = m[2].trim();
      // لا نكتب فوق متغيرات موجودة في البيئة بالفعل
      if (process.env[key] === undefined) process.env[key] = val;
    }
  }
}

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken || url === "[SENSITIVE]" || authToken === "[SENSITIVE]") {
  console.error("❌ TURSO_DATABASE_URL or TURSO_AUTH_TOKEN not set in .env");
  process.exit(1);
}

// تنظيف القيم (إزالة التنصيص والأحرف غير اللاتينية والمسافات)
const cleanUrl = url.replace(/[^\x20-\x7E]/g, "").trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
const cleanToken = authToken.replace(/[^\x20-\x7E]/g, "").trim().replace(/^["']|["']$/g, "");
const finalUrl = /^[a-z]+:\/\//i.test(cleanUrl) ? cleanUrl : `libsql://${cleanUrl}`;

async function main() {
  const client = createClient({ url: finalUrl, authToken: cleanToken });
  console.log("🔗 Connected to Turso:", finalUrl.replace(/\/\/.*@/, "//"));

  const statements = [
    // ==================== PartnerStore ====================
    `CREATE TABLE IF NOT EXISTS "PartnerStore" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "nameAr" TEXT NOT NULL,
      "nameNl" TEXT NOT NULL,
      "nameEn" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "discount" INTEGER NOT NULL,
      "city" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "cashbackType" TEXT NOT NULL,
      "rating" REAL NOT NULL DEFAULT 0,
      "reviewCount" INTEGER NOT NULL DEFAULT 0,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "isFeatured" INTEGER NOT NULL DEFAULT 0,
      "phone" TEXT,
      "whatsapp" TEXT,
      "website" TEXT,
      "logo" TEXT,
      "highlightAr" TEXT,
      "highlightNl" TEXT,
      "highlightEn" TEXT,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS "PartnerStore_category_isActive_idx" ON "PartnerStore"("category", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "PartnerStore_city_isActive_idx" ON "PartnerStore"("city", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "PartnerStore_isFeatured_isActive_idx" ON "PartnerStore"("isFeatured", "isActive")`,

    // ==================== BazaarItem ====================
    `CREATE TABLE IF NOT EXISTS "BazaarItem" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "titleAr" TEXT NOT NULL,
      "titleNl" TEXT NOT NULL,
      "titleEn" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "producerName" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "province" TEXT NOT NULL,
      "price" REAL NOT NULL,
      "unit" TEXT NOT NULL,
      "descriptionAr" TEXT,
      "descriptionNl" TEXT,
      "descriptionEn" TEXT,
      "whatsapp" TEXT NOT NULL,
      "delivery" INTEGER NOT NULL DEFAULT 0,
      "image" TEXT,
      "badgeAr" TEXT,
      "badgeNl" TEXT,
      "badgeEn" TEXT,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "views" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS "BazaarItem_category_isActive_idx" ON "BazaarItem"("category", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "BazaarItem_city_isActive_idx" ON "BazaarItem"("city", "isActive")`,

    // ==================== Supplier ====================
    `CREATE TABLE IF NOT EXISTS "Supplier" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "companyName" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "city" TEXT NOT NULL,
      "minOrder" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "kvk" TEXT NOT NULL,
      "verified" INTEGER NOT NULL DEFAULT 0,
      "contactEmail" TEXT,
      "contactPhone" TEXT,
      "contactWhatsapp" TEXT,
      "website" TEXT,
      "logo" TEXT,
      "badge" TEXT,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "isFeatured" INTEGER NOT NULL DEFAULT 0,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS "Supplier_category_isActive_idx" ON "Supplier"("category", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "Supplier_city_isActive_idx" ON "Supplier"("city", "isActive")`,
    `CREATE INDEX IF NOT EXISTS "Supplier_verified_isActive_idx" ON "Supplier"("verified", "isActive")`,

    // ==================== CollectiveDeal ====================
    `CREATE TABLE IF NOT EXISTS "CollectiveDeal" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "titleAr" TEXT NOT NULL,
      "titleNl" TEXT NOT NULL,
      "titleEn" TEXT NOT NULL,
      "category" TEXT NOT NULL,
      "provider" TEXT NOT NULL,
      "badgeAr" TEXT,
      "badgeNl" TEXT,
      "badgeEn" TEXT,
      "avgSavingYear" REAL NOT NULL,
      "perksAr" TEXT,
      "perksNl" TEXT,
      "perksEn" TEXT,
      "deadline" TEXT,
      "isActive" INTEGER NOT NULL DEFAULT 1,
      "createdAt" TEXT NOT NULL DEFAULT (datetime('now')),
      "updatedAt" TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE INDEX IF NOT EXISTS "CollectiveDeal_category_isActive_idx" ON "CollectiveDeal"("category", "isActive")`,
  ];

  let created = 0;
  let skipped = 0;

  for (const sql of statements) {
    try {
      await client.execute(sql);
      if (sql.startsWith("CREATE TABLE")) {
        const name = sql.match(/"(\w+)"/)?.[1] || "?";
        console.log(`✅ Table ready: ${name}`);
        created++;
      }
    } catch (e) {
      if (e.message?.includes("already exists")) {
        skipped++;
      } else {
        console.error("❌ Failed:", sql.slice(0, 60), "→", e.message);
      }
    }
  }

  // التحقق من وجود الجداول
  const check = await client.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name IN ('PartnerStore','BazaarItem','Supplier','CollectiveDeal') ORDER BY name`
  );
  console.log("\n📋 Tables on Turso:", check.rows.map(r => r.name).join(", "));

  console.log(`\n🎉 Done. Tables: ${created} ready, ${skipped} already existed.`);
  process.exit(0);
}

main().catch((e) => {
  console.error("💥 Fatal:", e.message);
  process.exit(1);
});
