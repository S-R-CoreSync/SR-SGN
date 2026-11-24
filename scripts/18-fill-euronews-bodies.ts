// scripts/18-fill-euronews-bodies.ts
// يجلب النصّ الكامل لمقالات Euronews العربية التي نصّها المخزَّن مجرّد مقتطف قصير.
// خلاصة RSS لا تحوي جسم المقال، فيُقرأ من صفحة النسخة العربية (arabic.euronews.com)
// عبر قارئ Jina (يتجاوز حماية 406 التي تمنع الجلب المباشر).
// بعد التعبئة يصبح جسم المقال طويلاً فيستطيع سكربت الملخّصات (13) تلخيصه.
// قابل للاستئناف: يعالج فقط الصفوف التي نصّها المتاح < BODY_MIN_CHARS.
//   BODY_LIMIT   (افتراضي 25)      — عدد الصفوف لكل تشغيل.
//   BODY_DELAY_MS(افتراضي 1200)    — مهلة بين الطلبات.
//   BODY_MIN_CHARS (افتراضي 300)   — حدّ النصّ الذي نعتبره "قصيراً فيحتاج جلباً".
//   BODY_MAX_MS  (افتراضي 0)       — سقف زمني للتشغيل (0 = بلا حدّ).
//   BODY_DRY     ("1")             — معاينة فقط بلا كتابة في قاعدة البيانات.
// التشغيل: NODE_ENV=production npm run ai:fill-bodies

import "dotenv/config";
import { prisma } from "../src/lib/db";

const LIMIT = Number(process.env.BODY_LIMIT) || 25;
const DELAY_MS = Number(process.env.BODY_DELAY_MS) || 1200;
const MIN_CHARS = Number(process.env.BODY_MIN_CHARS) || 300;
const MAX_MS = Number(process.env.BODY_MAX_MS) || 0;
const DRY = process.env.BODY_DRY === "1";
const JINA = process.env.JINA_API_KEY;
const RETRIES = 4;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const strip = (s: string) => (s || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** يستخرج رابط المصدر من وسم __source:<name>:<url>. */
function sourceLink(tags: string | null): string | null {
  if (!tags) return null;
  for (const tag of tags.split(",")) {
    const m = tag.trim().match(/^__source:[^:]+:(.+)$/);
    if (m) return m[1].trim().replace(/^http:\/\//, "https://");
  }
  return null;
}

/** يحوّل رابط www.euronews.com إلى النسخة العربية arabic.euronews.com (نفس المسار). */
function arabicUrl(link: string): string {
  return link.replace(/^(https?:\/\/)(?:www\.)?euronews\.com\//, "$1arabic.euronews.com/");
}

/** يجلب صفحة عبر قارئ Jina مع تحديد جسم المقال، مع إعادة محاولة عند 429/5xx. */
async function fetchViaJina(url: string): Promise<{ ok: boolean; text: string; error?: string }> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`https://r.jina.ai/${url}`, {
        signal: controller.signal,
        headers: {
          "X-Target-Selector": "article",
          Accept: "text/plain",
          ...(JINA ? { Authorization: `Bearer ${JINA}` } : {}),
        },
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt === RETRIES) return { ok: false, text: "", error: `HTTP ${res.status}` };
        await sleep(1500 * (attempt + 1) + Math.floor(Math.random() * 700));
        continue;
      }
      if (!res.ok) return { ok: false, text: "", error: `HTTP ${res.status}` };
      return { ok: true, text: await res.text() };
    } catch (e) {
      if (attempt === RETRIES) return { ok: false, text: "", error: String((e as Error)?.message || e).slice(0, 120) };
      await sleep(1200 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, text: "", error: "retries exhausted" };
}

/** يستخرج جسم المقال العربي من مخرجات Jina (markdown) بعد إسقاط العناصر الجانبية. */
function extractBody(markdown: string): string {
  const marker = "Markdown Content:";
  const i = markdown.indexOf(marker);
  let body = i >= 0 ? markdown.slice(i + marker.length) : markdown;
  const out: string[] = [];
  for (const raw of body.split("\n")) {
    let line = raw.trim();
    if (!line) continue;
    if (line.startsWith("![")) continue; // صور/إعلانات
    if (line.includes("اعلان")) continue; // إعلانات
    if (/^(نشرت في|آخر تحديث|Published|Updated)/i.test(line)) continue;
    // أسطر روابط تنقّل/قوائم فقط
    if (/^[*\-+\s]*\[[^\]]*\]\([^)]*\)\s*$/.test(line) && line.length < 120) continue;
    // نجريد صيغة الروابط ونُبقي النص
    line = line
      .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
      .replace(/\*\*/g, "")
      .replace(/[*`_>#]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (line.length < 2) continue;
    out.push(line);
  }
  return out.join("\n\n");
}

async function main() {
  const startedAt = Date.now();
  const overBudget = () => MAX_MS > 0 && Date.now() - startedAt >= MAX_MS;

  // كل مقالات euronews العربية، ثم نرشّح في JS حسب طول النصّ (Prisma لا يفلتر بالطول).
  const rows = await prisma.post.findMany({
    where: { published: true, locale: "ar", source: { contains: "euronews" } },
    select: { id: true, title: true, content: true, excerpt: true, tags: true },
    orderBy: { createdAt: "desc" },
  });
  const targets = rows.filter((r) => {
    const plain = strip(r.content || "");
    const ex = strip(r.excerpt || "");
    return Math.max(plain.length, ex.length) < MIN_CHARS && sourceLink(r.tags);
  });
  console.log(`euronews ar posts=${rows.length} | short(needs body)=${targets.length}`);
  const work = targets.slice(0, LIMIT);

  let done = 0;
  let failed = 0;
  const errors: Record<string, number> = {};

  for (const p of work) {
    if (overBudget()) {
      console.warn(`\n⏱️ انتهى السقف الزمني — توقّف نظيف، تستأنف الجولة التالية.`);
      break;
    }
    const link = sourceLink(p.tags)!;
    const url = arabicUrl(link);
    const r = await fetchViaJina(url);
    if (!r.ok) {
      failed++;
      errors[r.error || "unknown"] = (errors[r.error || "unknown"] || 0) + 1;
      console.warn(`  ⚠️ ${p.title.slice(0, 45)} → ${r.error}`);
      await sleep(DELAY_MS);
      continue;
    }
    const body = extractBody(r.text);
    const arabicChars = (body.match(/[\u0600-\u06FF]/g) || []).length;
    if (body.length < 400 || arabicChars < 200) {
      failed++;
      errors["short-or-non-arabic"] = (errors["short-or-non-arabic"] || 0) + 1;
      console.warn(`  ⚠️ ${p.title.slice(0, 45)} → نصّ غير كافٍ (len=${body.length}, ar=${arabicChars})`);
      await sleep(DELAY_MS);
      continue;
    }
    if (!DRY) {
      await prisma.post.update({ where: { id: p.id }, data: { content: body } });
    } else if (done < 2) {
      console.log(`  --- معاينة (${body.length} حرف) ---\n${body.slice(0, 500)}\n  ---`);
    }
    done++;
    console.log(`  [${done}] (${body.length} حرف) ${p.title.slice(0, 50)}`);
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ filled=${done} | failed=${failed} | errors=${JSON.stringify(errors)}${DRY ? " (dry-run)" : ""}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
