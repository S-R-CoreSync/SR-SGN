import { MetadataRoute } from 'next';
import { prisma } from '@/lib/db';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = SITE_URL;
  const routes = [
    { url: base + '/', lastModified: new Date() },
    { url: base + '/news', lastModified: new Date() },
    { url: base + '/about', lastModified: new Date() },
    { url: base + '/contact', lastModified: new Date() },
  ];

  let posts: Array<{ slug: string | null; updatedAt: Date }> = [];
  try {
    const dbPosts = await prisma.post.findMany({
      where: { published: true }, 
      select: { slug: true, updatedAt: true } 
    });
    posts = dbPosts;
  } catch (e) {
    // تجاهل الخطأ أثناء عملية البناء (Build) على Vercel
  }

  const postRoutes = posts.map((p) => ({
    url: base + '/news/' + (p.slug || ''),
    lastModified: p.updatedAt,
  }));

  return [...routes, ...postRoutes];
}
