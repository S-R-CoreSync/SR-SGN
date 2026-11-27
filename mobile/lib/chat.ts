import { apiFetch, getToken } from "./api";
import { API_URL } from "../constants/api";

export interface AISource {
  title: string;
  type: string;
  id?: string;
  url?: string;
  excerpt?: string;
}

export interface AIMessage {
  role: "user" | "assistant";
  content: string;
  sources?: AISource[];
}

export interface AISession {
  id: string;
  userId: string;
  messages: AIMessage[];
  createdAt: string;
  updatedAt: string;
}

export async function getAISessions(): Promise<AISession[]> {
  return apiFetch("/chat/ai");
}

export async function getAIMessages(sessionId: string): Promise<AISession> {
  return apiFetch(`/chat/ai?sessionId=${sessionId}`);
}

export async function translateMessage(text: string, to: string = "en"): Promise<string> {
  const data = await apiFetch("/chat/translate", {
    method: "POST",
    body: JSON.stringify({ text, to }),
  });
  return data.translated;
}

export async function summarizeConversation(sessionId: string, locale: string = "ar"): Promise<string> {
  const data = await apiFetch("/chat/summarize", {
    method: "POST",
    body: JSON.stringify({ sessionId, locale }),
  });
  return data.summary;
}

export async function sendAIMessage(
  message: string,
  sessionId?: string,
  locale: string = "ar",
  persona?: string
): Promise<{ reply: string; sessionId: string; sources?: AISource[] }> {
  return apiFetch("/chat/ai", {
    method: "POST",
    body: JSON.stringify({ message, sessionId, locale, persona }),
  });
}

type StreamEvent = {
  delta?: string;
  done?: boolean;
  error?: string;
  sessionId?: string;
  sources?: AISource[];
};

function parseSSE(text: string): StreamEvent[] {
  const events: StreamEvent[] = [];
  for (const block of text.replace(/\r\n/g, "\n").split("\n\n")) {
    const line = block
      .split("\n")
      .filter((part) => part.startsWith("data:"))
      .map((part) => part.slice(5).trimStart())
      .join("\n");
    if (!line || line === "[DONE]") continue;
    try {
      events.push(JSON.parse(line) as StreamEvent);
    } catch {
      // تجاهل الحدث غير القابل للقراءة.
    }
  }
  return events;
}

/**
 * بثّ إجابة الذكاء في الموبايل. إن كانت الإنتاجية لا تدعم ReadableStream
 * نقرأ الجواب دفعة واحدة ونمرّرها للواجهة، فلا يتعطل الشات.
 */
export async function streamAIMessage(
  message: string,
  sessionId: string | undefined,
  locale: string,
  persona: string | undefined,
  onDelta?: (delta: string, accumulated: string) => void
): Promise<{ reply: string; sessionId: string; sources?: AISource[] }> {
  const fallback = async () => {
    const data = await sendAIMessage(message, sessionId, locale, persona);
    onDelta?.(data.reply, data.reply);
    return data;
  };

  try {
    const token = await getToken();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);
    let res: Response;
    try {
      res = await fetch(`${API_URL}/chat/ai/stream`, {
        method: "POST",
        headers,
        body: JSON.stringify({ message, sessionId, locale, persona }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!res.ok) return fallback();

    const body = res.body as { getReader?: () => any } | null;
    if (!body || typeof body.getReader !== "function") {
      const events = parseSSE(await res.text());
      const reply = events.filter((e) => e.delta).map((e) => e.delta).join("");
      if (!reply) return fallback();
      onDelta?.(reply, reply);
      const done = events.find((e) => e.done);
      return {
        reply,
        sessionId: done?.sessionId || sessionId || "",
        sources: done?.sources || [],
      };
    }

    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let reply = "";
    let nextSessionId = sessionId || "";
    let sources: AISource[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parts = buffer.replace(/\r\n/g, "\n").split("\n\n");
      buffer = parts.pop() || "";
      for (const event of parseSSE(parts.join("\n\n") + "\n\n")) {
        if (event.error) throw new Error(event.error);
        if (event.delta) {
          reply += event.delta;
          onDelta?.(event.delta, reply);
        }
        if (event.done) {
          nextSessionId = event.sessionId || nextSessionId;
          sources = event.sources || sources;
        }
      }
    }

    if (!reply) return fallback();
    return { reply, sessionId: nextSessionId, sources };
  } catch {
    return fallback();
  }
}
