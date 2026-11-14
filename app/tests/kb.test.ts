import { describe, expect, it } from "vitest";
import { chunkBody, loadKbArticles, loadKbChunks, parseArticle } from "@/lib/kb/load";
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
  it("the source reader keeps full article paragraphs and uses the same titles as retrieval", () => {
    const articles = loadKbArticles();
    const delivery = articles.find((article) => article.id === "delivery-times");
    expect(delivery?.title).toBe("Delivery times");
    expect(delivery?.body).toContain("Delivery inside Poland takes 2-5 business days.");
    expect(delivery?.body).toContain("2-hour delivery window by SMS");
    expect(delivery?.body).toContain("\n");
    expect(new Set(articles.map((article) => article.id)).size).toBe(articles.length);
    for (const chunk of loadKbChunks()) {
      expect(articles.find((article) => article.id === chunk.id)?.title).toBe(chunk.title);
    }
  });

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
