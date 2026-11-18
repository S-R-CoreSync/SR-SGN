// src/lib/ai/embeddings.ts
// Jina AI embeddings (free, 10M tokens, Arabic-friendly, 1024-dim)

import { getEnvVar } from "./provider";

const JINA_API_URL = "https://api.jina.ai/v1/embeddings";
const MODEL = "jina-embeddings-v3";

export async function embedTexts(texts: string[]): Promise<number[][]> {
  const apiKey = getEnvVar("JINA_API_KEY");
  if (!apiKey) throw new Error("JINA_API_KEY is not configured");

  const res = await fetch(JINA_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model: MODEL, input: texts }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Jina embeddings error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.data.map((d: any) => d.embedding);
}

export async function embedText(text: string): Promise<number[]> {
  const [emb] = await embedTexts([text]);
  return emb;
}
