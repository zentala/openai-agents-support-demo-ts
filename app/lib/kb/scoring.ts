/**
 * Hybrid retrieval scoring as PURE functions (no network).
 *
 * Concept (RAG): vectors understand meaning and other languages ("Rückgabe" ~
 * "return"); keywords are exact and good for ids and product names. Mixing
 * both ("hybrid search") is the usual production answer.
 */

/** Weight of the embedding similarity in the final score; keywords get the rest. */
export const VECTOR_WEIGHT = 0.8;

/** Hits scoring below this are dropped so the agent can honestly say "I don't know". */
export const MIN_SCORE = 0.2;

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return normA === 0 || normB === 0 ? 0 : dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export const tokenize = (text: string): string[] =>
  text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length > 2);

/** Share of query words found in the document (0..1). */
export function keywordScore(query: string, document: string): number {
  const queryWords = new Set(tokenize(query));
  if (queryWords.size === 0) return 0;
  const documentWords = new Set(tokenize(document));
  let found = 0;
  for (const word of queryWords) if (documentWords.has(word)) found++;
  return found / queryWords.size;
}

export const hybridScore = (vector: number, keyword: number): number =>
  VECTOR_WEIGHT * vector + (1 - VECTOR_WEIGHT) * keyword;
