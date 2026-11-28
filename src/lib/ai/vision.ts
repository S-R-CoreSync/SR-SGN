import { getEnvVar } from "./provider";
import { ollamaGenerate } from "./ollama";
import { logger } from "@/lib/logger";

/**
 * قراءة صورة مستند عبر مزوّد مستضاف، مع بقاء Ollama كبديل محلي.
 * الأسرار تُقرأ من متغيرات البيئة فقط — لا قيم افتراضية داخل الكود.
 * يُجرَّب كل مزوّد على حدة، فإذا فشل واحد تابع التالي بدل إيقاف العملية.
 */

export type VisionPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function anthropicHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  const key = getEnvVar("ANTHROPIC_API_KEY");
  if (key) headers["x-api-key"] = key;
  const raw = getEnvVar("ANTHROPIC_CUSTOM_HEADERS") || "";
  const parts = raw.split(":");
  if (parts.length >= 2) headers[parts[0].trim()] = parts.slice(1).join(":").trim();
  return headers;
}

async function readJson(res: Response, pick: (data: any) => string | undefined): Promise<string> {
  if (!res.ok) throw new Error(`http_${res.status}`);
  const data = await res.json();
  const text = pick(data);
  if (!text) throw new Error("empty_response");
  return text;
}

async function tryOpenAI(text: string, mimeType: string, data: string): Promise<string> {
  const key = getEnvVar("OPENAI_API_KEY");
  if (!key) throw new Error("not_configured");
  const base = getEnvVar("OPENAI_BASE_URL") || "https://api.openai.com/v1";
  const model = getEnvVar("OPENAI_VISION_MODEL") || getEnvVar("OPENAI_MODEL") || "gpt-4o-mini";
  const res = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text },
            { type: "image_url", image_url: { url: `data:${mimeType};base64,${data}` } },
          ],
        },
      ],
      response_format: { type: "json_object" },
      max_tokens: 1024,
    }),
  });
  return readJson(res, (body) => body?.choices?.[0]?.message?.content);
}

async function tryGemini(text: string, mimeType: string, data: string, systemPrompt: string): Promise<string> {
  const key = getEnvVar("GEMINI_API_KEY");
  if (!key) throw new Error("not_configured");
  const model = getEnvVar("GEMINI_VISION_MODEL") || getEnvVar("GEMINI_MODEL") || "gemini-2.5-flash";
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text }, { inline_data: { mime_type: mimeType, data } }] }],
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        generationConfig: { responseMimeType: "application/json" },
      }),
    },
  );
  return readJson(res, (body) => body?.candidates?.[0]?.content?.parts?.[0]?.text);
}

async function tryAnthropic(text: string, mimeType: string, data: string, systemPrompt: string): Promise<string> {
  const base = getEnvVar("ANTHROPIC_BASE_URL");
  if (!getEnvVar("ANTHROPIC_API_KEY") && !base) throw new Error("not_configured");
  const url = base || "https://api.anthropic.com/v1/messages";
  const model = getEnvVar("ANTHROPIC_VISION_MODEL") || getEnvVar("ANTHROPIC_MODEL") || "claude-3-5-sonnet-20240620";
  const res = await fetch(url, {
    method: "POST",
    headers: anthropicHeaders(),
    body: JSON.stringify({
      model,
      max_tokens: 1024,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mimeType, data } },
            { type: "text", text },
          ],
        },
      ],
    }),
  });
  return readJson(res, (body) => body?.content?.[0]?.text);
}

/** يُرجع نص JSON من مزوّد رؤية متاح. يرمي استثناءً فقط إذا فشل الجميع. */
export async function generateVisionJson(
  parts: VisionPart[],
  systemPrompt?: string,
): Promise<string> {
  const text = parts.filter((part): part is { text: string } => "text" in part).map((part) => part.text).join("\n");
  const image = parts.find((part): part is { inlineData: { mimeType: string; data: string } } => "inlineData" in part);
  if (!image) throw new Error("image_required");
  const { mimeType, data } = image.inlineData;

  const attempts: [string, () => Promise<string>][] = [
    ["openai", () => tryOpenAI(text, mimeType, data)],
    ["gemini", () => tryGemini(text, mimeType, data, systemPrompt || "")],
    ["anthropic", () => tryAnthropic(text, mimeType, data, systemPrompt || "")],
    ["ollama", () => ollamaGenerate(parts, systemPrompt, "application/json")],
  ];

  for (const [name, run] of attempts) {
    try {
      return await run();
    } catch (error) {
      logger.warn("AI/vision", `${name} vision attempt failed`, error instanceof Error ? error.message : "unknown");
    }
  }
  throw new Error("no_vision_provider_available");
}
