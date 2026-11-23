import { generateText } from "@/lib/ai/provider";
import type { ExtractedArticle } from "./types";
import { logger } from "@/lib/logger";

function detectLanguage(article: ExtractedArticle): "ar" | "nl" | "en" {
  if (/[\u0600-\u06FF]/.test(article.title)) {
    return "ar";
  }
  const url = (article.sourceUrl || "").toLowerCase();
  const sourceName = (article.source || "").toLowerCase();
  if (url.includes("nos.nl") || url.includes("netherlands") || sourceName.includes("nos")) {
    return "nl";
  }
  return "en";
}

async function generateTextWithRetry(
  prompt: string,
  systemPrompt: string,
  options: { responseFormat: "text" | "json" }
): Promise<string> {
  // كانت هنا مهلة ٤.٥ ثانية قبل كل نداء (موروثة من حدود Gemini/GitHub 15 RPM).
  // مع Groq صارت مجرد إبطاء: ١٥ مقالاً × ٣ لغات = ٦٧ ثانية نوم فقط.
  // الآن مهلة قصيرة + تراجع تصاعدي حقيقي عند 429 (نحترم Retry-After إن وُجد).
  let retries = 5;
  let delayTime = 4000;
  let currentOptions = { ...options };

  while (retries > 0) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      return await generateText(prompt, systemPrompt, currentOptions);
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      const isRateLimit = errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("Too many requests");
      const isJsonError = errMsg.includes("400") && errMsg.includes("json_validate_failed");

      if (isRateLimit && retries > 1) {
        // احترام retry-after من المزوّد إن كان مذكوراً بالرسالة
        const hinted = errMsg.match(/retry[- ]after["':\s]+(\d+)/i);
        const wait = hinted ? Math.min(Number(hinted[1]) * 1000, 60_000) : delayTime;
        logger.warn("SyncAI", `Rate limit (429). Retrying in ${Math.round(wait / 1000)}s (${retries - 1} left)`);
        await new Promise((resolve) => setTimeout(resolve, wait));
        retries--;
        delayTime = Math.min(delayTime * 2, 60_000);
      } else if (isJsonError && retries > 1) {
        logger.warn("SyncAI", `JSON validation error. Retrying as plain text...`);
        await new Promise((resolve) => setTimeout(resolve, 2000));
        retries--;
        currentOptions = { responseFormat: "text" };
      } else {
        throw error;
      }
    }
  }
  throw new Error("Failed to generate text after multiple retries due to rate limits.");
}

/**
 * ترجمة احتياطية بدون JSON — تُستخدم عندما يفشل تحليل رد JSON
 * (الموديلات الكبيرة تُرجع أحياناً JSON مبتوراً على المقالات الطويلة،
 * فيُفقد المقال ويُعاد المحاولة كل تشغيل = بطء دائم).
 */
const CHUNK_CHARS = 6000;

async function translatePlainText(text: string, kind: "title" | "body"): Promise<string> {
  const system =
    kind === "title"
      ? "You are a professional news translator. Translate Dutch/English headlines into Arabic. Output only the translated headline."
      : "You are a professional media translator. Translate Dutch/English news into Arabic. Preserve ALL HTML tags, links, image tags and iframes exactly. Output only the translation.";

  const prompt =
    kind === "title"
      ? `Translate this news headline into professional Arabic. Output ONLY the Arabic headline:\n\n${text}`
      : `Translate the following news article body into professional Arabic, keeping the HTML intact:\n\n${text}`;

  const out = await generateTextWithRetry(prompt, system, { responseFormat: "text" });
  return (out || "").trim().replace(/^["'«»]+|["'«»]+$/g, "").trim();
}

/** ترجمة جسم المقال على دفعات لتفادي الردود المبتورة. */
async function translateBodyInChunks(content: string): Promise<string> {
  if (content.length <= CHUNK_CHARS) return translatePlainText(content, "body");

  const blocks = content.split(/(?<=<\/(?:p|div|h[1-6]|li|blockquote|figure)>)/i);
  const chunks: string[] = [];
  let buffer = "";
  for (const block of blocks) {
    if (buffer && buffer.length + block.length > CHUNK_CHARS) {
      chunks.push(buffer);
      buffer = block;
    } else {
      buffer += block;
    }
  }
  if (buffer) chunks.push(buffer);

  const translated: string[] = [];
  for (const chunk of chunks) {
    translated.push(await translatePlainText(chunk, "body"));
  }
  return translated.join("");
}

async function translateArticleFallback(article: ExtractedArticle): Promise<ExtractedArticle | null> {
  const title = await translatePlainText(article.title, "title");
  const content = await translateBodyInChunks(article.content);
  if (!title || !content) return null;

  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    ...article,
    title,
    content,
    excerpt: plain.slice(0, 300),
  };
}

export async function translateArticle(article: ExtractedArticle): Promise<ExtractedArticle> {
  const isArabic = /[\u0600-\u06FF]/.test(article.title);
  if (isArabic) {
    return article;
  }

  // مسار واحد موثوق: عنوان + جسم (على دفعات). ألغينا مسار JSON لأن الموديلات
  // كانت تُرجع JSON مبتوراً على المقالات الطويلة → فشل + إعادة محاولات + بطء،
  // وكان المقال يُفقد فيُعاد ترجمته في كل تشغيل.
  try {
    const fallback = await translateArticleFallback(article);
    if (fallback) return fallback;
  } catch (error) {
    logger.error("SyncAI", "AI translation failed for article:", article.title, error);
  }

  return article;
}

export async function translateArticleToLocale(
  article: ExtractedArticle,
  targetLocale: string
): Promise<ExtractedArticle> {
  const sourceLang = detectLanguage(article);
  if (sourceLang === targetLocale) {
    return article;
  }

  if (targetLocale === "ar") {
    return translateArticle(article);
  }

  // Skip translating to English/Dutch to save API quota and prevent 429 rate limit blocks
  return article;
}
