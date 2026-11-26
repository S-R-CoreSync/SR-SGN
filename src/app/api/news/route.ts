import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";
import { logger } from "@/lib/logger";
import { dedupePosts } from "@/lib/post-dedup";

export const dynamic = "force-dynamic";

// البيانات تتغيّر بعد كل مزامنة — أي كاش هنا يعطي انطباعاً كاذباً بتأخر النشر.
const NO_STORE = { "Cache-Control": "no-store, max-age=0" };

// 🔐 منع تضخيم عدّاد مشاهدات الأخبار بطلبات آلية (الحد سخي ليكفي التصفح الطبيعي)
const newsLimiter = createRateLimiter({ maxRequests: 120, windowMs: 60_000, name: "news-list" });

// الحقول المُرجَعة في قوائم الأخبار (بدون content لتقليل حجم الاستجابة)
const LIST_SELECT = {
  id: true,
  title: true,
  slug: true,
  excerpt: true,
  summary: true,
  image: true,
  videoId: true,
  category: true,
  tags: true,
  source: true,
  featured: true,
  views: true,
  published: true,
  locale: true,
  createdAt: true,
  updatedAt: true,
  author: { select: { name: true } },
} as const;

export async function GET(req: NextRequest) {
  const limited = tooMany(newsLimiter, clientKey(req));
  if (limited) return limited;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");
  const slug = searchParams.get("slug");
  const featured = searchParams.get("featured");
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 100);
  const offset = Number(searchParams.get("offset")) || 0;
  const search = searchParams.get("search");
  const video = searchParams.get("video") === "true";
  const locale = searchParams.get("locale") || "ar";

  try {
    // طلب مقال واحد بالـ slug ← نرجع content كاملاً
    if (slug) {
      const post = await prisma.post.findFirst({
        where: { slug, published: true },
        include: { author: { select: { name: true } } },
      });
      if (!post) return NextResponse.json({ error: "not found" }, { status: 404 });
      const { resolveApiImage } = await import("@/lib/image-fallback");
      const resolvedPost = {
        ...post,
        image: resolveApiImage(post.image, post.title, post.category),
      };
      // تحديث المشاهدات بشكل غير متزامن (لا يحجب الاستجابة)
      prisma.post.update({ where: { id: post.id }, data: { views: { increment: 1 } } }).catch(() => {});
      return NextResponse.json(resolvedPost, { headers: NO_STORE });
    }
    // فلترة حسب اللغة
    const where: any = {
      published: true,
      locale,
    };
    if (category) where.category = category;
    if (featured === "true") where.featured = true;
    if (video) where.source = "youtube";
    if (search) where.OR = [
      { title: { contains: search } },
      { excerpt: { contains: search } },
    ];

    // نجلب نافذة أوسع لأن الفلترة اللغوية وإزالة التكرار تأتي بعد الاستعلام.
    // النافذة محدودة بـ 500 صف كي لا نثقل الاستجابة مع آلاف الأخبار.
    const fetchSize = Math.min(Math.max(limit * 3, 60), 500);
    const [rawPosts, rawTotal] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: fetchSize,
        select: LIST_SELECT,
      }),
      prisma.post.count({ where }),
    ]);

    const { isPureLocaleText, localizeCategory } = await import("@/lib/language-guard");
    const { resolveApiImage } = await import("@/lib/image-fallback");
    const uniquePosts = dedupePosts(rawPosts.filter((p) => isPureLocaleText(p.title, locale)));
    // الـ skip صار في استعلام قاعدة البيانات، فلا نخطيه مرة ثانية هنا.
    const posts = uniquePosts.slice(0, limit).map((p) => ({
      ...p,
      image: resolveApiImage(p.image, p.title, p.category),
      category: localizeCategory(p.category || "", locale),
    }));

    // إن استوعبت النافذة كل النتائج المتبقية فالعدد بعد الفلترة وإزالة التكرار دقيق،
    // وإلا نبقي على الحد الأعلى الخام بدل رقم pagination خاطئ.
    const total = rawPosts.length < fetchSize ? offset + uniquePosts.length : rawTotal;

    return NextResponse.json(
      { posts, total, limit, offset },
      { headers: NO_STORE }
    );
  } catch (error) {
    logger.error("API/news", error);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
