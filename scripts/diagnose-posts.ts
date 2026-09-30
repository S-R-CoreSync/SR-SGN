import "dotenv/config";
import { prisma } from "./db";

async function main() {
  const posts = await prisma.post.findMany({
    select: {
      id: true,
      title: true,
      image: true,
      source: true,
      locale: true,
      category: true,
      published: true,
    }
  });

  console.log(`Total posts in DB: ${posts.length}`);

  // Count non-Arabic titles
  const nonArabic = posts.filter(p => !/[\u0600-\u06FF]/.test(p.title));
  console.log(`Non-Arabic titles count: ${nonArabic.length}`);

  // Group by title to find exact duplicates
  const titleCounts = new Map<string, number>();
  for (const p of posts) {
    titleCounts.set(p.title, (titleCounts.get(p.title) || 0) + 1);
  }
  const duplicateTitles = Array.from(titleCounts.entries()).filter(([_, count]) => count > 1);
  console.log(`Unique titles with duplicates: ${duplicateTitles.length}`);
  let totalDuplicateRows = 0;
  for (const [title, count] of duplicateTitles) {
    totalDuplicateRows += (count - 1);
    console.log(`- [${count}x] "${title.slice(0, 50)}..."`);
  }
  console.log(`Total redundant duplicate rows: ${totalDuplicateRows}`);

  // Check posts by locale
  const byLocale = new Map<string, number>();
  const arNonArabic: any[] = [];
  for (const p of posts) {
    byLocale.set(p.locale || "none", (byLocale.get(p.locale || "none") || 0) + 1);
    if (p.locale === "ar" && !/[\u0600-\u06FF]/.test(p.title)) {
      arNonArabic.push(p);
    }
  }
  console.log("Posts by locale:", Object.fromEntries(byLocale));
  console.log("Posts with locale='ar' but NON-Arabic title:", arNonArabic.length);
  for (const p of arNonArabic) {
    console.log(`- ${p.id} | source: ${p.source} | title: "${p.title}"`);
  }
}

main().then(() => process.exit(0)).catch(err => {
  console.error(err);
  process.exit(1);
});
