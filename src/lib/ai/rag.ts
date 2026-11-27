import { prisma } from "@/lib/db";
import { embedText } from "@/lib/ai/embeddings";
import { searchVectors } from "@/lib/ai/vector-search";
import { logger } from "@/lib/logger";

// Semantic news search (Jina + Qdrant). Returns null if unavailable.
async function searchNewsSemantic(question: string, locale: string): Promise<{ id: string; slug: string | null; title: string; excerpt: string | null; category: string; createdAt: Date }[] | null> {
  try {
    if (!process.env.JINA_API_KEY || !process.env.QDRANT_URL) return null;
    const vec = await embedText(question);
    const hits = await searchVectors(vec, 5);
    if (hits.length === 0) return null;
    // Fetch full post data for the hits
    const ids = hits.map((h) => h.id);
    const posts = await prisma.post.findMany({
      where: { id: { in: ids }, published: true },
      select: { id: true, slug: true, title: true, excerpt: true, category: true, createdAt: true },
    });
    // Preserve vector order
    const byId = new Map(posts.map((p) => [p.id, p]));
    return hits.map((h) => byId.get(h.id)).filter(Boolean) as any;
  } catch (e) {
    logger.warn("RAG", "semantic news search failed, falling back to keyword:", (e as Error).message);
    return null;
  }
}

const STOP_WORDS = new Set([
  "ما", "هل", "كيف", "أين", "متى", "لماذا", "من", "إلى", "عن", "على", "في", "مع", "هل", "هذا",
  "هذه", "ذلك", "تلك", "كان", "كانت", "يكون", "يكون", "ليس", "إن", "أن", "قد", "لقد", "سوف",
  "سيتم", "يمكن", "يجب", "هو", "هي", "هم", "هن", "أنا", "نحن", "أنت", "أنتم", "أو", "و",
  "ثم", "أي", "كل", "بعض", "منذ", "حتى", "لا", "لم", "لن", "ما", "من", "اذا", "إذا", "شو", "ليش", "وين", "إيمتى", "مين", "بدي", "عم",
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "could",
  "should", "may", "might", "shall", "can", "need", "dare", "ought",
  "used", "to", "of", "in", "for", "on", "with", "at", "by", "from",
  "as", "into", "through", "during", "before", "after", "above", "below",
  "between", "out", "off", "over", "under", "again", "further", "then",
  "once", "here", "there", "when", "where", "why", "how", "all", "each",
  "every", "both", "few", "more", "most", "other", "some", "such", "no",
  "nor", "not", "only", "own", "same", "so", "than", "too", "very",
  "de", "het", "een", "van", "en", "is", "zijn", "met", "op", "voor",
  "door", "aan", "in", "uit", "over", "na", "bij", "als", "maar", "om",
  "dat", "die", "dit", "ze", "zich", "we", "hij", "zij", "niet", "geen",
]);

function extractKeywords(text: string): string[] {
  const words = text.toLowerCase().split(/[\s,؟?.\-!]+/);
  return [...new Set(words.filter((w) => w.length > 2 && !STOP_WORDS.has(w)))];
}

function formatDate(d: Date, locale: string): string {
  try {
    return d.toLocaleDateString(locale === "ar" ? "ar-SA" : locale === "nl" ? "nl-NL" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return d.toISOString().split("T")[0];
  }
}

function buildKeywordOR(keywords: string[], fields: string[]) {
  return keywords.map((kw) => ({
    OR: fields.map((f) => ({ [f]: { contains: kw } })),
  }));
}

export interface RAGSource {
  title: string;
  type: string;
  id?: string;
  url?: string;
  excerpt?: string;
}

export interface RAGResult {
  context: string;
  sources: RAGSource[];
}

export async function buildRAGContext(question: string, locale: string): Promise<RAGResult> {
  const keywords = extractKeywords(question);
  if (keywords.length === 0) return { context: "", sources: [] };

  const parts: string[] = [];
  const sources: RAGSource[] = [];
  const seen = new Set<string>();

  // كل مصدر يُسجَّل مرة واحدة فقط؛ الرقم الذي نعيده يُلصق بسطر السياق المقابل،
  // فيبقى [n] في النص مطابقاً للمصدر رقم n في المصفوفة التي تُعاد للعميل.
  function registerSource(source: RAGSource): string | null {
    const key = `${source.type}\u0000${source.id ?? `${source.title}\u0000${source.excerpt ?? ""}`}`;
    if (seen.has(key)) return null;
    seen.add(key);
    sources.push(source);
    return `[${sources.length}]`;
  }

  // Search FAQs (FAQ)
  const faqs = await prisma.fAQ.findMany({
    where: {
      published: true,
      OR: buildKeywordOR(keywords, ["questionAr", "questionNl", "questionEn", "answerAr", "answerNl", "answerEn", "tags"]),
    },
    take: 5,
    select: { id: true, questionAr: true, questionNl: true, questionEn: true, answerAr: true, answerNl: true, answerEn: true, category: true },
  });

  if (faqs.length > 0) {
    const lines: string[] = [];
    for (const f of faqs) {
      const q = locale === "ar" ? f.questionAr : locale === "nl" ? f.questionNl : f.questionEn;
      const a = locale === "ar" ? f.answerAr : locale === "nl" ? f.answerNl : f.answerEn;
      const excerpt = a.slice(0, 300);
      const marker = registerSource({ title: q, type: "faq", id: f.id, excerpt });
      if (!marker) continue;
      lines.push(`- س: ${q}\n  ج: ${a} (${f.category}) ${marker}`);
    }
    if (lines.length > 0) parts.push("=== الأسئلة الشائعة (FAQs) ===", ...lines);
  }

  // Search guides (Guide)
  const guides = await prisma.guide.findMany({
    where: {
      OR: buildKeywordOR(keywords, ["titleAr", "titleNl", "titleEn", "contentAr", "contentNl", "contentEn", "tags"]),
    },
    take: 5,
    select: { id: true, titleAr: true, titleNl: true, titleEn: true, contentAr: true, contentNl: true, contentEn: true, category: true },
  });

  if (guides.length > 0) {
    const lines: string[] = [];
    for (const g of guides) {
      const title = locale === "ar" ? g.titleAr : locale === "nl" ? g.titleNl : g.titleEn;
      const content = locale === "ar" ? g.contentAr : locale === "nl" ? g.contentNl : g.contentEn;
      const excerpt = content.slice(0, 300);
      const marker = registerSource({ title, type: "guide", id: g.id, excerpt });
      if (!marker) continue;
      lines.push(`- ${title} (التصنيف: ${g.category}): ${excerpt}... ${marker}`);
    }
    if (lines.length > 0) parts.push("=== أدلة الاندماج والتعليمات ===", ...lines);
  }

  // Search news (Post) — semantic first, keyword fallback
  let news: { id: string; slug: string | null; title: string; excerpt: string | null; category: string; createdAt: Date }[] = [];
  const semanticNews = await searchNewsSemantic(question, locale);
  if (semanticNews && semanticNews.length > 0) {
    news = semanticNews;
  } else {
    news = await prisma.post.findMany({
      where: {
        published: true,
        OR: buildKeywordOR(keywords, ["title", "excerpt", "content", "tags"]),
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, slug: true, title: true, excerpt: true, category: true, createdAt: true },
    });
  }

  if (news.length > 0) {
    const lines: string[] = [];
    for (const n of news) {
      const marker = registerSource({
        title: n.title,
        type: "news",
        id: n.id,
        ...(n.slug ? { url: `/${locale}/news/${encodeURIComponent(n.slug)}` } : {}),
        excerpt: n.excerpt ?? undefined,
      });
      if (!marker) continue;
      lines.push(`- ${n.title}${n.excerpt ? `: ${n.excerpt}` : ""} (${n.category} - ${formatDate(n.createdAt, locale)}) ${marker}`);
    }
    if (lines.length > 0) parts.push("=== أخبار الجالية ===", ...lines);
  }

  const events = await prisma.event.findMany({
    where: {
      published: true,
      date: { gte: new Date() },
      OR: buildKeywordOR(keywords, ["title", "description"]),
    },
    orderBy: { date: "asc" },
    take: 5,
    select: { id: true, title: true, description: true, date: true, location: true },
  });

  if (events.length > 0) {
    const lines: string[] = [];
    for (const e of events) {
      const marker = registerSource({
        title: e.title,
        type: "event",
        id: e.id,
        url: `/${locale}/events`,
        excerpt: e.description ?? undefined,
      });
      if (!marker) continue;
      lines.push(`- ${e.title}${e.description ? `: ${e.description}` : ""} (${formatDate(e.date, locale)}${e.location ? `, ${e.location}` : ""}) ${marker}`);
    }
    if (lines.length > 0) parts.push("=== الفعاليات القادمة ===", ...lines);
  }

  const volunteers = await prisma.volunteer.findMany({
    where: { OR: buildKeywordOR(keywords, ["name", "skills", "message"]) },
    take: 5,
    select: { id: true, name: true, skills: true },
  });

  if (volunteers.length > 0) {
    const lines: string[] = [];
    for (const v of volunteers) {
      const marker = registerSource({ title: v.name, type: "volunteer", id: v.id, excerpt: v.skills ?? undefined });
      if (!marker) continue;
      lines.push(`- ${v.name}${v.skills ? ` (مهارات: ${v.skills})` : ""} ${marker}`);
    }
    if (lines.length > 0) parts.push("=== المتطوعون ===", ...lines);
  }

  const members = await prisma.member.findMany({
    where: {
      showInPublicProfile: true,
      OR: buildKeywordOR(keywords, ["nameAr", "nameNl", "profession", "skills", "nlCity", "originCity"]),
    },
    take: 5,
    select: { id: true, nameAr: true, nameNl: true, profession: true, skills: true, nlCity: true, isServiceProvider: true, serviceDescription: true },
  });

  if (members.length > 0) {
    const lines: string[] = [];
    for (const m of members) {
      const name = `${m.nameAr} / ${m.nameNl}`;
      const info = [m.profession, m.skills, m.nlCity].filter(Boolean).join("، ");
      const service = (m as any).isServiceProvider ? ` [يقدم خدمة: ${(m as any).serviceDescription}]` : "";
      const marker = registerSource({
        title: name,
        type: "member",
        id: m.id,
        url: `/${locale}/member/${m.id}`,
        excerpt: `${info}${service}`.trim() || undefined,
      });
      if (!marker) continue;
      lines.push(`- ${name}${info ? ` (${info})` : ""}${service} ${marker}`);
    }
    if (lines.length > 0) parts.push("=== الأعضاء ومزودو الخدمات ===", ...lines);
  }

  const tasks = await prisma.task.findMany({
    where: { OR: buildKeywordOR(keywords, ["title", "description"]) },
    take: 5,
    select: { id: true, title: true, description: true, status: true, priority: true },
  });

  if (tasks.length > 0) {
    const lines: string[] = [];
    for (const t of tasks) {
      const marker = registerSource({
        title: t.title,
        type: "task",
        id: t.id,
        url: `/${locale}/tasks`,
        excerpt: t.description ?? undefined,
      });
      if (!marker) continue;
      lines.push(`- ${t.title}${t.description ? `: ${t.description}` : ""} [${t.status}، أولوية: ${t.priority}] ${marker}`);
    }
    if (lines.length > 0) parts.push("=== المهام ===", ...lines);
  }

  // Search regulations (Regulation)
  const regulations = await prisma.regulation.findMany({
    where: {
      published: true,
      OR: buildKeywordOR(keywords, ["title", "description"]),
    },
    take: 3,
    select: { id: true, title: true, description: true },
  });

  if (regulations.length > 0) {
    const lines: string[] = [];
    for (const r of regulations) {
      const marker = registerSource({
        title: r.title,
        type: "regulation",
        id: r.id,
        url: `/${locale}/regulations`,
        excerpt: r.description || undefined,
      });
      if (!marker) continue;
      lines.push(`- ${r.title}: ${r.description} ${marker}`);
    }
    if (lines.length > 0) parts.push("=== الأنظمة واللوائح ===", ...lines);
  }

  // Search landing pages content (LandingPage)
  const landings = await prisma.landingPage.findMany({
    where: {
      published: true,
      OR: buildKeywordOR(keywords, ["title", "subtitle", "content", "heroHeadline", "heroSubheadline"]),
    },
    take: 3,
    select: { id: true, slug: true, title: true, subtitle: true, content: true },
  });

  if (landings.length > 0) {
    const lines: string[] = [];
    for (const l of landings) {
      const excerpt = l.content.slice(0, 200);
      const marker = registerSource({
        title: l.title,
        type: "landing",
        id: l.id,
        url: `/${locale}/landing/${encodeURIComponent(l.slug)}`,
        excerpt,
      });
      if (!marker) continue;
      lines.push(`- ${l.title}${l.subtitle ? ` (${l.subtitle})` : ""}: ${excerpt}... ${marker}`);
    }
    if (lines.length > 0) parts.push("=== صفحات تعريفية ومعلومات عامة ===", ...lines);
  }

  // Search board members (BoardMember)
  const board = await prisma.boardMember.findMany({
    where: {
      OR: buildKeywordOR(keywords, ["nameAr", "nameEn", "titleAr", "titleEn", "committees", "bioPoints"]),
    },
    take: 5,
  });

  if (board.length > 0) {
    const lines: string[] = [];
    for (const b of board) {
      const name = locale === "ar" ? b.nameAr : b.nameEn;
      const title = locale === "ar" ? b.titleAr : b.titleEn;
      const marker = registerSource({
        title: name,
        type: "board",
        id: b.id,
        url: `/${locale}/about`,
        excerpt: `${title} - اللجان: ${b.committees}`,
      });
      if (!marker) continue;
      lines.push(`- ${name} (${title})${b.isFounder ? " [عضو مؤسس]" : ""}: اللجان: ${b.committees} ${marker}`);
    }
    if (lines.length > 0) parts.push("=== أعضاء مجلس الإدارة وفريق العمل ===", ...lines); // i18n-ignore — RAG context header
  }

  return { context: parts.join("\n"), sources };
}
