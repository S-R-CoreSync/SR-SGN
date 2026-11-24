// scripts/18-fill-euronews-bodies.ts
// يجلب النصّ الكامل لمقالات Euronews العربية التي نصّها المخزَّن مجرّد مقتطف قصير.
// المشكلة: خلاصة RSS لا تحوي جسم المقال، والنسخة العربية لها slug مختلف عن الإنجليزية
// (وإلا رجعت 404). لذلك نتبع خطوتين عبر قارئ Jina (يتجاوز حماية 406):
//   ١) من رابط euronews الإنجليزي نستخرج وسم <link hreflang="ar"> → الرابط العربي الصحيح.
//   ٢) من الرابط العربي نستخرج بيانات JSON-LD (articleBody) → جسم المقال العربي النظيف.
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

/** يقرأ صفحة عبر قارئ Jina بنمط HTML مع إمكانية تحديد عنصر، مع إعادة محاولة عند 429/5xx. */
async function jinaHtml(url: string, selector: string): Promise<{ ok: boolean; text: string; error?: string }> {
  for (let attempt = 0; attempt <= RETRIES; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const res = await fetch(`https://r.jina.ai/${url}`, {
        signal: controller.signal,
        headers: {
          Accept: "text/plain",
          "X-Return-Format": "html",
          "X-Target-Selector": selector,
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

/** من صفحة euronews الإنجليزية يستخرج الرابط العربي الصحيح (slug مختلف). */
async function findArabicUrl(enUrl: string): Promise<string | null> {
  const r = await jinaHtml(enUrl, 'link[hreflang="ar"]');
  if (!r.ok) return null;
  const m = r.text.match(/hreflang=["']ar["'][^>]*href=["']([^"']+)["']/i);
  if (!m) return null;
  return m[1].trim().replace(/^\/\//, "https://");
}

/** من صفحة المقال العربي يستخرج نصّ الجسم من بيانات JSON-LD (articleBody). */
async function fetchArabicBody(arUrl: string): Promise<string | null> {
  const r = await jinaHtml(arUrl, 'script[type="application/ld+json"]');
  if (!r.ok) return null;
  const m = r.text.match(/"articleBody"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) {
    try {
      return strip(JSON.parse('"' + m[1] + '"'));
    } catch {
      return strip(m[1]);
    }
  }
  // احتياطي: الوصف المختصر إن غاب الجسم
  const d = r.text.match(/"description"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (d) {
    try {
      return strip(JSON.parse('"' + d[1] + '"'));
    } catch {
      return strip(d[1]);
    }
  }
  return null;
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

    const arUrl = await findArabicUrl(link);
    if (!arUrl) {
      failed++;
      errors["no-arabic-url"] = (errors["no-arabic-url"] || 0) + 1;
      console.warn(`  ⚠️ ${p.title.slice(0, 45)} → لا رابط عربي`);
      await sleep(DELAY_MS);
      continue;
    }

    const body = await fetchArabicBody(arUrl);
    if (!body) {
      failed++;
      errors["no-body"] = (errors["no-body"] || 0) + 1;
      console.warn(`  ⚠️ ${p.title.slice(0, 45)} → لا جسم`);
      await sleep(DELAY_MS);
      continue;
    }

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
      console.log(`  --- معاينة (${body.length} حرف) ---\n${body.slice(0, 300)}\n  ---`);
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
