import { generateText, getEnvVar } from "@/lib/ai/provider";
import type { ExtractedArticle } from "./types";
import { logger } from "@/lib/logger";

export function detectSourceLanguage(article: ExtractedArticle): "ar" | "nl" | "en" {
  if (/[\u0600-\u06FF]/.test(article.title)) {
    return "ar";
  }
  const url = (article.sourceUrl || "").toLowerCase();
  const sourceName = (article.source || "").toLowerCase();
  // مصادر هولندية صرفة: كان كشف اللغة يعرف nos فقط، فكانت مقالات nu.nl
  // وتويكرز تُحفظ في القسم الإنجليزي بالنص الهولندي (خرق لقاعدة العزل اللغوي).
  if (
    /nos\.nl|nu\.nl|tweakers\.net|netherlands/.test(url) ||
    /^(nos|nu|tweakers)(-|_|$)/.test(sourceName) ||
    sourceName.includes("netherlands")
  ) {
    return "nl";
  }
  return "en";
}

/** مزوّد وموديل مستقلان لترجمة المزامنة فقط، دون لمس الشات/RAG.
 *  موديل أخف (غير reasoning) يستهلك tokens أقل بكثير ويمنع نفاد الحصة اليومية. */
// تُقرأ في كل نداء (لا مرة واحدة عند التحميل) حتى يتمكن سكربت الأرشيف من
// تدوير النماذج عند نفاد حصة أحدها دون إعادة تشغيل العملية.
const syncProvider = () => getEnvVar("SYNC_TRANSLATE_PROVIDER") || undefined;
const syncModel = () => getEnvVar("SYNC_TRANSLATE_MODEL") || undefined;

/** نفاد الحصة اليومية/الدقائقية: إعادة المحاولة هنا مضيعة للوقت (حتى reset) وتسبّب 504. */
function isQuotaError(msg: string): boolean {
  return /\bTPD\b|\bOTPM\b|tokens per (day|minute)|quota|rate_limit_exceeded|Rate limit reached/i.test(msg);
}

/** المدة التي يطلبها المزوّد بعد 429 (مثلاً 360ms أو 2s أو 1m2.208s). */
function rateLimitWaitMs(msg: string): number | null {
  const m = msg.match(/try again in\s+(?:(\d+)m)?([\d.]+)\s*(ms|s)\b/i);
  if (!m) return null;
  const unitMs = m[3].toLowerCase() === "ms" ? 1 : 1000;
  const total = (Number(m[1] || 0) * 60_000) + Number(m[2]) * unitMs;
  return Number.isFinite(total) ? Math.ceil(total) : null;
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
  let retries = 4;
  let delayTime = 800;
  let currentOptions = { ...options };

  while (retries > 0) {
    if (Date.now() + 2_000 > effectiveDeadline) {
      throw new Error("AI time budget exhausted before translation call");
    }
    try {
      return await generateText(prompt, systemPrompt, {
        ...currentOptions,
        provider: syncProvider(),
        model: syncModel(),
      });
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);

      // حدود الدقيقة (OTPM/RPM) تطلب ثوانٍ قليلة — انتظارها داخل الميزانية
      // ينهي الترجمة ويمنع 429 ناقص. أما نفاد الحصة اليومية (دقائق/ساعات)
      // فالنوم فيها يقطع دالة Vercel عند 60ث → نُمرّر الخطأ فوراً.
      const hintedWait = rateLimitWaitMs(errMsg);
      if (
        isQuotaError(errMsg) &&
        hintedWait !== null &&
        hintedWait <= 12_000 &&
        retries > 1 &&
        Date.now() + hintedWait + 2_000 <= effectiveDeadline
      ) {
        logger.warn("SyncAI", `Rate limit (${hintedWait}ms). Retrying within budget (${retries - 1} left)`);
        await new Promise((resolve) => setTimeout(resolve, hintedWait + 150));
        retries--;
        continue;
      }
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
  // بعض النماذج تُجيب بتعليق من قبيل «العنوان مترجم بالفعل: ...» بدل الترجمة —
  // كان يُحفظ كعنوان ويُخرق العزل اللغوي (إنجليزي داخل قسم هولندي).
  const withoutMeta = (out || "").trim().replace(
    /^(?:the\s+)?(?:headline|article|text|translation)\s+is\s+already[^:\n]*:\s*|^translation\s*:\s*|^here\s+is\s+(?:the|your)\s+translation\s*:\s*/i,
    ""
  );
  return withoutMeta.trim().replace(/^["'«»]+|["'«»]+$/g, "").trim();
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
  deadline?: number,
  sourceLanguage?: "ar" | "nl" | "en"
): Promise<ExtractedArticle> {
  const sourceLang = sourceLanguage || detectSourceLanguage(article);
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
