import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { isAdmin, requireAuthorize } from "@/lib/auth-helpers";
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

const CATEGORIES = ["inquiry", "complaint", "praise", "spam", "other"] as const;
type Category = (typeof CATEGORIES)[number];

type Review = { category: Category; summary: string; reply: string };

function strip(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/```(?:json)?/gi, "")
    // Suggestions never carry figures; the moderator adds real details manually.
    .replace(/[0-9\u0660-\u0669\u06F0-\u06F9]/g, "")
    .trim()
    .slice(0, max);
}

function extractJson(raw: string): Review | null {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    if (!parsed || typeof parsed !== "object") return null;
    const category = String(parsed.category ?? "").toLowerCase();
    if (!(CATEGORIES as readonly string[]).includes(category)) return null;
    return {
      category: category as Category,
      summary: strip(parsed.summary, 400),
      reply: strip(parsed.reply, 600),
    };
  } catch {
    return null;
  }
}

function isLanguagePure(review: Review, locale: Locale): boolean {
  return (
    review.summary.length > 0 &&
    review.reply.length > 0 &&
    [review.summary, review.reply].every(
      (value) =>
        isPureLocaleText(value, locale) && (locale !== "ar" || !/[A-Za-z]/.test(value)),
    )
  );
}

function systemPrompt(locale: Locale, retry: boolean): string {
  return (
    "You help a Syrian community organisation review incoming messages. " +
    "Reply with one JSON object only, with exactly these string keys: category, summary, reply. " +
    `category must be exactly one of: ${CATEGORIES.join(", ")}. ` +
    `Write summary and reply entirely in ${LANGUAGE_NAME[locale]}. ` +
    "Be neutral and respectful. Summarise only what is actually in the text. " +
    "Do not invent facts, names, dates, figures or promises. Do not use digits anywhere. " +
    "The reply is a draft for a human to review, never a message to send. " +
    "Keep summary under 400 characters and reply under 600 characters." +
    (retry ? ` Previous output mixed languages; write only in ${LANGUAGE_NAME[locale]}.` : "")
  );
}

async function loadItem(kind: string, id: string) {
  if (kind === "comment") {
    const item = await prisma.comment.findUnique({
      where: { id },
      select: { author: true, content: true },
    });
    return item ? `Author: ${item.author}\nComment: ${item.content.slice(0, 1500)}` : null;
  }
  const item = await prisma.contact.findUnique({
    where: { id },
    select: { name: true, email: true, subject: true, message: true },
  });
  return item
    ? `Name: ${item.name ?? ""}\nEmail: ${item.email ?? ""}\nSubject: ${item.subject ?? ""}\nMessage: ${(item.message ?? "").slice(0, 1500)}`
    : null;
}

export async function POST(req: Request) {
  const started = Date.now();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const localeCookie = (req as any).cookies?.get?.("NEXT_LOCALE")?.value;
  const locale: Locale = LOCALES.includes(localeCookie as Locale) ? (localeCookie as Locale) : "ar";
  const t = (key: string) => getApiMessage(locale, key);

  const body = await req.json().catch(() => ({}));
  const kind = body.kind === "comment" ? "comment" : body.kind === "contact" ? "contact" : "";
  if (!kind || typeof body.id !== "string" || !body.id) {
    return NextResponse.json({ error: t("api.allFieldsRequired") }, { status: 400 });
  }

  const allowed =
    kind === "comment"
      ? Boolean(userId && (await requireAuthorize(userId, "comments.approve")))
      : Boolean(userId && isAdmin((session.user as any)?.role));
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const text = await loadItem(kind, body.id).catch(() => null);
  if (!text) return NextResponse.json({ error: t("ai.inboxReviewNotFound") }, { status: 404 });

  let review: Review | null = null;
  try {
    for (const retry of [false, true]) {
      const raw = await generateText(text, systemPrompt(locale, retry), { responseFormat: "json" });
      const candidate = extractJson(raw);
      if (candidate && isLanguagePure(candidate, locale)) {
        review = candidate;
        break;
      }
    }
    if (!review) {
      await logAIUsage({
        userId,
        route: "/api/ai/inbox-review",
        locale,
        status: "error",
        error: "language_guard",
        latencyMs: Date.now() - started,
      });
      return NextResponse.json({ error: t("ai.inboxReviewLanguageFailed") }, { status: 422 });
    }
  } catch (error) {
    await logAIUsage({
      userId,
      route: "/api/ai/inbox-review",
      locale,
      status: "error",
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      latencyMs: Date.now() - started,
    });
    return NextResponse.json({ error: t("ai.inboxReviewFailed") }, { status: 502 });
  }

  // Read-only suggestion: nothing is approved, sent or edited here.
  const approval = await prisma.aIApproval.create({
    data: {
      kind: `inbox_review_${kind}`,
      title: review.summary.slice(0, 200),
      payload: JSON.stringify({ ...review, itemId: body.id }),
      status: "pending",
      requestedBy: userId,
    },
    select: { id: true },
  });
  await prisma.activityLog.create({
    data: {
      memberId: userId as string,
      userId: userId as string,
      action: t(kind === "comment" ? "ai.commentReviewActivity" : "ai.contactReviewActivity"),
      details: review.summary.slice(0, 200),
    },
  });
  await logAIUsage({
    userId,
    route: "/api/ai/inbox-review",
    locale,
    status: "success",
    latencyMs: Date.now() - started,
  });

  return NextResponse.json({ review, suggestionId: approval.id });
}
