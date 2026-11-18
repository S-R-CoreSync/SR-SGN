import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateSummary, translateContent } from "@/lib/ai/text";
import { prisma } from "@/lib/db";
import { isAdmin, isEditor } from "@/lib/auth-helpers";
import { createRateLimiter } from "@/lib/rate-limit";
import { clientKey, tooMany } from "@/lib/request-guard";

// 🔐 تحرير الأخبار بالذكاء الاصطناعي (يعدّل جدول Post) — للمشرف/المحرر فقط
const aiNewsLimiter = createRateLimiter({ maxRequests: 20, windowMs: 60_000, name: "ai-news" });

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as any)?.role;

  // الحدّ لكل مستخدم إن وُجد، وإلا لكل IP (زر «ترجم المقال» متاح للزوّار)
  const key = session?.user?.id ? `u:${session.user.id}` : `ip:${clientKey(req)}`;
  const limited = tooMany(aiNewsLimiter, key);
  if (limited) return limited;

  try {
    const { action, postId, from, to, content } = await req.json();

    // 🔐 `translate` خدمة عرض (زر «ترجم المقال») — متاحة للجميع بحدّ معدّل،
    // حتى يبقى القسمان `/en` و`/nl` خاليين من النص العربي للزوّار غير المسجّلين.
    // أي إجراء آخر يعدّل جدول Post أو يولّد ملخصات جماعية → مشرف/محرر فقط.
    if (action !== "translate") {
      if (!session?.user || !(isAdmin(role) || isEditor(role))) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }
    } else if (typeof content !== "string" || content.length > 12_000) {
      return NextResponse.json({ error: "Content too long or missing" }, { status: 400 });
    }

    if (action === "summarize") {
      const post = await prisma.post.findUnique({ where: { id: postId } });
      if (!post) return NextResponse.json({ error: "Post not found" }, { status: 404 });
      const summary = await generateSummary(post.title, post.content, from || "ar");
      if (post.excerpt !== summary) {
        await prisma.post.update({ where: { id: post.id }, data: { excerpt: summary } });
      }
      return NextResponse.json({ result: summary });
    }

    if (action === "translate") {
      const translated = await translateContent(content, from || "ar", to || "nl");
      return NextResponse.json({ result: translated });
    }

    if (action === "batch-summarize") {
      const posts = await prisma.post.findMany({
        where: { published: true },
        orderBy: { createdAt: "desc" },
        take: 10,
      });
      const results: { id: string; title: string; summary: string }[] = [];
      for (const post of posts) {
        const summary = await generateSummary(post.title, post.content, "ar");
        results.push({ id: post.id, title: post.title, summary });
        await prisma.post.update({ where: { id: post.id }, data: { excerpt: summary } });
      }
      return NextResponse.json({ results });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "AI error" }, { status: 500 });
  }
}
