// scripts/17-backfill-locale-translations.ts
// تعبئة الأرشيف: تصحيح صفوف nl/en القديمة التي تحمل نص المصدر الأصلي بدل لغة القسم.
//   - nos-netherlands (مصدرها هولندي): صفوف en تحتاج ترجمة nl→en.
//   - euronews-*      (مصدرها إنجليزي): صفوف nl تحتاج ترجمة en→nl.
// قابل للاستئناف: يضع علامة __translated في tags فلا يُعيد معالجة الصف مرتين.
//   BACKFILL_LIMIT (افتراضي 40) — عدد الصفوف لكل تشغيل (يحمي حصة Groq).
//   BACKFILL_DELAY_MS (افتراضي 3500) — مهلة بين النداءات.
//   BACKFILL_QUOTA_WAIT_MS (افتراضي 60000) — انتظار عند نفاد الحصة/حدّ المعدّل ثم إعادة المحاولة.
//   BACKFILL_QUOTA_RETRIES (افتراضي 60) — أقصى عدد إعادات محاولة لنفس الصف عند نفاد الحصة.
//   BACKFILL_MODELS — قائمة نماذج Groq مفصولة بفواصل للتدوير عند نفاد حصة أحدها.
//     القائمة الافتراضية تضمّ ثلاثة نماذج، لكلٍّ حصته اليومية المجانية المنفصلة (TPD):
//       openai/gpt-oss-120b + openai/gpt-oss-20b + qwen/qwen3.8-27b
//     هذا يضاعف المتنفّس المجاني ثلاث مرات بلا أي تكلفة.
//   BACKFILL_MAX_MS (افتراضي 0 = بلا حدّ) — سقف زمني للتشغيل (مفيد للتشغيل المجدول).
// عند نفاد حصة Groq اليومية تتحرّر التوكنات تدريجياً (نافذة متدحرجة)، فيصبر السكربت ويعيد
// المحاولة بدل أن يفشل ويتوقّف — هكذا يكمل الأرشيف على مدى ساعات بلا أي تكلفة.
// التشغيل: NODE_ENV=production npm run ai:backfill-translations

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { translateArticleToLocale } from "../src/lib/sync/translator";
import type { ExtractedArticle } from "../src/lib/sync/types";

const LIMIT = Number(process.env.BACKFILL_LIMIT) || 40;
const DELAY_MS = Number(process.env.BACKFILL_DELAY_MS) || 3500;
const MAX_CONSECUTIVE_FAILS = Number(process.env.BACKFILL_MAX_FAILS) || 5;
const QUOTA_WAIT_MS = Number(process.env.BACKFILL_QUOTA_WAIT_MS) || 60_000;
const QUOTA_MAX_RETRIES = Number(process.env.BACKFILL_QUOTA_RETRIES) || 60;
/** سقف زمني للتشغيل بالمللي ثانية (0 = بلا حدّ). مفيد للتشغيل المجدول: ينتهي التشغيل
 *  بنظافة بعد مدّة محدّدة ثم تستأنف الجدولة من حيث توقّف (النافذة التالية). */
const MAX_MS = Number(process.env.BACKFILL_MAX_MS) || 0;

/** نماذج Groq للتدوير عند نفاد حصة أحدها (لكل نموذج حصته اليومية المنفصلة).
 *  الافتراضي: ثلاثة نماذج = ثلاثة حصص مجانية منفصلة (TPD) بلا أي تكلفة. */
const MODELS = (process.env.BACKFILL_MODELS || "openai/gpt-oss-120b,openai/gpt-oss-20b,qwen/qwen3.8-27b")
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** أخطاء نفاد الحصة/حدّ المعدّل — نصبر ونعيد المحاولة بدل احتسابها فشلاً. */
function isQuotaError(message: string): boolean {
  return /tokens per day|tokens per minute|per minute \((?:TPM|OTPM)|rate_limit_exceeded|Request too large|\b429\b/i.test(
    message
  );
}

/**
 * يستخرج مدّة الانتظار التي يطلبها المزوّد من رسالة 429
 * (صيغة Groq: «Please try again in 10m54.912s.» أو «in 11.232s»).
 * بدونها كان السكربت ينتظر 60s فقط ثم يرجع ويُصطدم بـ429 مجدداً — نافذة الحصة
 * المتدحرجة تُحرّر التوكنات على مدى دقائق، فننتظر كما يطلب المزوّد بالضبط.
 */
function parseQuotaWaitMs(message: string): number | null {
  const m = message.match(/try again in\s+(?:(\d+)m)?([\d.]+)s/i);
  if (!m) return null;
  const mins = m[1] ? Number(m[1]) : 0;
  const secs = m[2] ? Number(m[2]) : 0;
  if (!mins && !secs) return null;
  return Math.round((mins * 60 + secs) * 1000);
}

const where = {
  published: true,
  NOT: { tags: { contains: "__translated:" } },
  OR: [
    { locale: "en", source: { contains: "nos-netherlands" } },
    { locale: "nl", source: { contains: "euronews" } },
  ],
} as const;

async function main() {
  const startedAt = Date.now();
  const overBudget = () => MAX_MS > 0 && Date.now() - startedAt >= MAX_MS;

  const remaining = await prisma.post.count({ where });
  const posts = await prisma.post.findMany({
    where,
    select: {
      id: true, title: true, content: true, excerpt: true, category: true,
      tags: true, source: true, locale: true, createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: LIMIT,
  });

  console.log(`remaining=${remaining} | processing=${posts.length} (limit=${LIMIT}, delay=${DELAY_MS}ms)`);

  let done = 0;
  let failed = 0;
  let consecutiveFails = 0;

  for (const p of posts) {
    if (overBudget()) {
      console.warn(`\n⏱️ انتهى السقف الزمني (${Math.round(MAX_MS / 60_000)} د) — توقّف نظيف، تستأنف الجدولة التالية.`);
      break;
    }
    const targetLocale = p.locale;
    const article: ExtractedArticle = {
      title: p.title,
      content: p.content,
      excerpt: p.excerpt || "",
      category: p.category,
      tags: [],
      source: p.source || "",
      sourceUrl: "",
      author: "",
      publishedAt: p.createdAt,
      mediaUrls: [],
      iframes: [],
    };

    let quotaRetries = 0;
    // عدد النماذج التي جُرِّبت لهذا الصف منذ آخر نجاح — يمنع انتظاراً طويلاً
    // ما دام هناك نموذج لم نجرّبه بعد (لكل نموذج حصته المنفصلة، فقد يكون متاحاً).
    let rotatedModels = 0;
    while (true) {
      try {
        const translated = await translateArticleToLocale(article, targetLocale);
        const changed = translated.title && translated.title !== p.title;

        if (!changed) {
          failed++;
          consecutiveFails++;
          console.warn(`  ⚠️ لم تتغيّر (${targetLocale}) ${p.title.slice(0, 45)}`);
        } else {
          const tags = [p.tags, `__translated:${targetLocale}`].filter(Boolean).join(",");
          await prisma.post.update({
            where: { id: p.id },
            data: { title: translated.title, content: translated.content, excerpt: translated.excerpt, tags },
          });
          done++;
          consecutiveFails = 0;
          rotatedModels = 0;
          console.log(`  [${done}] ${targetLocale} ← ${translated.title.slice(0, 55)}`);
        }
        break;
      } catch (e) {
        const msg = (e as Error).message;

        // نفاد الحصة اليومية / حدّ المعدّل: ننتظر ونعيد نفس الصف (لا نحتسبه فشلاً).
        if (isQuotaError(msg) && quotaRetries < QUOTA_MAX_RETRIES) {
          quotaRetries++;

          // دوّر النموذج: لكل نموذج Groq حصته اليومية المنفصلة، فيعطي التدوير متنفّساً
          // مضاعفاً. getConfig يقرأ GROQ_MODEL من البيئة في كل نداء، فالتبديل يسري فوراً.
          // ما دام هناك نموذج لم نجرّبه بعد ننتقل إليه فوراً بلا انتظار (قد تكون حصته متاحة).
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

          const hinted = parseQuotaWaitMs(msg);
          // جرّبنا كل النماذج → لا مفرّ من انتظار انفتاح نافذة الحصة (كما يطلب المزوّد).
          const wait = rotated ? 1500 : Math.max(QUOTA_WAIT_MS, hinted ?? 0) + 2000;
          // لا نبدأ انتظاراً يُخرجنا عن السقف الزمني — نتوقّف نظيفاً وتستأنف الجدولة التالية.
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

        failed++;
        consecutiveFails++;
        console.warn(`  ⚠️ ${p.id}: ${msg.slice(0, 110)}`);
        break;
      }
    }

    if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
      console.warn(`\n⛔ توقّف بعد ${consecutiveFails} إخفاقات متتالية. أعِد التشغيل لاحقاً.`);
      break;
    }
    await sleep(DELAY_MS);
  }

  const left = await prisma.post.count({ where });
  console.log(`\n✅ translated=${done} | failed=${failed} | remaining=${left}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
