import { generateText, getEnvVar } from "@/lib/ai/provider";
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

/** مزوّد مستقل لترجمة المزامنة فقط (غالباً الأعلى حصةً من مزوّد الشات/RAG). */
const SYNC_PROVIDER = getEnvVar("SYNC_TRANSLATE_PROVIDER") || undefined;

/** نفاد الحصة اليومية/الدقائقية: إعادة المحاولة هنا مضيعة للوقت (حتى reset) وتسبّب 504. */
function isQuotaError(msg: string): boolean {
  return /\bTPD\b|\bOTPM\b|tokens per (day|minute)|quota|rate_limit_exceeded|Rate limit reached/i.test(msg);
}

async function generateTextWithRetry(
  prompt: string,
  systemPrompt: string,
  options: { responseFormat: "text" | "json" },
  deadline?: number
): Promise<string> {
  // 🚨 سقف زمني صارم: Vercel يقطع الدالة عند ٦٠ ثانية. التراجع القديم
  // (٤+٨+١٦+٣٢ ثانية) كان يستهلك المهلة كلها ويُرجِع 504 بدل نتيجة جزئية.
  // الآن: محاولتان فقط، بانتظار قصير، وتوقف فوري عند نفاد الحصة.
  const effectiveDeadline = typeof deadline === "number" ? deadline : Date.now() + 15_000;
  let retries = 3;
  let delayTime = 800;
  let currentOptions = { ...options };

  while (retries > 0) {
    if (Date.now() + 2_000 > effectiveDeadline) {
      throw new Error("AI time budget exhausted before translation call");
    }
    try {
      return await generateText(prompt, systemPrompt, { ...currentOptions, provider: SYNC_PROVIDER });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // حصةGroq اليومية نفدت → لا فائدة من النوم دقيقة كاملة داخل دالة Vercel.
      // نُمرّر الخطأ للأعلى ليُسجَّل صراحةً ويُعاد المحاولة في التشغيل التالي.
      if (isQuotaError(errMsg)) throw error;

      const isRateLimit = /\b429\b|rate.?limit|Too many requests/i.test(errMsg);
      const isJsonError = errMsg.includes("400") && errMsg.includes("json_validate_failed");
      const canWait = Date.now() + delayTime + 2_000 <= effectiveDeadline;

      if (isRateLimit && retries > 1 && canWait) {
        logger.warn("SyncAI", `Rate limit (429). Retrying in ${delayTime}ms (${retries - 1} left)`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
        retries--;
        delayTime = Math.min(delayTime * 2, 4_000);
      } else if (isJsonError && retries > 1 && canWait) {
        logger.warn("SyncAI", `JSON validation error. Retrying as plain text...`);
        await new Promise((resolve) => setTimeout(resolve, delayTime));
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

/** أسماء اللغات كما تُخاطَب بها النماذج في التعليمات. */
const LANG_NAME: Record<string, string> = { ar: "Arabic", nl: "Dutch", en: "English" };

async function translatePlainText(
  text: string,
  kind: "title" | "body",
  targetLocale: string,
  deadline?: number
): Promise<string> {
  const lang = LANG_NAME[targetLocale] || targetLocale;
  const system =
    kind === "title"
      ? `You are a professional news translator. Translate the headline into ${lang}. Output only the translated headline.`
      : `You are a professional media translator. Translate the article into ${lang}. Preserve ALL HTML tags, links, image tags and iframes exactly. Output only the translation.`;

  const prompt =
    kind === "title"
      ? `Translate this news headline into professional ${lang}. Output ONLY the ${lang} headline:\n\n${text}`
      : `Translate the following news article body into professional ${lang}, keeping the HTML intact:\n\n${text}`;

  const out = await generateTextWithRetry(prompt, system, { responseFormat: "text" }, deadline);
  return (out || "").trim().replace(/^["'«»]+|["'«»]+$/g, "").trim();
}

/** ترجمة جسم المقال على دفعات لتفادي الردود المبتورة. */
async function translateBodyInChunks(content: string, targetLocale: string, deadline?: number): Promise<string> {
  if (content.length <= CHUNK_CHARS) return translatePlainText(content, "body", targetLocale, deadline);

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
    // لا نبدأ دفعة جديدة إن كان الوقت على وشك النفاد — الباقي يُكمله التشغيل التالي.
    if (typeof deadline === "number" && Date.now() + 2_000 > deadline) {
      throw new Error("AI time budget exhausted before body chunk");
    }
    translated.push(await translatePlainText(chunk, "body", targetLocale, deadline));
  }
  return translated.join("");
}

/** ترجمة نصّ خام (بلا عنوان) إلى العربية على دفعات.
 *  تُستخدم لتعبئة أجسام المقالات التي لا تملك نسخة عربية أصلية في المصدر. */
export async function translateTextToArabic(text: string): Promise<string> {
  return translateBodyInChunks(text, "ar");
}

/** يترجم المقال (عنوان + جسم على دفعات) إلى اللغة الهدف. يُرجِع null عند نقص المخرجات. */
async function translateArticleTo(
  article: ExtractedArticle,
  targetLocale: string,
  deadline?: number
): Promise<ExtractedArticle | null> {
  const title = await translatePlainText(article.title, "title", targetLocale, deadline);
  const content = await translateBodyInChunks(article.content, targetLocale, deadline);
  if (!title || !content) return null;

  const plain = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    ...article,
    title,
    content,
    excerpt: plain.slice(0, 300),
  };
}

export async function translateArticle(article: ExtractedArticle, deadline?: number): Promise<ExtractedArticle> {
  const isArabic = /[\u0600-\u06FF]/.test(article.title);
  if (isArabic) {
    return article;
  }

  // مسار واحد موثوق: عنوان + جسم (على دفعات). ألغينا مسار JSON لأن الموديلات
  // كانت تُرجع JSON مبتوراً على المقالات الطويلة → فشل + إعادة محاولات + بطء،
  // وكان المقال يُفقد فيُعاد ترجمته في كل تشغيل.
  try {
    const fallback = await translateArticleTo(article, "ar", deadline);
    if (fallback) return fallback;
  } catch (error) {
    // لا نبتلع خطأ الحصة — وإلا يُحفظ نص إنجليزي في القسم العربي ويُعدّ «ناجحاً».
    if (isRateLimitError(error)) throw error;
    logger.error("SyncAI", "AI translation failed for article:", article.title, error);
  }

  return article;
}

/** أخطاء الحصة/حدّ المعدّل: يجب أن تصل إلى المُستدعي ليصبر ويعيد المحاولة،
 *  ولا تُبتلع فيُحفظ نصّ بلغة المصدر في القسم الخطأ — وهذا أصل صفوف الأرشيف المعطوبة. */
function isRateLimitError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /\b429\b|rate.?limit|tokens per (day|minute)|Request too large|\bTPD\b|\bOTPM\b/i.test(msg);
}

export async function translateArticleToLocale(
  article: ExtractedArticle,
  targetLocale: string,
  deadline?: number
): Promise<ExtractedArticle> {
  const sourceLang = detectLanguage(article);
  if (sourceLang === targetLocale) {
    return article;
  }

  // الترجمة إلى العربية لها مسارها الخاص (فحص العزل اللغوي في index.ts).
  if (targetLocale === "ar") {
    return translateArticle(article, deadline);
  }

  // nl ↔ en: نُترجم نص المصدر إلى لغة الصف الهدف، حتى لا يظهر نص هولندي في
  // القسم الإنجليزي (أو العكس) — كان هذا معطّلاً عمداً لتفادي حدّ المعدّل.
  try {
    const translated = await translateArticleTo(article, targetLocale, deadline);
    if (translated) return translated;
  } catch (error) {
    // أخطاء الحصة تُعاد للأعلى (لا تُبتلع) ليتعامل معها المُستدعي بإعادة المحاولة/الانتظار.
    if (isRateLimitError(error)) throw error;
    logger.error("SyncAI", `AI translation to ${targetLocale} failed for article:`, article.title, error);
  }

  return article;
}
