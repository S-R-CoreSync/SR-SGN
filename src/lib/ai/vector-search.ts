// src/lib/ai/vector-search.ts
// Qdrant vector search (free, 1M vectors)

import { QdrantClient } from "@qdrant/js-client-rest";
import { getEnvVar } from "./provider";
import { createHash } from "crypto";

const COLLECTION = "sgn_news";
const VECTOR_SIZE = 1024;

let client: QdrantClient | null = null;

function getClient(): QdrantClient {
  if (client) return client;
  const url = getEnvVar("QDRANT_URL");
  const apiKey = getEnvVar("QDRANT_API_KEY");
  if (!url || !apiKey) throw new Error("QDRANT_URL / QDRANT_API_KEY not configured");
  client = new QdrantClient({ url, apiKey });
  return client;
}

// Qdrant requires point IDs to be unsigned integers or UUIDs.
// Our DB IDs are CUIDs, so we hash them into deterministic UUIDs.
export function toQdrantId(id: string): string {
  const hex = createHash("sha256").update(id).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export async function ensureCollection(): Promise<void> {
  const c = getClient();
  try {
    await c.getCollection(COLLECTION);
  } catch {
    await c.createCollection(COLLECTION, {
      vectors: { size: VECTOR_SIZE, distance: "Cosine" },
    });
  }
}

export interface VectorHit {
  id: string;
  score: number;
  payload: Record<string, any>;
}

export async function upsertPoints(
  points: { id: string; vector: number[]; payload: Record<string, any> }[]
): Promise<void> {
  const c = getClient();
  await ensureCollection();
  await c.upsert(COLLECTION, {
    wait: true,
    points: points.map((p) => ({
      id: toQdrantId(p.id),
      vector: p.vector,
      payload: { ...p.payload, originalId: p.id },
    })),
  });
}

export async function searchVectors(
  vector: number[],
  limit = 5,
  filter?: Record<string, any>
): Promise<VectorHit[]> {
  const c = getClient();
  try {
    await c.getCollection(COLLECTION);
  } catch {
    return [];
  }
  const res = await c.query(COLLECTION, {
    query: vector,
    limit,
    with_payload: true,
    filter,
  });
  return (res.points || []).map((r: any) => ({
    id: String(r.payload?.originalId || r.id),
    score: r.score,
    payload: (r.payload as Record<string, any>) || {},
  }));
}
