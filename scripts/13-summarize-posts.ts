// scripts/13-summarize-posts.ts
// تعبئة الملخّصات الذكية (٢-٣ جمل) للأخبار العربية الموجودة بلا ملخّص.
// يُشغَّل مرة واحدة (أو دورياً) لتعبئة الأرشيف؛ الأخبار الجديدة يولّد السينك ملخّصها تلقائياً.
// قابل للاستئناف: يختار فقط الصفوف التي ملخّصها فارغ، فلا يُعيد معالجة صف أُنجز.
//   SUMMARY_BATCH (افتراضي 400) — سقف عدد الصفوف لكل تشغيل.
//   SUMMARY_DELAY_MS (افتراضي 2500) — مهلة بين النداءات.
//   SUMMARY_QUOTA_WAIT_MS (افتراضي 60000) — انتظار عند نفاد الحصة/حدّ المعدّل ثم إعادة المحاولة.
//   SUMMARY_QUOTA_RETRIES (افتراضي 60) — أقصى عدد إعادات محاولة لنفس الصف عند نفاد الحصة.
//   SUMMARY_MODELS — نماذج Groq مفصولة بفواصل للتدوير (لكل نموذج حصته اليومية المنفصلة).
//   SUMMARY_MIN_CHARS (افتراضي 150) — أقلّ طول نصّ مقبول للتلخيص (الأقصر منه يُتخطّى:
//     الأخبار القصيرة/الفيديو لا يكفي نصّها لتلخيص ذي معنى).
//   SUMMARY_MAX_MS (افتراضي 0 = بلا حدّ) — سقف زمني للتشغيل (مفيد للتشغيل المجدول).

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { generateSummary } from "../src/lib/ai/text";

const DELAY_MS = Number(process.env.SUMMARY_DELAY_MS) || 2500; // مهلة بين النداءات لاحترام حدود Groq
const BATCH = Number(process.env.SUMMARY_BATCH) || 400; // سقف لكل تشغيل (يحمي الحصة اليومية)
const MAX_MS = Number(process.env.SUMMARY_MAX_MS) || 0; // سقف زمني (0 = بلا حدّ)
const QUOTA_WAIT_MS = Number(process.env.SUMMARY_QUOTA_WAIT_MS) || 60_000;
const QUOTA_MAX_RETRIES = Number(process.env.SUMMARY_QUOTA_RETRIES) || 60;
// أقلّ طول نصّ مقبول للتلخيص — الأقصر منه يُتخطّى (نصوص الفيديو/النشرات لا تكفي).
const MIN_CHARS = Number(process.env.SUMMARY_MIN_CHARS) || 150;

/** نماذج Groq للتدوير عند نفاد حصة أحدها (لكل نموذج حصته اليومية المنفصلة).
 *  الافتراضي: ثلاثة نماذج = ثلاثة حصص مجانية منفصلة (TPD) بلا أي تكلفة. */
const MODELS = (process.env.SUMMARY_MODELS || "qwen/qwen3.8-27b,openai/gpt-oss-120b,openai/gpt-oss-20b")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/** أخطاء نفاد الحصة/حدّ المعدّل — نصبر ونعيد المحاولة بدل احتسابها فشلاً. */
function isQuotaError(message: string): boolean {
  return /tokens per day|tokens per minute|per minute \((?:TPM|OTPM)|rate_limit_exceeded|Request too large|\b429\b/i.test(
    message
  );
}

/** مدّة الانتظار التي يطلبها المزوّد من رسالة 429 (صيغة «Please try again in 10m54.912s»). */
function parseQuotaWaitMs(message: string): number | null {
  const m = message.match(/try again in\s+(?:(\d+)m)?([\d.]+)s/i);
  if (!m) return null;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = m[2] ? Number(m[2]) : 0;
  if (!mins && !secs) return null;
  return Math.round((mins * 60 + secs) * 1000);
}

const where = { published: true, locale: "ar", OR: [{ summary: null }, { summary: "" }] };

async function main() {
  const startedAt = Date.now();
  const overBudget = () => MAX_MS > 0 && Date.now() - startedAt >= MAX_MS;

  const posts = await prisma.post.findMany({
    where,
    select: { id: true, title: true, excerpt: true, content: true },
    orderBy: { createdAt: "desc" },
    take: BATCH,
  });
  console.log(`Found ${posts.length} Arabic posts without a summary.`);

  let done = 0;
  let skippedShort = 0;
  for (const p of posts) {
    if (overBudget()) {
      console.warn(`\n⏱️ انتهى السقف الزمني — توقّف نظيف، تستأنف الجولة التالية.`);
      break;
    }
    // نلخّص العنوان + النص المتاح. نأخذ الأطول بين المقتطف والجسم (مُنزَّعَين من HTML):
    // بعض المقالات مقتطفها سطر قصير بينما جسمها طويل، والعكس.
    const strip = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const ex = strip(p.excerpt || "");
    const body = strip(p.content || "");
    const plain = body.length > ex.length ? body : ex;
    if (plain.length < MIN_CHARS) {
      skippedShort++;
      continue;
    }

    let quotaRetries = 0;
    // عدد النماذج التي جُرِّبت لهذا الصف منذ آخر نجاح — يمنع انتظاراً طويلاً ما دام هناك
    // نموذج لم نجرّبه بعد (لكل نموذج حصته المنفصلة، فقد يكون متاحاً).
    let rotatedModels = 0;
    while (true) {
      try {
        const summary = (await generateSummary(p.title, plain.slice(0, 2000), "ar")).trim();
        // العزل اللغوي: نتخطى أي ملخّص لا يحتوي حرفاً عربياً.
        if (!/[\u0600-\u06FF]/.test(summary)) break;

        await prisma.post.update({ where: { id: p.id }, data: { summary } });
        done++;
        console.log(`  [${done}] ${p.title.slice(0, 55)}`);
        break;
      } catch (e) {
        const msg = (e as Error).message;

        // نفاد الحصة اليومية / حدّ المعدّل: ننتظر ونعيد نفس الصف (لا نحتسبه فشلاً).
        if (isQuotaError(msg) && quotaRetries < QUOTA_MAX_RETRIES) {
          quotaRetries++;

          // دوّر النموذج بلا انتظار ما دام هناك نموذج لم نجرّبه بعد (قد تكون حصته متاحة).
          let rotated = false;
          if (MODELS.length > 1 && rotatedModels < MODELS.length - 1) {
            const current = process.env.GROQ_MODEL || MODELS[0];
            const idx = MODELS.indexOf(current);
            const next = MODELS[(idx + 1) % MODELS.length];
            if (next !== current) {
              process.env.GROQ_MODEL = next;
              rotatedModels++;
              rotated = true;
              console.warn(`  🔄 تبديل النموذج: ${current} → ${next}`);
            }
          }

          // جرّبنا كل النماذج → لا مفرّ من انتظار انفتاح نافذة الحصة (كما يطلب المزوّد).
          const wait = rotated ? 1500 : Math.max(QUOTA_WAIT_MS, parseQuotaWaitMs(msg) ?? 0) + 2000;
          if (MAX_MS > 0 && Date.now() - startedAt + wait >= MAX_MS) {
            console.warn(`  ⏱️ الانتظار (${Math.round(wait / 1000)}s) يتجاوز السقف الزمني — توقّف نظيف.`);
            break;
          }
          if (!rotated) {
            console.warn(
              `  ⏳ حصة منتهية — انتظار ${Math.round(wait / 1000)}s ثم إعادة المحاولة (${quotaRetries}/${QUOTA_MAX_RETRIES})`
            );
          }
          await sleep(wait);
          continue;
        }

        console.warn(`  ⚠️ ${p.id}: ${msg.slice(0, 100)}`);
        break;
      }
    }
    await sleep(DELAY_MS);
  }

  const left = await prisma.post.count({ where });
  console.log(`\n✅ Summarized ${done} | remaining=${left}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
