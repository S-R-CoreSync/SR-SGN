import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireAuthorize } from "@/lib/auth-helpers";
import { prisma } from "@/lib/db";
import { getApiMessage } from "@/lib/api-messages";
import { decryptBuffer } from "@/lib/crypto";
import { generateVisionJson } from "@/lib/ai/vision";
import { logAIUsage } from "@/lib/ai/usage";
import { createRateLimiter } from "@/lib/rate-limit";
import { tooMany } from "@/lib/request-guard";
import { logger } from "@/lib/logger";
import fs from "fs/promises";
import path from "path";

const reviewLimiter = createRateLimiter({ maxRequests: 10, windowMs: 60_000, name: "ai-identity-review" });

const LOCALES = ["ar", "en", "nl"] as const;
type Locale = (typeof LOCALES)[number];

type Outcome = "match" | "mismatch" | "unclear";
type Confidence = "high" | "medium" | "low";

function parseExtraction(raw: string) {
  const text = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    const parsed = JSON.parse(text.slice(start, end + 1));
    const confidence: Confidence = ["high", "medium", "low"].includes(parsed.confidence)
      ? parsed.confidence
      : "low";
    return {
      name: String(parsed.name ?? "").slice(0, 200),
      birthYear: Number(parsed.birthYear ?? 0),
      readable: parsed.readable === true,
      confidence,
    };
  } catch {
    return null;
  }
}

function normalise(value: string): string {
  return value.toLowerCase().replace(/[\u064B-\u065F]/g, "").replace(/\s+/g, " ").trim();
}

export async function POST(req: Request) {
  const started = Date.now();
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const localeCookie = (req as any).cookies?.get?.("NEXT_LOCALE")?.value;
  const locale: Locale = LOCALES.includes(localeCookie as Locale) ? (localeCookie as Locale) : "ar";
  const t = (key: string, vars?: Record<string, string>) => getApiMessage(locale, key, vars);

  if (!userId || !(await requireAuthorize(userId, "volunteers.view"))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const limited = tooMany(reviewLimiter, userId);
  if (limited) return limited;

  const body = await req.json().catch(() => ({}));
  const memberId = typeof body.memberId === "string" ? body.memberId : "";
  if (!memberId) return NextResponse.json({ error: t("api.allFieldsRequired") }, { status: 400 });

  const member = await prisma.member.findUnique({
    where: { id: memberId },
    select: { nameAr: true, nameNl: true, birthYear: true, encryptedIdCard: true },
  });
  if (!member?.encryptedIdCard) {
    return NextResponse.json({ error: t("ai.identityNotFound") }, { status: 404 });
  }

  let extracted;
  try {
    let encryptedContent = "";
    if (member.encryptedIdCard.startsWith("/uploads/")) {
      const filePath = path.join(process.cwd(), "public", member.encryptedIdCard);
      encryptedContent = await fs.readFile(filePath, "utf8");
    } else {
      const response = await fetch(member.encryptedIdCard);
      if (!response.ok) throw new Error(`storage ${response.status}`);
      encryptedContent = await response.text();
    }

    const extension = member.encryptedIdCard.split(".").reverse()[1]?.toLowerCase() || "jpeg";
    if (extension === "pdf") throw new Error("pdf unsupported");
    const contentType = `image/${extension}`;
    const base64Image = decryptBuffer(encryptedContent).toString("base64");

    const raw = await generateVisionJson(
      [
        {
          text: "Extract the cardholder's full name and birth year from this identity card. Return only JSON.",
          inlineData: { mimeType: contentType, data: base64Image },
        },
      ],
      'Return only a JSON object with string-or-number keys: name, birthYear, readable (boolean), confidence ("high", "medium" or "low"). Read only what is printed on the card.',
    );
    extracted = parseExtraction(raw);
    if (!extracted) throw new Error("unparsable vision response");
  } catch (error) {
    await logAIUsage({
      userId,
      route: "/api/ai/identity-review",
      locale,
      status: "error",
      error: error instanceof Error ? error.message.slice(0, 500) : "unknown",
      latencyMs: Date.now() - started,
    });
    logger.warn("AI/identity-review", "Could not read identity card", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: t("ai.identityFailed") }, { status: 502 });
  }

  const nameMatch =
    extracted.readable &&
    Boolean(
      extracted.name &&
        [member.nameAr, member.nameNl].some(
          (value) =>
            value &&
            (normalise(value).includes(normalise(extracted.name)) ||
              normalise(extracted.name).includes(normalise(value))),
        ),
    );
  const yearMatch = extracted.readable && Boolean(member.birthYear) && extracted.birthYear === member.birthYear;

  const outcome: Outcome =
    !extracted.readable || extracted.confidence === "low"
      ? "unclear"
      : nameMatch && yearMatch
        ? "match"
        : "mismatch";
  const reasonKey =
    outcome === "match" ? "ai.identityReasonMatch" : outcome === "mismatch" ? "ai.identityReasonMismatch" : "ai.identityReasonUnclear";

  const review = {
    outcome,
    confidence: extracted.confidence,
    reason: t(reasonKey),
  };

  // Suggestion only: no member field or status is changed here.
  const approval = await prisma.aIApproval.create({
    data: {
      kind: "identity_review",
      title: t(`ai.identityOutcome.${outcome}`),
      payload: JSON.stringify({ memberId, outcome, confidence: extracted.confidence }),
      status: "pending",
      requestedBy: userId,
    },
    select: { id: true },
  });
  await prisma.activityLog.create({
    data: {
      memberId: userId as string,
      userId: userId as string,
      action: t("ai.identityReviewActivity"),
      details: review.reason.slice(0, 200),
    },
  });
  await logAIUsage({
    userId,
    route: "/api/ai/identity-review",
    locale,
    status: "success",
    latencyMs: Date.now() - started,
  });

  return NextResponse.json({ review, suggestionId: approval.id });
}
