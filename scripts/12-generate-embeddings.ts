// scripts/12-generate-embeddings.ts
// Index all published posts into Qdrant using Jina embeddings.

import "dotenv/config";
import { prisma } from "../src/lib/db";
import { embedTexts } from "../src/lib/ai/embeddings";
import { upsertPoints, ensureCollection } from "../src/lib/ai/vector-search";

const BATCH = 16;

async function main() {
  console.log("Ensuring Qdrant collection...");
  await ensureCollection();

  const posts = await prisma.post.findMany({
    where: { published: true },
    select: { id: true, title: true, excerpt: true, content: true, category: true, createdAt: true },
  });
  console.log(`Found ${posts.length} published posts.`);

  let done = 0;
  for (let i = 0; i < posts.length; i += BATCH) {
    const chunk = posts.slice(i, i + BATCH);
    const texts = chunk.map((p) => [p.title, p.excerpt, p.content?.slice(0, 500)].filter(Boolean).join(" \n "));
    const vectors = await embedTexts(texts);
    await upsertPoints(
      chunk.map((p, idx) => ({
        id: p.id,
        vector: vectors[idx],
        payload: {
          title: p.title,
          excerpt: p.excerpt || "",
          category: p.category,
          createdAt: p.createdAt.toISOString(),
        },
      }))
    );
    done += chunk.length;
    console.log(`  indexed ${done}/${posts.length}`);
  }

  console.log("\n✅ Embeddings generated and upserted to Qdrant.");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
