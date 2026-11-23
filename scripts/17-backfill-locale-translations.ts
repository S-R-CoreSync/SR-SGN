// scripts/17-backfill-locale-translations.ts
// تعبئة الأرشيف: تصحيح صفوف nl/en القديمة التي تحمل نص المصدر الأصلي بدل لغة القسم.
//   - nos-netherlands (مصدرها هولندي): صفوف en تحتاج ترجمة nl→en.
//   - euronews-*      (مصدرها إنجليزي): صفوف nl تحتاج ترجمة en→nl.
// قابل للاستئناف: يضع علامة __translated في tags فلا يُعيد معالجة الصف مرتين.
//   BACKFILL_LIMIT (افتراضي 40) — عدد الصفوف لكل تشغيل (يحمي حصة Groq).
//   BACKFILL_DELAY_MS (افتراضي 3500) — مهلة بين النداءات.
// التشغيل: NODE_ENV=production npm run ai:backfill-translations

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { translateArticleToLocale } from "../src/lib/sync/translator";
import type { ExtractedArticle } from "../src/lib/sync/types";

const LIMIT = Number(process.env.BACKFILL_LIMIT) || 40;
const DELAY_MS = Number(process.env.BACKFILL_DELAY_MS) || 3500;
const MAX_CONSECUTIVE_FAILS = Number(process.env.BACKFILL_MAX_FAILS) || 5;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const where = {
  published: true,
  NOT: { tags: { contains: "__translated:" } },
  OR: [
    { locale: "en", source: { contains: "nos-netherlands" } },
    { locale: "nl", source: { contains: "euronews" } },
  ],
} as const;

async function main() {
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
        console.log(`  [${done}] ${targetLocale} ← ${translated.title.slice(0, 55)}`);
      }
    } catch (e) {
      failed++;
      consecutiveFails++;
      console.warn(`  ⚠️ ${p.id}: ${(e as Error).message.slice(0, 110)}`);
    }

    if (consecutiveFails >= MAX_CONSECUTIVE_FAILS) {
      console.warn(`\n⛔ توقّف بعد ${consecutiveFails} إخفاقات متتالية (غالباً حدّ معدّل). أعِد التشغيل لاحقاً.`);
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
