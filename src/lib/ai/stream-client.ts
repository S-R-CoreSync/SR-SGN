export type AICitationSource = {
  title: string;
  type: string;
  id?: string;
  url?: string;
  excerpt?: string;
};

export type AIChatStreamParams = {
  message: string;
  sessionId: string | null;
  locale: string;
  persona: string;
  onDelta?: (delta: string, accumulated: string) => void;
};

export type AIChatStreamResult = {
  reply: string;
  sessionId: string | null;
  sources: AICitationSource[];
};

type StreamEvent = {
  delta?: string;
  done?: boolean;
  error?: string;
  sessionId?: string;
  sources?: AICitationSource[];
};

function parseEvents(chunk: string): { events: StreamEvent[]; rest: string } {
  const normalized = chunk.replace(/\r\n/g, "\n");
  const parts = normalized.split("\n\n");
  const rest = parts.pop() ?? "";
  const events: StreamEvent[] = [];

  for (const part of parts) {
    const line = part
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!line || line === "[DONE]") continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      // تجاهل أي سطر لا يمكن قراءته؛ لا يعني فشل الإجابة كاملة.
    }
  }
  return { events, rest };
}

async function fallbackChat(params: AIChatStreamParams): Promise<AIChatStreamResult> {
  const res = await fetch("/api/chat/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message: params.message,
      sessionId: params.sessionId,
      locale: params.locale,
      persona: params.persona,
    }),
  });
  if (!res.ok) throw new Error("chat_failed");
  const data = (await res.json()) as {
    reply?: string;
    sessionId?: string;
    sources?: AICitationSource[];
  };
  const reply = data.reply ?? "";
  params.onDelta?.(reply, reply);
  return { reply, sessionId: data.sessionId ?? params.sessionId, sources: data.sources ?? [] };
}

/** بثّ إجابة الذكاء مع الرجوع تلقائياً للمسار العادي عند أي خلل. */
export async function streamAIChat(params: AIChatStreamParams): Promise<AIChatStreamResult> {
  try {
    const res = await fetch("/api/chat/ai/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: params.message,
        sessionId: params.sessionId,
        locale: params.locale,
        persona: params.persona,
      }),
    });
    if (!res.ok || !res.body) return fallbackChat(params);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply = "";
    let sessionId = params.sessionId;
    let sources: AICitationSource[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = parseEvents(buffer);
      buffer = parsed.rest;

      for (const event of parsed.events) {
        if (event.error) throw new Error(event.error);
        if (typeof event.delta === "string" && event.delta) {
          reply += event.delta;
          params.onDelta?.(event.delta, reply);
        }
        if (event.done) {
          sessionId = event.sessionId ?? sessionId;
          sources = event.sources ?? sources;
        }
      }
    }

    if (!reply) return fallbackChat(params);
    return { reply, sessionId, sources };
  } catch {
    return fallbackChat(params);
  }
}
