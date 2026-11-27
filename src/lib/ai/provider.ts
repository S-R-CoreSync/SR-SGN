import fs from "fs";
import path from "path";
import { applyGuardrails } from "@/lib/guardrails";
import { logger } from "@/lib/logger";

type AIMessage = { role: "system" | "user" | "assistant"; content: string };

type AIConfig = 
  | { provider: "ollama" } 
  | { provider: "openai"; model: string } 
  | { provider: "anthropic"; model: string }
  | { provider: "gemini"; model: string }
  | { provider: "groq"; model: string }
  | { provider: "deepseek"; model: string }
  | { provider: "github"; model: string }
  | { provider: "cerebras"; model: string }
  | { provider: "siliconflow"; model: string }
  | { provider: "omniroute"; model: string };

export function getEnvVar(key: string): string | undefined {
  if (process.env[key]) return process.env[key];
  try {
    const envPath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf-8");
      const match = content.match(new RegExp(`^${key}\\s*=\\s*["']?([^"'\r\n]+)["']?`, "m"));
      if (match) return match[1];
    }
  } catch (e) {
    logger.error("AI", "Error reading .env directly:", e);
  }
  return undefined;
}

function getConfig(overrideProvider?: string): AIConfig {
  // SYNC_TRANSLATE_PROVIDER يسمح باختيار مزوّد للترجمة فقط، دون تغيير مزوّد
  // الشات/RAG — حصة مزوّد الترجمة كانت تُنفد يومياً بينما الباقي يعمل.
  const configured = overrideProvider || getEnvVar("AI_PROVIDER") || "auto";

  if (configured === "ollama") return { provider: "ollama" };
  if (configured === "openai") return { provider: "openai", model: getEnvVar("OPENAI_MODEL") || "gpt-4o-mini" };
  if (configured === "anthropic") return { provider: "anthropic", model: getEnvVar("ANTHROPIC_MODEL") || "claude-3-5-sonnet-20240620" };
  if (configured === "gemini") return { provider: "gemini", model: getEnvVar("GEMINI_MODEL") || "gemini-2.5-flash" };
  if (configured === "groq") return { provider: "groq", model: getEnvVar("GROQ_MODEL") || "qwen/qwen3.8-27b" };
  if (configured === "deepseek") return { provider: "deepseek", model: getEnvVar("DEEPSEEK_MODEL") || "deepseek-chat" };
  if (configured === "github") return { provider: "github", model: getEnvVar("GITHUB_MODEL") || "gpt-4o" };
  if (configured === "cerebras") return { provider: "cerebras", model: getEnvVar("CEREBRAS_MODEL") || "llama3.1-70b" };
  if (configured === "siliconflow") return { provider: "siliconflow", model: getEnvVar("SILICONFLOW_MODEL") || "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B" };
  if (configured === "omniroute") return { provider: "omniroute", model: getEnvVar("OMNIROUTE_MODEL") || "auto/best-free" };

  const geminiKey = getEnvVar("GEMINI_API_KEY");
  if (geminiKey && (geminiKey.startsWith("AIzaSy") || geminiKey.startsWith("AQ."))) {
    return { provider: "gemini", model: getEnvVar("GEMINI_MODEL") || "gemini-2.5-flash" };
  }
  if (getEnvVar("OPENAI_API_KEY")) {
    return { provider: "openai", model: getEnvVar("OPENAI_MODEL") || "gpt-4o-mini" };
  }
  const anthropicKey = getEnvVar("ANTHROPIC_API_KEY") || getEnvVar("ANTHROPIC_BASE_URL");
  if (anthropicKey) {
    return { provider: "anthropic", model: getEnvVar("ANTHROPIC_MODEL") || "claude-3-5-sonnet-20240620" };
  }
  if (getEnvVar("GROQ_API_KEY")) {
    return { provider: "groq", model: getEnvVar("GROQ_MODEL") || "llama-3.3-70b-versatile" };
  }
  if (getEnvVar("DEEPSEEK_API_KEY")) {
    return { provider: "deepseek", model: getEnvVar("DEEPSEEK_MODEL") || "deepseek-chat" };
  }
  if (getEnvVar("GITHUB_TOKEN")) {
    return { provider: "github", model: getEnvVar("GITHUB_MODEL") || "gpt-4o" };
  }
  if (getEnvVar("CEREBRAS_API_KEY")) {
    return { provider: "cerebras", model: getEnvVar("CEREBRAS_MODEL") || "llama3.1-70b" };
  }
  if (getEnvVar("SILICONFLOW_API_KEY")) {
    return { provider: "siliconflow", model: getEnvVar("SILICONFLOW_MODEL") || "deepseek-ai/DeepSeek-R1-Distill-Qwen-7B" };
  }

  if (getEnvVar("OMNIROUTE_API_KEY") || getEnvVar("OMNIROUTE_BASE_URL") || getEnvVar("OMNIROUTE_MODEL")) {
    return { provider: "omniroute", model: getEnvVar("OMNIROUTE_MODEL") || "auto/best-free" };
  }

  return { provider: "ollama" };
}

export async function generateText(
  content: string,
  systemPrompt?: string,
  options?: { model?: string; responseFormat?: "text" | "json"; provider?: string }
): Promise<string> {
  return generateChat(
    [{ role: "user", content }],
    systemPrompt,
    options,
  );
}

export async function generateChat(
  messages: AIMessage[],
  systemPrompt?: string,
  options?: { model?: string; responseFormat?: "text" | "json"; provider?: string }
): Promise<string> {
  const config = getConfig(options?.provider);

  const guarded = applyGuardrails({ messages, systemPrompt });
  if (guarded.blocked) {
    throw new Error(guarded.reason || "Request blocked by guardrails");
  }
  messages = guarded.messages as AIMessage[];
  systemPrompt = guarded.systemPrompt;

  if (config.provider === "groq") {
    const apiKey = getEnvVar("GROQ_API_KEY");
    if (!apiKey) throw new Error("GROQ_API_KEY is required for Groq provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Groq error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "deepseek") {
    const apiKey = getEnvVar("DEEPSEEK_API_KEY");
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY is required for DeepSeek provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`DeepSeek error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "github") {
    const apiKey = getEnvVar("GITHUB_TOKEN");
    if (!apiKey) throw new Error("GITHUB_TOKEN is required for GitHub provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const res = await fetch("https://models.github.ai/inference/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`GitHub Models error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "cerebras") {
    const apiKey = getEnvVar("CEREBRAS_API_KEY");
    if (!apiKey) throw new Error("CEREBRAS_API_KEY is required for Cerebras provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Cerebras error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "siliconflow") {
    const apiKey = getEnvVar("SILICONFLOW_API_KEY");
    if (!apiKey) throw new Error("SILICONFLOW_API_KEY is required for SiliconFlow provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const res = await fetch("https://api.siliconflow.cn/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`SiliconFlow error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "omniroute") {
    const baseUrl = (getEnvVar("OMNIROUTE_BASE_URL") || "http://localhost:20128/v1").replace(/\/$/, "");
    const apiKey = getEnvVar("OMNIROUTE_API_KEY");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`OmniRoute error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "openai") {
    const apiKey = getEnvVar("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OPENAI_API_KEY is required for OpenAI provider");

    const msgs: any[] = [];
    if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
    msgs.push(...messages);

    const baseUrl = getEnvVar("OPENAI_BASE_URL") || "https://api.openai.com/v1";
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages: msgs,
        ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`OpenAI error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.choices[0]?.message?.content || "";
  }

  if (config.provider === "anthropic") {
    const apiKey = getEnvVar("ANTHROPIC_API_KEY");
    const baseUrl = getEnvVar("ANTHROPIC_BASE_URL") || "https://api.anthropic.com/v1/messages";
    const customHeadersRaw = getEnvVar("ANTHROPIC_CUSTOM_HEADERS") || "";

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
    };

    if (apiKey) headers["x-api-key"] = apiKey;

    if (customHeadersRaw) {
      const parts = customHeadersRaw.split(":");
      if (parts.length >= 2) {
        headers[parts[0].trim()] = parts.slice(1).join(":").trim();
      }
    }

    const system = systemPrompt || "";
    const body = {
      model: options?.model || config.model,
      max_tokens: 1024,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      ...(system ? { system } : {}),
    };

    const res = await fetch(baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Anthropic error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.content[0]?.text || "";
  }

  if (config.provider === "gemini") {
    const apiKey = getEnvVar("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY is required for Gemini provider");

    const contents = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const body: any = {
      contents,
      ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      generationConfig: {
        ...(options?.responseFormat === "json" ? { responseMimeType: "application/json" } : {}),
      },
    };

    const modelName = options?.model || config.model;
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      throw new Error(`Gemini error ${res.status}: ${err}`);
    }

    const data = await res.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  const { ollamaGenerate } = await import("./ollama");
  const text = messages.map((m) => `[${m.role}]\n${m.content}`).join("\n\n");
  return ollamaGenerate(
    [{ text }],
    systemPrompt,
    options?.responseFormat === "json" ? "application/json" : undefined,
    options?.model,
  );
}

/* -------------------------------------------------------------------------- */
/* Streaming (SSE for OpenAI-compatible providers, NDJSON for Ollama)          */
/* -------------------------------------------------------------------------- */

type StreamOptions = {
  model?: string;
  responseFormat?: "text" | "json";
  provider?: string;
};

type OpenAICompatibleTarget = {
  label: string;
  url: string;
  model: string;
  apiKey?: string;
  missingKeyError?: string;
};

function getOpenAICompatibleTarget(config: AIConfig): OpenAICompatibleTarget | null {
  switch (config.provider) {
    case "groq":
      return {
        label: "Groq",
        url: "https://api.groq.com/openai/v1/chat/completions",
        model: config.model,
        apiKey: getEnvVar("GROQ_API_KEY"),
        missingKeyError: "GROQ_API_KEY is required for Groq provider",
      };
    case "openai": {
      const baseUrl = getEnvVar("OPENAI_BASE_URL") || "https://api.openai.com/v1";
      return {
        label: "OpenAI",
        url: `${baseUrl.replace(/\/$/, "")}/chat/completions`,
        model: config.model,
        apiKey: getEnvVar("OPENAI_API_KEY"),
        missingKeyError: "OPENAI_API_KEY is required for OpenAI provider",
      };
    }
    case "deepseek":
      return {
        label: "DeepSeek",
        url: "https://api.deepseek.com/v1/chat/completions",
        model: config.model,
        apiKey: getEnvVar("DEEPSEEK_API_KEY"),
        missingKeyError: "DEEPSEEK_API_KEY is required for DeepSeek provider",
      };
    case "github":
      return {
        label: "GitHub Models",
        url: "https://models.github.ai/inference/chat/completions",
        model: config.model,
        apiKey: getEnvVar("GITHUB_TOKEN"),
        missingKeyError: "GITHUB_TOKEN is required for GitHub provider",
      };
    case "cerebras":
      return {
        label: "Cerebras",
        url: "https://api.cerebras.ai/v1/chat/completions",
        model: config.model,
        apiKey: getEnvVar("CEREBRAS_API_KEY"),
        missingKeyError: "CEREBRAS_API_KEY is required for Cerebras provider",
      };
    case "siliconflow":
      return {
        label: "SiliconFlow",
        url: "https://api.siliconflow.cn/v1/chat/completions",
        model: config.model,
        apiKey: getEnvVar("SILICONFLOW_API_KEY"),
        missingKeyError: "SILICONFLOW_API_KEY is required for SiliconFlow provider",
      };
    case "omniroute": {
      const baseUrl = (getEnvVar("OMNIROUTE_BASE_URL") || "http://localhost:20128/v1").replace(/\/$/, "");
      // OmniRoute may run locally without a key (same as generateChat).
      return { label: "OmniRoute", url: `${baseUrl}/chat/completions`, model: config.model, apiKey: getEnvVar("OMNIROUTE_API_KEY") };
    }
    default:
      // anthropic, gemini and ollama don't use this OpenAI-compatible path.
      return null;
  }
}

/** Splits an HTTP stream into lines, including a final line without newline. */
async function* readStreamLines(res: Response): AsyncGenerator<string> {
  if (!res.body) throw new Error("Streaming response has no body");
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let newline = buffer.indexOf("\n");
      while (newline !== -1) {
        const line = buffer.slice(0, newline).trim();
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
        if (line) yield line;
      }
    }
    const tail = buffer.trim();
    if (tail) yield tail;
  } finally {
    reader.releaseLock();
  }
}

async function* streamOpenAICompatible(
  target: OpenAICompatibleTarget,
  messages: AIMessage[],
  systemPrompt: string | undefined,
  options?: StreamOptions
): AsyncGenerator<string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (target.apiKey) headers["Authorization"] = `Bearer ${target.apiKey}`;

  const msgs: any[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  msgs.push(...messages);

  const res = await fetch(target.url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: options?.model || target.model,
      messages: msgs,
      stream: true,
      ...(options?.responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${target.label} stream error ${res.status}: ${err.slice(0, 300)}`);
  }

  for await (const line of readStreamLines(res)) {
    if (!line.startsWith("data:")) continue;
    const payload = line.slice(5).trim();
    if (payload === "[DONE]") return;
    if (!payload) continue;
    let parsed: any;
    try {
      parsed = JSON.parse(payload);
    } catch {
      continue;
    }
    const delta = parsed?.choices?.[0]?.delta?.content;
    if (typeof delta === "string" && delta) yield delta;
  }
}

async function* streamOllamaChat(
  messages: AIMessage[],
  systemPrompt: string | undefined,
  options?: StreamOptions
): AsyncGenerator<string> {
  const baseUrl = (getEnvVar("OLLAMA_HOST") || "http://localhost:11434").replace(/\/$/, "");
  const model = options?.model || getEnvVar("OLLAMA_MODEL") || "qwen2.5:7b";

  const text = messages.map((m) => `[${m.role}]\n${m.content}`).join("\n\n");
  const userMsg: Record<string, unknown> = { role: "user", content: text };
  const msgs: Record<string, unknown>[] = [];
  if (systemPrompt) msgs.push({ role: "system", content: systemPrompt });
  msgs.push(userMsg);

  const body: Record<string, unknown> = { model, messages: msgs, stream: true };
  if (options?.responseFormat === "json") body.format = "json";

  const res = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Ollama stream error ${res.status}: ${err.slice(0, 300)}`);
  }

  for await (const line of readStreamLines(res)) {
    let parsed: any;
    try {
      parsed = JSON.parse(line);
    } catch {
      continue;
    }
    const delta = parsed?.message?.content;
    if (typeof delta === "string" && delta) yield delta;
    if (parsed?.done === true) return;
  }
}

/** Non-streaming fallback, chopped into a few deltas for the SSE client. */
async function* yieldFallbackInChunks(
  messages: AIMessage[],
  systemPrompt: string | undefined,
  options?: StreamOptions
): AsyncGenerator<string> {
  const text = await generateChat(messages, systemPrompt, options);
  if (!text) return;
  const chars = Array.from(text);
  const chunkSize = 120;
  for (let i = 0; i < chars.length; i += chunkSize) {
    yield chars.slice(i, i + chunkSize).join("");
  }
}

/**
 * Yields text deltas as they arrive from the AI provider.
 * Same config/guardrails as generateChat; unsupported providers (anthropic,
 * gemini) or a failed stream fall back to generateChat in chunks, so callers
 * never have to special-case a provider.
 */
export async function* generateChatStream(
  messages: AIMessage[],
  systemPrompt?: string,
  options?: StreamOptions
): AsyncGenerator<string> {
  const config = getConfig(options?.provider);
  const guarded = applyGuardrails({ messages, systemPrompt });
  if (guarded.blocked) {
    throw new Error(guarded.reason || "Request blocked by guardrails");
  }
  const safeMessages = guarded.messages as AIMessage[];
  const safeSystemPrompt = guarded.systemPrompt;

  let yielded = false;
  try {
    const target = getOpenAICompatibleTarget(config);
    if (target) {
      if (target.missingKeyError && !target.apiKey) {
        throw new Error(target.missingKeyError);
      }
      for await (const delta of streamOpenAICompatible(target, safeMessages, safeSystemPrompt, options)) {
        yielded = true;
        yield delta;
      }
      return;
    }

    if (config.provider === "ollama") {
      for await (const delta of streamOllamaChat(safeMessages, safeSystemPrompt, options)) {
        yielded = true;
        yield delta;
      }
      return;
    }
  } catch (err) {
    // If deltas were already sent we can't restart cleanly; let the route
    // report the error instead of duplicating the beginning of the answer.
    if (yielded) throw err;
    logger.warn("AI", "Streaming failed; falling back to non-streaming generation:", err instanceof Error ? err.name : "unknown error");
  }

  // anthropic / gemini (and any provider that couldn't stream) still work.
  yield* yieldFallbackInChunks(safeMessages, safeSystemPrompt, options);
}