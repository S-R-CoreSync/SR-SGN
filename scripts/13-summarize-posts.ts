// scripts/13-summarize-posts.ts
// تعبئة الملخّصات الذكية (٢-٣ جمل) للأخبار العربية الموجودة بلا ملخّص.
// يُشغَّل مرة واحدة (أو دورياً) لتعبئة الأرشيف؛ الأخبار الجديدة يولّد السينك ملخّصها تلقائياً.

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { generateSummary } from "../src/lib/ai/text";

const DELAY_MS = 1200; // مهلة بسيطة بين النداءات لاحترام حدود Groq
const BATCH = Number(process.env.SUMMARY_BATCH) || 400; // سقف لكل تشغيل (يحمي الحصة اليومية)

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const posts = await prisma.post.findMany({
    where: { published: true, locale: "ar", OR: [{ summary: null }, { summary: "" }] },
    select: { id: true, title: true, excerpt: true, content: true },
    orderBy: { createdAt: "desc" },
    take: BATCH,
  });
  console.log(`Found ${posts.length} Arabic posts without a summary.`);

  let done = 0;
  for (const p of posts) {
    try {
      // نلخّص العنوان + المقتطف (أو الجسم مُنزَّعاً من HTML) لتفادي إرسال HTML خام للمزوّد.
      const plain = (p.excerpt || p.content.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
      if (plain.length < 300) continue;

      const summary = (await generateSummary(p.title, plain.slice(0, 2000), "ar")).trim();
      // العزل اللغوي: نتخطى أي ملخّص لا يحتوي حرفاً عربياً.
      if (!/[\u0600-\u06FF]/.test(summary)) continue;

      await prisma.post.update({ where: { id: p.id }, data: { summary } });
      done++;
      console.log(`  [${done}/${posts.length}] ${p.title.slice(0, 55)}`);
    } catch (e) {
      console.warn(`  ⚠️ ${p.id}: ${(e as Error).message.slice(0, 100)}`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\n✅ Summarized ${done}/${posts.length} posts.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
