import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateSession } from "@/lib/ai/chat";
import { generateChatStream } from "@/lib/ai/provider";
import { buildRAGContext } from "@/lib/ai/rag";
import { getSessionUser } from "@/lib/mobile-auth";
import { createRateLimiter } from "@/lib/rate-limit";
import { applyGuardrails } from "@/lib/guardrails";
import { logger } from "@/lib/logger";
import { logAIUsage } from "@/lib/ai/usage";

// provider.ts uses fs.env fallback, so this route must run on Node.js.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Same name as /api/chat/ai so both endpoints share one 30/min quota per user.
const chatLimiter = createRateLimiter({ maxRequests: 30, windowMs: 60_000, name: "ai-chat" });

const VALID_LOCALES = new Set(["ar", "en", "nl"]);
const PERSONA_LABELS: Record<string, string> = {
  general: "المساعد العام للجالية", // i18n-ignore — prompt metadata, never rendered as UI
  legal: "المستشار القانوني وإجراءات اللجوء", // i18n-ignore
  integration: "مرشد الاندماج واللغة", // i18n-ignore
  employment: "مستشار التوظيف والسكن الاجتماعي", // i18n-ignore
  spokesperson: "الناطق الإعلامي للجالية", // i18n-ignore
};

/** Minimal, safe prompt used when buildSystemPrompt isn't exported by chat.ts. */
function buildMinimalSystemPrompt(locale: string, userName: string, persona: string, ragContext?: string): string {
  const lang = locale === "ar" ? "بالعربية" : locale === "nl" ? "in het Nederlands" : "in English"; // i18n-ignore — prompt language instruction
  const personaLabel = PERSONA_LABELS[persona] || PERSONA_LABELS.general;
  let prompt = `أنت مساعد ذكي للجالية السورية في هولندا (SGN). اسم المستخدم الذي تتحدث معه هو "${userName}". تحدث ${lang} دائماً، وكن ودوداً وواضحاً ومفيداً. دورك الحالي: ${personaLabel}. إذا سألك عن شيء لا تعرفه قل بصراحة أنك لا تعرف ولا تخترع معلومات، وفي المواضيع القانونية أو الطبية الحساسة نبّه لضرورة الرجوع للجهات الرسمية والمختصين.`; // i18n-ignore — server prompt
  if (ragContext) {
    prompt += `\n\nمعلومات حديثة من قاعدة بيانات الموقع (اعتمد عليها أولاً عند ارتباطها بالسؤال):\n${ragContext}`; // i18n-ignore — server prompt
  }
  return prompt;
}

/** Uses chat.ts's buildSystemPrompt when available; otherwise the local one. */
async function resolveSystemPrompt(locale: string, userName: string, persona: string, ragContext?: string): Promise<string> {
  try {
    const chatModule = (await import("@/lib/ai/chat")) as unknown as {
      buildSystemPrompt?: (locale: string, userName: string, persona: string, ragContext?: string) => string;
    };
    if (typeof chatModule.buildSystemPrompt === "function") {
      return chatModule.buildSystemPrompt(locale, userName, persona, ragContext);
    }
  } catch (err) {
    logger.warn("API/chat/ai/stream", "buildSystemPrompt unavailable, using minimal prompt:", err instanceof Error ? err.name : "unknown error");
  }
  return buildMinimalSystemPrompt(locale, userName, persona, ragContext);
}

/** Never echo upstream bodies, tokens or keys to the browser. */
function safeErrorMessage(err: unknown): string {
  if (!(err instanceof Error)) return "Internal server error";
  return (err.message || "Internal server error")
    .slice(0, 200)
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(sk-|gsk_|ghp_|AIza)[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/([?&]key=)[^&\s]+/gi, "$1[redacted]");
}

export async function POST(req: Request) {
  const started = Date.now();
  const user = await getSessionUser(req);
  if (!user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (chatLimiter.isLimited(user.id)) {
    const retryAfter = Math.ceil((chatLimiter.getResetTime(user.id) - Date.now()) / 1000);
    return NextResponse.json(
      { error: `Rate limit exceeded. Try again in ${retryAfter}s.` },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  try {
    const { message, sessionId, locale, persona } = await req.json();
    if (!message?.trim()) {
      return NextResponse.json({ error: "message is required" }, { status: 400 });
    }

    const guarded = applyGuardrails({
      messages: [{ role: "user", content: message.trim() }],
    });
    if (guarded.blocked) {
      return NextResponse.json(
        { error: guarded.reason || "Message blocked by guardrails" },
        { status: 400 }
      );
    }
    const cleanMessage = guarded.messages[0].content;

    // A session ID supplied by the client must belong to the authenticated user.
    if (sessionId) {
      const owned = await prisma.chatAISession.findFirst({
        where: { id: sessionId, userId: user.id },
        select: { id: true },
      });
      if (!owned) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const requestedLocale = typeof locale === "string" ? locale : "ar";
    const userLocale = VALID_LOCALES.has(requestedLocale) ? requestedLocale : "ar";
    const personaOverride = typeof persona === "string" && PERSONA_LABELS[persona] ? persona : undefined;
    const sid = sessionId || await getOrCreateSession(user.id, personaOverride);
    const userName = user.name || user.email || "User";

    // Persist the user message and load history exactly like sendAIMessage does.
    await prisma.chatAIMessage.create({
      data: { sessionId: sid, role: "user", content: cleanMessage },
    });

    const sessionObj = await prisma.chatAISession.findUnique({
      where: { id: sid },
      select: { persona: true },
    });
    const effectivePersona = personaOverride || sessionObj?.persona || "general";
    if (personaOverride && sessionObj && sessionObj.persona !== personaOverride) {
      await prisma.chatAISession.update({
        where: { id: sid },
        data: { persona: personaOverride },
      });
    }

    const history = await prisma.chatAIMessage.findMany({
      where: { sessionId: sid },
      orderBy: { createdAt: "asc" },
      take: 20,
    });
    const conversationParts = history.map((m: { role: string; content: string }) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "user" | "assistant",
      content: m.content,
    }));

    const ragResult = await buildRAGContext(cleanMessage, userLocale);
    const systemPrompt = await resolveSystemPrompt(userLocale, userName, effectivePersona, ragResult.context || undefined);

    const encoder = new TextEncoder();

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let closed = false;
        const send = (payload: unknown) => {
          if (closed) return;
          try {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
          } catch {
            // Client disconnected; nothing else to send.
            closed = true;
          }
        };
        let full = "";
        try {
          for await (const delta of generateChatStream(conversationParts, systemPrompt)) {
            if (!delta) continue;
            full += delta;
            send({ delta });
          }
          if (!full.trim()) throw new Error("AI response empty");

          await prisma.chatAIMessage.create({
            data: { sessionId: sid, role: "assistant", content: full },
          });
          send({ done: true, sessionId: sid, sources: ragResult.sources });
          await logAIUsage({
            userId: user.id,
            route: "/api/chat/ai/stream",
            locale: userLocale,
            status: "success",
            latencyMs: Date.now() - started,
          });
        } catch (err) {
          logger.error("API/chat/ai/stream", "AI streaming error:", err);
          await logAIUsage({
            userId: user.id,
            route: "/api/chat/ai/stream",
            locale: userLocale,
            status: "error",
            latencyMs: Date.now() - started,
            error: safeErrorMessage(err),
          });
          send({ error: safeErrorMessage(err) });
        } finally {
          if (!closed) {
            closed = true;
            try {
              controller.close();
            } catch {
              // Already closed by the runtime.
            }
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (e: any) {
    logger.error("API/chat/ai/stream", "AI chat stream setup error:", e);
    await logAIUsage({
      userId: user?.id,
      route: "/api/chat/ai/stream",
      status: "error",
      latencyMs: Date.now() - started,
      error: safeErrorMessage(e),
    });
    return NextResponse.json({ error: "AI chat stream failed" }, { status: 500 });
  }
}
