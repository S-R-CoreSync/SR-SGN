/**
 * social-share.ts
 * أداة لإرسال طلب النشر التلقائي للـ Webhook (Make.com / Zapier)
 */

import { SITE_URL } from "@/lib/site";
import { logger } from "@/lib/logger";

interface PostData {
  id: string;
  title: string;
  slug: string | null;
  content: string;
  excerpt: string | null;
  image: string | null;
  category: string;
  createdAt: Date;
}

export async function triggerSocialShare(post: PostData, platforms: string[]) {
  const webhookUrl = process.env.SOCIAL_PUBLISH_WEBHOOK_URL;
  
  if (!webhookUrl) {
    logger.warn("SocialShare", "SOCIAL_PUBLISH_WEBHOOK_URL is not defined in .env. Skipping social sharing.");
    return;
  }

  if (!platforms || platforms.length === 0) {
    return;
  }

  // تحديد النطاق الأساسي لبناء الروابط الكاملة
  const baseUrl = SITE_URL;
  
  // بناء رابط الخبر الكامل
  const postUrl = post.slug ? `${baseUrl}/news/${post.slug}` : `${baseUrl}/news`;

  // بناء رابط الصورة الكامل إذا كانت موجودة
  let imageUrl = post.image;
  if (imageUrl && imageUrl.startsWith("/")) {
    imageUrl = `${baseUrl}${imageUrl}`;
  }

  const payload = {
    postId: post.id,
    title: post.title,
    excerpt: post.excerpt || post.content.replace(/<[^>]*>/g, "").slice(0, 300) + "...",
    url: postUrl,
    imageUrl: imageUrl || null,
    category: post.category,
    createdAt: post.createdAt,
    publishTo: platforms
  };

  // إرسال الطلب في الخلفية لتجنب تأخير استجابة لوحة التحكم للمستخدم
  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      logger.error("SocialShare", `Social Publish Webhook returned status ${res.status}: ${res.statusText}`);
    } else {
      logger.info("SocialShare", `Social Publish Webhook sent successfully for platforms: ${platforms.join(", ")}`);
    }
  } catch (error) {
    logger.error("SocialShare", "Failed to send Social Publish Webhook:", error instanceof Error ? error.message : String(error));
  }
}
