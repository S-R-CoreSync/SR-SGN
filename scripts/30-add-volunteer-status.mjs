import { createClient } from "@libsql/client";

/**
 * إضافة عمود حالة المتطوعين إلى قاعدة الإنتاج (Turso) دون مس أي بيانات.
 * idempotent: يُشغّل أكثر من مرة بأمان.
 */
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  console.error("TURSO_DATABASE_URL / TURSO_AUTH_TOKEN غير موجودين في البيئة");
  process.exit(1);
}

const client = createClient({ url, authToken });

try {
  const info = await client.execute({ sql: `PRAGMA table_info("Volunteer")`, args: [] });
  const hasStatus = info.rows.some((row) => row.name === "status");

  if (hasStatus) {
    console.log('Volunteer.status موجود بالفعل — لا شيء لتغييره');
  } else {
    await client.execute({
      sql: `ALTER TABLE "Volunteer" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'new'`,
      args: [],
    });
    console.log("✅ أُضيف Volunteer.status إلى Turso");
  }

  const check = await client.execute({ sql: `SELECT status, COUNT(*) AS c FROM "Volunteer" GROUP BY status`, args: [] });
  console.log("الحالات الحالية:", check.rows);
} finally {
  client.close();
}
