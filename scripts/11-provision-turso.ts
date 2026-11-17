/**
 * إنشاء قاعدة بيانات Turso تلقائياً (بدون الحاجة إلى Turso CLI الذي لا يملك نسخة لويندوز).
 *
 * المتطلبات:
 *   1) أنشئ حساباً على https://turso.tech (تسجيل الدخول بحساب GitHub).
 *   2) من https://turso.tech/app/settings/api-tokens أنشئ توكن حساب (Platform API Token).
 *   3) ضعه في ملف .env بهذا الشكل:
 *        TURSO_PLATFORM_TOKEN=eyJ...
 *
 * ثم:
 *   npm run db:turso:provision          # ينشئ قاعدة sgn-prod ويكتب URL والتوكن في .env
 *   npm run db:migrate:turso            # ينسخ البيانات من prisma/dev.db إلى Turso
 *
 * خيارات:
 *   --name=sgn-prod     اسم القاعدة (افتراضي: sgn-prod)
 *   --org=<slug>        منظمة محددة (افتراضي: أول منظمة تظهر في الحساب)
 *   --dry-run           عرض ما سيحدث دون أي تعديل
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";

const API = "https://api.turso.tech/v1";
const ENV_PATH = path.resolve(process.cwd(), ".env");
const DEFAULT_DB_NAME = "sgn-prod";

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dbName =
  args.find((a) => a.startsWith("--name="))?.split("=")[1]?.trim() || DEFAULT_DB_NAME;
const orgArg = args.find((a) => a.startsWith("--org="))?.split("=")[1]?.trim() || "";

function fail(msg: string): never {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function log(msg: string) {
  console.log(msg);
}

/** تنظيف قيمة من .env: إزالة التنصيص والأحرف غير اللاتينية والمسافات. */
function cleanSecret(value: string | undefined): string {
  return (value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim()
    .replace(/^["']|["']$/g, "");
}

type ApiResult<T> = { ok: boolean; status: number; data: T | null; raw: string };

async function api<T>(endpoint: string, init: RequestInit = {}): Promise<ApiResult<T>> {
  const token = cleanSecret(process.env.TURSO_PLATFORM_TOKEN);
  const res = await fetch(`${API}${endpoint}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
  const raw = await res.text();
  let data: T | null = null;
  try {
    data = raw ? (JSON.parse(raw) as T) : null;
  } catch {
    /* رد غير JSON */
  }
  return { ok: res.ok, status: res.status, data, raw };
}

/** تحديث متغيّر في .env (استبدال السطر أو إضافته) دون المساس ببقية الملف. */
function setEnvVar(key: string, value: string) {
  if (!fs.existsSync(ENV_PATH)) fail(`ملف .env غير موجود: ${ENV_PATH}`);
  const content = fs.readFileSync(ENV_PATH, "utf8");
  const line = `${key}=${value}`;
  const re = new RegExp(`^${key}\\s*=.*$`, "m");
  const next = re.test(content)
    ? content.replace(re, line)
    : `${content.replace(/\s*$/, "")}\n${line}\n`;
  if (dryRun) {
    log(`   [تجريبي] ${key}=${value.slice(0, 18)}…`);
    return;
  }
  fs.writeFileSync(ENV_PATH, next, "utf8");
}

async function main() {
  const token = cleanSecret(process.env.TURSO_PLATFORM_TOKEN);
  if (!token || token === "[SENSITIVE]") {
    fail(
      "لا يوجد TURSO_PLATFORM_TOKEN في .env.\n" +
        "أنشئ توكن حساب من: https://turso.tech/app/settings/api-tokens\n" +
        "ثم أضف السطر:  TURSO_PLATFORM_TOKEN=eyJ...\n" +
        "بعدها أعد تشغيل: npm run db:turso:provision"
    );
  }

  log("☁️  Turso — إنشاء/فحص قاعدة البيانات");
  log("");

  // ١) المنظمات
  const orgs = await api<{ organizations?: Array<{ slug: string; name?: string; type?: string }> }>(
    "/organizations"
  );
  if (!orgs.ok) {
    fail(
      `تعذّر جلب المنظمات (HTTP ${orgs.status}): ${orgs.raw || "بدون تفاصيل"}\n` +
        "تأكد أن التوكن هو Platform API Token (يبدأ غالباً بـ eyJ) وأنه لم يُلغَ."
    );
  }
  const list = orgs.data?.organizations ?? [];
  if (list.length === 0) fail("لا توجد منظمات في هذا الحساب — أنشئ حساباً/منظمة أولاً على turso.tech");

  const chosen = orgArg
    ? list.find((o) => o.slug === orgArg)
    : list.find((o) => o.type !== "personal") ?? list[0];
  if (!chosen) fail(`لم أجد المنظمة: ${orgArg}. المتاح: ${list.map((o) => o.slug).join(", ")}`);

  log(`🏢 المنظمة: ${chosen.slug}${chosen.name ? ` (${chosen.name})` : ""}`);

  // ٢) المجموعات (groups)
  const groups = await api<{ groups?: Array<{ name: string; primary?: string }> }>(
    `/organizations/${encodeURIComponent(chosen.slug)}/groups`
  );
  const groupList = groups.data?.groups ?? [];
  if (!groups.ok || groupList.length === 0) {
    fail(
      `تعذّر جلب المجموعات (HTTP ${groups.status}): ${groups.raw}\n` +
        "افتح لوحة Turso وتأكد من وجود مجموعة واحدة على الأقل (تُنشأ تلقائياً باسم default)."
    );
  }
  const groupName = (groupList.find((g) => g.primary) ?? groupList[0]).name;
  log(`📦 المجموعة: ${groupName}`);

  // ٣) هل القاعدة موجودة؟
  const known = await api<{ databases?: Array<{ Name: string; Hostname: string }> }>(
    `/organizations/${encodeURIComponent(chosen.slug)}/databases`
  );
  const existing = (known.data?.databases ?? []).find(
    (d) => d.Name?.toLowerCase() === dbName.toLowerCase()
  );

  let hostname = existing?.Hostname ?? "";

  if (existing) {
    log(`ℹ️  القاعدة «${dbName}» موجودة مسبقاً — سيتم تحديث بيانات الاتصال فقط.`);
  } else if (dryRun) {
    log(`   [تجريبي] سيتم إنشاء قاعدة باسم «${dbName}» في المجموعة «${groupName}»`);
    return;
  } else {
    log(`🆕 إنشاء قاعدة «${dbName}» …`);
    const created = await api<{
      database?: { Hostname?: string; Name?: string };
      Hostname?: string;
      Name?: string;
    }>(`/organizations/${encodeURIComponent(chosen.slug)}/databases`, {
      method: "POST",
      body: JSON.stringify({ name: dbName, group: groupName }),
    });
    if (!created.ok) fail(`فشل إنشاء القاعدة (HTTP ${created.status}): ${created.raw}`);
    hostname = created.data?.database?.Hostname ?? created.data?.Hostname ?? "";
    if (!hostname) {
      // نحاول قراءتها مرة أخرى
      const again = await api<{ database?: { Hostname?: string } }>(
        `/organizations/${encodeURIComponent(chosen.slug)}/databases/${encodeURIComponent(dbName)}`
      );
      hostname = again.data?.database?.Hostname ?? "";
    }
  }

  if (!hostname) {
    // محاولة أخيرة: قراءة تفاصيل القاعدة
    const details = await api<{ database?: { Hostname?: string } }>(
      `/organizations/${encodeURIComponent(chosen.slug)}/databases/${encodeURIComponent(dbName)}`
    );
    hostname = details.data?.database?.Hostname ?? "";
  }
  if (!hostname) fail("لم أستطع قراءة عنوان (Hostname) القاعدة من Turso.");

  const url = `libsql://${hostname}`;
  log(`🔗 العنوان: ${url}`);

  // ٤) إنشاء توكن وصول للقاعدة (بلا انتهاء، صلاحية كاملة)
  log("🔑 إنشاء توكن وصول للقاعدة …");
  const tok = await api<{ jwt?: string }>(
    `/organizations/${encodeURIComponent(chosen.slug)}/databases/${encodeURIComponent(
      dbName
    )}/auth/tokens?expiration=never&authorization=full-access`,
    { method: "POST", body: JSON.stringify({}) }
  );
  const jwt = tok.data?.jwt ?? "";
  if (!tok.ok || !jwt) fail(`فشل إنشاء التوكن (HTTP ${tok.status}): ${tok.raw}`);

  // ٥) الكتابة في .env
  setEnvVar("TURSO_DATABASE_URL", url);
  setEnvVar("TURSO_AUTH_TOKEN", jwt);

  log("");
  log("════════════════════════════════════════");
  if (dryRun) {
    log("🧪 وضع تجريبي — لم يُعدّل أي ملف.");
  } else {
    log("✅ تم تحديث .env بالقيم الحقيقية:");
    log("   TURSO_DATABASE_URL + TURSO_AUTH_TOKEN");
    log("");
    log("الخطوة التالية:  npm run db:migrate:turso");
    log("ثم أضف نفس المتغيّرين في لوحة Vercel (Production) وأعد النشر.");
  }
  log("════════════════════════════════════════");
  log("");
}

main().catch((e) => fail(e?.message || String(e)));
