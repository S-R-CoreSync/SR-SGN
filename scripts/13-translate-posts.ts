// scripts/13-translate-posts.ts
// Translate Post titles to NL/EN and generate summaries via Gemini.

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { translateText, summarizeText } from "../src/lib/ai/translate";

const DELAY_MS = 4500; // ~13 RPM (under Gemini free 15 RPM)

async function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function main() {
  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { id: true, title: true, excerpt: true, content: true, titleNl: true, titleEn: true, summary: true },
  });
  console.log(`Found ${posts.length} posts.`);

  let done = 0;
  for (const p of posts) {
    try {
      // Translate title if missing
      if (!p.titleNl) {
        p.titleNl = await translateText(p.title, "nl");
        await sleep(DELAY_MS);
      }
      if (!p.titleEn) {
        p.titleEn = await translateText(p.title, "en");
        await sleep(DELAY_MS);
      }
      // Summarize if missing
      if (!p.summary) {
        p.summary = await summarizeText(p.title + (p.excerpt ? " " + p.excerpt : ""), "ar");
        await sleep(DELAY_MS);
      }

      await prisma.post.update({
        where: { id: p.id },
        data: { titleNl: p.titleNl, titleEn: p.titleEn, summary: p.summary },
      });
      done++;
      console.log(`  [${done}/${posts.length}] ${p.title.slice(0, 50)}`);
    } catch (e) {
      console.warn(`  ⚠️ ${p.id}: ${(e as Error).message.slice(0, 100)}`);
    }
  }

  console.log(`\n✅ Translated ${done}/${posts.length} posts.`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
