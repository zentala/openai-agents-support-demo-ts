/**
 * Knowledge-base search: embeddings (cached on disk) + keyword score = hybrid.
 *
 * Concept (OpenAI embeddings): `client.embeddings.create` turns text into a
 * vector; similar meaning = vectors point the same way (cosine similarity).
 * `text-embedding-3-small` is multilingual, which is why a German question finds
 * the English "returns-policy" article.
 *
 * The KB is tiny, so we embed every chunk once and cache the vectors in
 * `.cache/kb-embeddings.json`, keyed by a hash of (model + text). Edit an
 * article and only that chunk is re-embedded.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createEmbeddingClient } from "@/lib/runtime/model-access";
import { EMBEDDING_MODEL } from "@/lib/config";
import type { KbHit } from "@/lib/types";
import { loadKbChunks, type KbChunk } from "./load";
import { cosineSimilarity, hybridScore, keywordScore, MIN_SCORE } from "./scoring";

const CACHE_FILE = path.join(process.cwd(), ".cache", "kb-embeddings.json");
const TOP_K = 3;

type EmbeddingCache = Record<string, number[]>;

const contentHash = (text: string) =>
  createHash("sha256").update(`${EMBEDDING_MODEL}\n${text}`).digest("hex");

function readCache(): EmbeddingCache {
  try {
    return JSON.parse(readFileSync(CACHE_FILE, "utf8")) as EmbeddingCache;
  } catch {
    return {}; // first run: no cache yet
  }
}

/** One API call for many texts: `input` accepts an array and keeps the order. */
async function embed(texts: string[]): Promise<number[][]> {
  const response = await createEmbeddingClient().embeddings.create({ model: EMBEDDING_MODEL, input: texts });
  return response.data.map((item) => item.embedding);
}

async function chunkVectors(chunks: KbChunk[]): Promise<number[][]> {
  const cache = readCache();
  const missing = chunks.filter((chunk) => !cache[contentHash(chunk.text)]);
  if (missing.length > 0) {
    const vectors = await embed(missing.map((chunk) => chunk.text));
    missing.forEach((chunk, i) => (cache[contentHash(chunk.text)] = vectors[i]));
    mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
    writeFileSync(CACHE_FILE, JSON.stringify(cache));
  }
  return chunks.map((chunk) => cache[contentHash(chunk.text)]);
}

const round3 = (n: number) => Math.round(n * 1000) / 1000;

// INTERVIEW: hybrid retrieval (vectors + keywords); the next step is a reranker. No hit above MIN_SCORE means the agent says "I don't know".
export async function searchKb(query: string): Promise<KbHit[]> {
  const chunks = loadKbChunks();
  const [vectors, [queryVector]] = await Promise.all([chunkVectors(chunks), embed([query])]);
  return chunks
    .map((chunk, i) => ({
      id: chunk.id,
      title: chunk.title,
      snippet: chunk.text,
      score: hybridScore(
        cosineSimilarity(queryVector, vectors[i]),
        keywordScore(query, `${chunk.title} ${chunk.text}`),
      ),
    }))
    .filter((hit) => hit.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_K)
    .map((hit) => ({ ...hit, score: round3(hit.score) }));
}
