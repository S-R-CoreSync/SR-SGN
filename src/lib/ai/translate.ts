// src/lib/ai/translate.ts
// Translation & summarization via Groq (free, 30 RPM) — Llama 3.3 70B / Qwen

import { getEnvVar } from "./provider";

export async function translateText(text: string, targetLang: "en" | "nl"): Promise<string> {
  const apiKey = getEnvVar("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const langName = targetLang === "en" ? "English" : "Dutch";
  const prompt = `Translate the following Arabic text to ${langName}. Return ONLY the translation, no explanations, no markdown. Preserve numbers, names, and formatting.\n\nArabic text:\n${text}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEnvVar("GROQ_MODEL") || "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.2,
      max_tokens: 512,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq translate error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() || text;
}

export async function summarizeText(text: string, locale: "ar" | "en" | "nl" = "ar"): Promise<string> {
  const apiKey = getEnvVar("GROQ_API_KEY");
  if (!apiKey) throw new Error("GROQ_API_KEY is not configured");

  const langName = locale === "ar" ? "Arabic" : locale === "nl" ? "Dutch" : "English";
  const prompt = `Summarize the following text in 2-3 sentences in ${langName}. Return ONLY the summary.\n\nText:\n${text}`;

  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: getEnvVar("GROQ_MODEL") || "qwen/qwen3.8-27b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 256,
    }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Groq summarize error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.choices[0]?.message?.content?.trim() || "";
}
