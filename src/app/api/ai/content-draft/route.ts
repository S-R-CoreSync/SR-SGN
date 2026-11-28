import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";
import { generateText } from "@/lib/ai/provider";
import { logAIUsage } from "@/lib/ai/usage";
import { isPureLocaleText } from "@/lib/language-guard";

const LOCALES = ["ar", "en", "nl"] as const;
type Locale = (typeof LOCALES)[number];

const LANGUAGE_NAME: Record<Locale, string> = {
  ar: "Arabic",
  en: "English",
  nl: "Dutch",
};

type Draft = { title: string; excerpt: string; content: string; tags: string };

function clean(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/```(?:json)?/gi, "")
    // No invented figures in a suggestion: the editor adds real numbers manually.
    .replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, "")
    .trim()
    .slice(0, max);
}

function extractJson(raw: string): Draft | null {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object") return null;
    return {
      title: clean(parsed.title, 100),
      excerpt: clean(parsed.excerpt, 240),
      content: clean(parsed.content, 1200),
      tags: clean(parsed.tags, 200),
    };
  } catch {
    return null;
  }
}

function isLanguagePure(draft: Draft, locale: Locale): boolean {
  const fields = [draft.title, draft.excerpt, draft.content, draft.tags];
  return (
    draft.title.length > 0 &&
    draft.content.length > 0 &&
    fields.every((value) =>
      isPureLocaleText(value, locale) && (locale !== "ar" || !/[A-Za-z]/.test(value)),
    )
  );
}

function systemPrompt(locale: Locale, retry: boolean): string {
  return (
    "You draft content for a Syrian community organisation. " +
    "Reply with one JSON object only, with exactly these string keys: title, excerpt, content, tags. " +
    `Write every value entirely in ${LANGUAGE_NAME[locale]}. ` +
    "Use a neutral, respectful, formal tone. Do not invent facts, names, dates, statistics or numbers. " +
    "Do not use digits anywhere. Keep title under 100 characters, excerpt under 240, content under 1200 characters. " +
    "Tags must be a short comma-separated list." +
    (retry ? ` Previous output mixed languages; every value must be in ${LANGUAGE_NAME[locale]} only.` : "")
  );
}

export async function POST(req: Request) {
  const started = Date.now();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const localeCookie = (req as any).cookies?.get?.("NEXT_LOCALE")?.value;
  const locale: Locale = LOCALES.includes(localeCookie as Locale) ? (localeCookie as Locale) : "ar";
  const t = (key: string) => getApiMessage(locale, key);

  if (!userId || !(await requireAuthorize(userId, "pages.create"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const idea = clean(body.idea, 1000);
  if (idea.length < 5) {
    return NextResponse.json({ error: t("ai.contentDraftInvalidIdea") }, { status: 400 });
  }

  let draft: Draft | null = null;
  try {
    for (const retry of [false, true]) {
      const raw = await generateText(idea, systemPrompt(locale, retry), { responseFormat: "json" });
      const candidate = extractJson(raw);
      if (candidate && isLanguagePure(candidate, locale)) {
        draft = candidate;
        break;
      }
    }
    if (!draft) {
      await logAIUsage({ userId, route: "/api/ai/content-draft", locale, status: "error", error: "language_guard", latencyMs: Date.now() - started });
      return NextResponse.json({ error: t("ai.contentDraftLanguageFailed") }, { status: 422 });
    }
  } catch (error) {
    await logAIUsage({
      userId,
      route: "/api/ai/content-draft",
      locale,
      status: "error",
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      latencyMs: Date.now() - started,
    });
    return NextResponse.json({ error: t("ai.contentDraftFailed") }, { status: 502 });
  }

  // The suggestion is only recorded for review. It never creates or edits a post.
  const approval = await prisma.aIApproval.create({
    data: {
      kind: "content_draft",
      title: draft.title.slice(0, 200),
      payload: JSON.stringify(draft),
      status: "pending",
      requestedBy: userId,
    },
    select: { id: true },
  });
  await prisma.activityLog.create({
    data: {
      memberId: userId,
      userId,
      action: t("ai.contentDraftActivity"),
      details: draft.title.slice(0, 200),
    },
  });
  await logAIUsage({ userId, route: "/api/ai/content-draft", locale, status: "success", latencyMs: Date.now() - started });

  return NextResponse.json({ draft, suggestionId: approval.id });
}
