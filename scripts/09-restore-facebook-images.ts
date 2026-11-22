import { prisma } from "../src/lib/db";

const decode = (s: string) => s.replace(/&amp;/g, "&").replace(/&#39;/g, "'").replace(/&quot;/g, '"');

const posts = await prisma.post.findMany({
  where: { source: "facebook-sgn" },
  select: { id: true, title: true, image: true, content: true },
});

let updated = 0;
let withFbcdn = 0;
let kept = 0;
const failed: string[] = [];

for (const post of posts) {
  const matches = [...post.content.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => decode(m[1]))
    .filter((url) => url.includes("fbcdn.net"));

  if (matches.length === 0) {
    kept += 1;
    continue;
  }
  withFbcdn += 1;

  const current = post.image ?? "";
  if (current === matches[0]) continue;

  updated += 1;
  try {
    await prisma.post.update({ where: { id: post.id }, data: { image: matches[0] } });
  } catch (e) {
    failed.push(`${post.id}: ${e instanceof Error ? e.message.slice(0, 120) : String(e)}`);
  }
}

const cleared = await prisma.post.updateMany({
  where: { source: "facebook-sgn", image: { startsWith: "https://images.unsplash.com/" } },
  data: { image: null },
});

console.log(JSON.stringify({ total: posts.length, withFbcdn, updated, kept, cleared: cleared.count, failed }, null, 2));
await prisma.$disconnect();
