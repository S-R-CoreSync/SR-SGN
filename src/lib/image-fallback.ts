/**
 * ملف مشترك للصور الاحتياطية (placeholders)
 * SVG محلي خفيف الوزن لا يعتمد على شبكة خارجية
 */
import type { SyntheticEvent } from "react";
import { isGenericImageUrl } from "./post-dedup";

/** Helper to wrap text in SVG placeholders */
function splitTextIntoLines(text: string, maxCharPerLine: number = 30): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let currentLine = "";
  for (const word of words) {
    if ((currentLine + " " + word).trim().length > maxCharPerLine) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine = currentLine + " " + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines;
}

/** Generates a premium, dynamic branded SVG background as a placeholder */
export function getPremiumPlaceholder(title?: string | null, category?: string | null): string {
  const cat = category || "أخبار الجالية";
  const cleanTitle = title ? title.trim() : "";
  const lines = cleanTitle ? splitTextIntoLines(cleanTitle, 35).slice(0, 3) : [];
  
  // Decide colors based on category to make them look distinct and premium
  let fromColor = "#113d22";
  let toColor = "#1a5632";
  let accentColor = "#c8a84e";
  
  const lowerCat = cat.toLowerCase();
  if (lowerCat.includes("هولندا")) {
    fromColor = "#0d2b18";
    toColor = "#113d22";
    accentColor = "#c8a84e";
  } else if (lowerCat.includes("أوروبا")) {
    fromColor = "#0b2545";
    toColor = "#134074";
    accentColor = "#8da9c4";
  } else if (lowerCat.includes("ثقاف") || lowerCat.includes("رمضان") || lowerCat.includes("عيد") || lowerCat.includes("فن")) {
    fromColor = "#451a03";
    toColor = "#78350f";
    accentColor = "#fde047";
  } else if (lowerCat.includes("اقتصاد") || lowerCat.includes("مال")) {
    fromColor = "#111827";
    toColor = "#374151";
    accentColor = "#fbbf24";
  } else if (lowerCat.includes("فيديو") || lowerCat.includes("يوتيوب")) {
    fromColor = "#450a0a";
    toColor = "#991b1b";
    accentColor = "#fca5a5";
  } else if (lowerCat.includes("رياضة")) {
    fromColor = "#064e3b";
    toColor = "#047857";
    accentColor = "#a7f3d0";
  }

  const svgTextLines = lines.map((line, index) => {
    // Render text lines starting from y = 115, spaced by 26px
    const yPos = 115 + index * 26;
    // Escape XML special characters
    const escapedLine = line
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    return `<text x="200" y="${yPos}" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="16" font-weight="600" text-anchor="middle" direction="rtl">${escapedLine}</text>`;
  }).join("\n");

  const categoryText = `<text x="200" y="55" fill="${accentColor}" font-family="system-ui, -apple-system, sans-serif" font-size="11" font-weight="800" letter-spacing="1.5" text-anchor="middle" direction="rtl">${cat.toUpperCase()}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${fromColor};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${toColor};stop-opacity:1" />
      </linearGradient>
      <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="white" stroke-width="0.5" stroke-opacity="0.05" />
      </pattern>
    </defs>
    
    <!-- Background -->
    <rect width="400" height="240" fill="url(#grad)" />
    <rect width="400" height="240" fill="url(#grid)" />
    
    <!-- Decorative Circle Ornaments -->
    <circle cx="360" cy="40" r="80" fill="white" opacity="0.03" />
    <circle cx="40" cy="200" r="60" fill="${accentColor}" opacity="0.04" />
    
    <!-- Glassmorphic Card Frame -->
    <rect x="15" y="15" width="370" height="210" rx="16" fill="white" fill-opacity="0.02" stroke="white" stroke-opacity="0.08" stroke-width="1.2" />
    
    <!-- Branded Badge -->
    <rect x="140" y="38" width="120" height="24" rx="12" fill="white" fill-opacity="0.07" stroke="white" stroke-opacity="0.1" stroke-width="1" />
    ${categoryText}

    <!-- Dynamic Title text lines or fallback brand name -->
    ${svgTextLines ? svgTextLines : `<text x="200" y="125" fill="#ffffff" font-family="system-ui, -apple-system, sans-serif" font-size="18" font-weight="700" text-anchor="middle" direction="rtl">الجالية السورية في هولندا</text>`}
    
    <!-- Bottom Monogram/Watermark -->
    <text x="200" y="195" fill="white" fill-opacity="0.25" font-family="system-ui, -apple-system, sans-serif" font-size="9" font-weight="700" letter-spacing="2" text-anchor="middle">SGN • SY-NL.ORG</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const CATEGORY_EDITORIAL_IMAGES: Record<string, string> = {
  law: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80", // العدالة والمحاكم والقوانين
  netherlands: "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80", // قنوات هولندا ومبانيها
  community: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80", // تجمع وترابط الجالية
  culture: "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=1200&q=80", // الفعاليات والأنشطة الثقافية
  economy: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80", // المال والأعمال
  islamic: "https://images.unsplash.com/photo-1564769625905-50e93615e769?auto=format&fit=crop&w=1200&q=80", // الحج والمناسبات الإسلامية
  sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=1200&q=80", // الرياضة والبطولات
  health: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=1200&q=80", // الصحة والطب
  education: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80", // التعليم والطلاب
  europe: "https://images.unsplash.com/photo-1491557345352-5929e343eb89?auto=format&fit=crop&w=1200&q=80", // أوروبا وبروكسل
  general: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=1200&q=80", // صحافة وأخبار عامة
};

export function getEditorialFallback(title?: string | null, category?: string | null): string {
  const combined = `${title || ""} ${category || ""}`.toLowerCase();
  
  if (/حج|سفارة|بروكسل|إسلام|عيد|رمضان|مبارك|هجري/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.islamic;
  }
  if (/لجوء|إقامة|ind|محكمة|قانون|حقوق|جواز|شمل|طعن|ترحيل/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.law;
  }
  if (/هولندا|لاهاي|أمستردام|شيوخ|برلمان|وزير|روتردام|أوتريخت/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.netherlands;
  }
  if (/رياضة|تجديف|بطولة|كأس|سباق/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.sports;
  }
  if (/اقتصاد|أعمال|مال|عمل|وظائف|ضرائب|شركات|استثمار/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.economy;
  }
  if (/ثقافة|فن|معرض|موسيقى|حوار|مسرح|تراث/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.culture;
  }
  if (/صحة|طبي|دواء|مستشفى|نفسي/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.health;
  }
  if (/تعليم|جامعة|طلاب|مدرسة|دراسة/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.education;
  }
  if (/أوروبا|اتحاد أوروبي|دولية/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.europe;
  }
  if (/جالية|سوري|سورية|وطن|مجتمع|أهلنا/.test(combined)) {
    return CATEGORY_EDITORIAL_IMAGES.community;
  }

  return CATEGORY_EDITORIAL_IMAGES.general;
}

/**
 * ألوان الصورة الفريدة لكل تصنيف — مشتقة من روابط الصور التحريرية القديمة،
 * فلا نضيف أي نص عربي جديد هنا (قاعدة العزل اللغوي).
 */
const COLOR_BY_EDITORIAL_IMAGE: Record<string, [string, string]> = {
  [CATEGORY_EDITORIAL_IMAGES.law]: ["0d2b18", "c8a84e"],
  [CATEGORY_EDITORIAL_IMAGES.netherlands]: ["113d22", "c8a84e"],
  [CATEGORY_EDITORIAL_IMAGES.community]: ["14532d", "c8a84e"],
  [CATEGORY_EDITORIAL_IMAGES.culture]: ["451a03", "fde047"],
  [CATEGORY_EDITORIAL_IMAGES.economy]: ["111827", "fbbf24"],
  [CATEGORY_EDITORIAL_IMAGES.islamic]: ["3b2f0b", "fde047"],
  [CATEGORY_EDITORIAL_IMAGES.sports]: ["064e3b", "a7f3d0"],
  [CATEGORY_EDITORIAL_IMAGES.health]: ["0f3d3e", "99f6e4"],
  [CATEGORY_EDITORIAL_IMAGES.education]: ["1e3a8a", "bfdbfe"],
  [CATEGORY_EDITORIAL_IMAGES.europe]: ["0b2545", "8da9c4"],
  [CATEGORY_EDITORIAL_IMAGES.general]: ["113d22", "c8a84e"],
};

/** هاش ثابت للعنوان الكامل — النص المعروض يُقتطع لكن الهوية لا تُقتطع */
function stableHash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function shiftColor(hex: string, seed: number): string {
  const channel = (offset: number, delta: number) =>
    Math.max(0, Math.min(255, parseInt(hex.slice(offset, offset + 2), 16) + delta))
      .toString(16)
      .padStart(2, "0");
  return (
    channel(0, (seed & 31) - 16) +
    channel(2, ((seed >>> 5) & 31) - 16) +
    channel(4, ((seed >>> 10) & 31) - 16)
  );
}

/**
 * صورة فريدة لكل خبر تُستخدم في استجابات API (الموبايل)، لأن React Native
 * لا يعرض SVG من data-uri بشكل موثوق. اللون مشتق من هاش العنوان الكامل،
 * فلا تتكرر صورة بين خبرين يتشاركان أول ١٨ حرفاً من العنوان.
 */
export function getUniqueImageUrl(title?: string | null, category?: string | null): string {
  const hash = stableHash(`${category || ""}|${title || "SGN"}`);
  const [baseBg, baseFg] = COLOR_BY_EDITORIAL_IMAGE[getEditorialFallback(title, category)] || ["113d22", "c8a84e"];
  const bg = shiftColor(baseBg, hash);
  const fg = shiftColor(baseFg, hash >>> 15);
  const label = (title || "SGN").slice(0, 18);
  return `https://placehold.co/800x450/${bg}/${fg}/png?text=${encodeURIComponent(label)}`;
}

/** Placeholder SVG خضراء بتصميم الجالية — تُستخدم كاحتياطي افتراضي ثابت */
export const PLACEHOLDER_IMG = getPremiumPlaceholder(null, null);

/** onError handler: صورة فريدة بعنوان المقال بدل صورة عامة تتكرر في عشرات الأخبار */
export function handleImgError(e: SyntheticEvent<HTMLImageElement>, title?: string | null, category?: string | null) {
  const img = e.currentTarget;
  const fallback = (title || category) ? getPremiumPlaceholder(title, category) : PLACEHOLDER_IMG;
  if (img.src !== fallback) {
    img.src = fallback;
  }
}

/** رابط صورة صالح للمتصفح — الصور العامة تُعتبر كأنها غير موجودة */
function hasUsableImage(img?: string | null): boolean {
  if (!img || isGenericImageUrl(img)) return false;
  return img.startsWith("http") || img.startsWith("/") || img.startsWith("data:");
}

/** للويب: بديل فريد بعنوان المقال (SVG محلي بلا شبكة خارجية) */
export function resolveImage(img?: string | null, title?: string | null, category?: string | null): string {
  if (hasUsableImage(img)) return img!;
  return (title || category) ? getPremiumPlaceholder(title, category) : PLACEHOLDER_IMG;
}

/** لـ API والموبايل: بديل فريد برابط حقيقي (React لا يعرض SVG من data-uri) */
export function resolveApiImage(img?: string | null, title?: string | null, category?: string | null): string {
  if (hasUsableImage(img)) return img!;
  return getUniqueImageUrl(title, category);
}
