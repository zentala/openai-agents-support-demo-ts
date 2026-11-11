import { describe, expect, it } from "vitest";
import { chunkBody, loadKbChunks, parseArticle } from "@/lib/kb/load";
import { cosineSimilarity, hybridScore, keywordScore, MIN_SCORE, VECTOR_WEIGHT } from "@/lib/kb/scoring";

describe("scoring", () => {
  it("cosine similarity: same direction 1, orthogonal 0, zero vector 0", () => {
    expect(cosineSimilarity([1, 2], [2, 4])).toBeCloseTo(1);
    expect(cosineSimilarity([1, 0], [0, 1])).toBe(0);
    expect(cosineSimilarity([0, 0], [1, 1])).toBe(0);
  });

  it("keyword score is the share of query words found", () => {
    expect(keywordScore("return window days", "The return window is 30 days")).toBe(1);
    expect(keywordScore("return sofa", "return policy")).toBeCloseTo(0.5);
    expect(keywordScore("", "anything")).toBe(0);
  });

  it("hybrid score weights the vector part and lets keywords break ties", () => {
    expect(hybridScore(1, 0)).toBeCloseTo(VECTOR_WEIGHT);
    expect(hybridScore(0.5, 1)).toBeGreaterThan(hybridScore(0.5, 0));
    expect(MIN_SCORE).toBeGreaterThan(0);
  });
});

describe("knowledge base files", () => {
  it("parses frontmatter and rejects an article without it", () => {
    expect(parseArticle("---\nid: a\ntitle: A title\n---\nBody text")).toEqual({ id: "a", title: "A title", body: "Body text" });
    expect(() => parseArticle("no frontmatter")).toThrow();
  });

  it("splits long bodies on blank lines", () => {
    expect(chunkBody("one\n\ntwo\n\n\nthree")).toEqual(["one", "two", "three"]);
  });

  it("loads 6-8 articles including returns-policy, and none about Iceland", () => {
    const chunks = loadKbChunks();
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBeGreaterThanOrEqual(6);
    expect(ids.size).toBeLessThanOrEqual(8);
    expect(ids.has("returns-policy")).toBe(true);
    expect(chunks.some((c) => /iceland/i.test(c.text))).toBe(false);
  });
});
