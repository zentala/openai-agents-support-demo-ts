/**
 * Loads the Markdown knowledge base from `data/kb/*.md` and splits it into chunks.
 * Each file has `id` and `title` in a small frontmatter block, plus optional `aliases`: how customers
 * phrase the topic in other languages and inflected forms ("zwrot towaru", "Rückgabe"). Aliases feed
 * retrieval only (`searchText`); the article text shown to customers stays as written.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import type { KbArticle } from "@/lib/types";

/** `text` is what the agent reads; `searchText` (title + aliases + text) is what retrieval matches and embeds. */
export type KbChunk = { id: string; title: string; text: string; searchText: string };

const KB_DIR = path.join(process.cwd(), "data", "kb");

export function parseArticle(raw: string): { id: string; title: string; body: string; aliases: string } {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/.exec(raw);
  if (!match) throw new Error("KB article has no frontmatter block (--- id/title ---)");
  const meta = Object.fromEntries(
    match[1].split(/\r?\n/).map((line) => {
      const [key, ...rest] = line.split(":");
      return [key.trim(), rest.join(":").trim()];
    }),
  );
  if (!meta.id || !meta.title) throw new Error("KB article frontmatter needs both id and title");
  return { id: meta.id, title: meta.title, body: match[2].trim(), aliases: meta.aliases ?? "" };
}

/** Splits on blank lines; short articles stay one chunk. */
export const chunkBody = (body: string): string[] =>
  body.split(/\n\s*\n/).map((part) => part.replace(/\s+/g, " ").trim()).filter(Boolean);

let cache: KbChunk[] | undefined;
let articles: ReturnType<typeof parseArticle>[] | undefined;

/** Public policy files only; browser-provided citation IDs never become filesystem paths. */
function readArticles() {
  return articles ??= readdirSync(KB_DIR)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => parseArticle(readFileSync(path.join(KB_DIR, file), "utf8")));
}

/** What the browser may see: id, title, body. Aliases are retrieval-only and stay on the server. */
export function loadKbArticles(): KbArticle[] {
  return readArticles().map(({ id, title, body }) => ({ id, title, body }));
}

export function loadKbChunks(): KbChunk[] {
  if (cache) return cache;
  cache = readArticles()
    .flatMap(({ id, title, body, aliases }) => {
      return chunkBody(body).map((text) => ({ id, title, text, searchText: `${title} ${aliases} ${text}` }));
    });
  return cache;
}
