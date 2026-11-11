/** Public-demo regressions exercise real SDK clients with an offline HTTP stub and real turn boundaries. */
import { Agent } from "@openai/agents";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createEmbeddingClient, createRequestRunner } from "@/lib/runtime/model-access";
import { withRequestKey, requestApiKey } from "@/lib/security/request-key";
import { publicRateLimit } from "@/lib/security/public-rate-limit";
import { handleUserMessage } from "@/lib/runtime/turn";
import { clearEventLog, emitAgentEvent, readEventLog } from "@/lib/runtime/event-bus";
import { addTranscript, createThread } from "@/lib/runtime/threads";
import { describeError } from "@/lib/runtime/errors";

// These are synthetic test markers, never credentials.
const first = "sk-" + "synthetic-first-visitor";
const second = "sk-" + "synthetic-second-visitor";
const request = (key?: string) => new Request("https://demo.example/api/chat", { headers: key ? { "x-openai-key": key } : {} });
beforeEach(() => { vi.stubEnv("PUBLIC_DEMO", "true"); clearEventLog(); });
afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it("requires the visitor header even when the owner has a configured key", () => {
  vi.stubEnv("OPENAI_API_KEY", first);
  expect(() => withRequestKey(request(), () => createRequestRunner())).toThrow("Add your OpenAI key");
  expect(() => withRequestKey(request(), () => createEmbeddingClient())).toThrow("Add your OpenAI key");
});

it("isolates concurrent model and embedding clients and disables tracing", async () => {
  const seen: string[] = [];
  vi.stubGlobal("fetch", vi.fn(async (_url: unknown, init?: RequestInit) => {
    seen.push(new Headers(init?.headers).get("authorization") ?? "");
    return Response.json({ error: { message: "Rejected synthetic test credential", type: "invalid_api_key" } }, { status: 401 });
  }));
  const runners = await Promise.all([first, second].map((key) => withRequestKey(request(key), async () => {
    await Promise.resolve();
    const runner = createRequestRunner();
    expect(runner.config.tracingDisabled).toBe(true);
    await expect(runner.run(new Agent({ name: "offline", model: "gpt-4.1", instructions: "Test" }), "hello")).rejects.toThrow();
    await expect(createEmbeddingClient().embeddings.create({ model: "text-embedding-3-small", input: "test" })).rejects.toThrow();
    expect(requestApiKey()).toBe(key);
    return runner;
  })));
  expect(runners[0].config.modelProvider).not.toBe(runners[1].config.modelProvider);
  expect(seen.filter((value) => value === `Bearer ${first}`)).toHaveLength(2);
  expect(seen.filter((value) => value === `Bearer ${second}`)).toHaveLength(2);
});

it("redacts events, transcripts, logs and all error fields before publication", () => {
  const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  withRequestKey(request(first), () => {
    const thread = createThread("c-anna");
    emitAgentEvent(thread.threadId, { kind: "error", errorType: first, message: first, where: first });
    addTranscript(thread, { role: "customer", text: first, author: first });
    const error = Object.assign(new Error(first), { name: first, code: first });
    const safe = JSON.stringify([readEventLog(), thread.transcript, describeError(error), consoleSpy.mock.calls]);
    expect(safe.includes(first)).toBe(false);
    expect(describeError(Object.assign(error, { status: 401 })).chatSentence).toBe("OpenAI rejected the key: 401");
  });
});

it("lets a deterministic starter work without a key and reports missing keys in chat and inspector", async () => {
  const makeContext = () => ({ customerId: "c-anna", customerName: "Anna", language: "en", threadId: createThread("c-anna").threadId });
  const free = await withRequestKey(request(), () => handleUserMessage(makeContext(), "I want to speak to a human"));
  expect(free.failed).toBeUndefined();
  const missing = await withRequestKey(request(), () => handleUserMessage(makeContext(), "Where is my order?"));
  expect(missing.reply).toContain("Add your OpenAI key");
  expect(readEventLog().some(({ event }) => event.kind === "error" && event.message === "Add your OpenAI key")).toBe(true);
});

it("keeps explicit error types when a production bundle minifies constructor names", () => {
  class s extends Error { name = "VisitorKeyRequired"; }
  expect(describeError(new s("Add your OpenAI key")).errorType).toBe("VisitorKeyRequired");
});

it("limits each thread and IP, expires buckets, and throttles uploads", () => {
  vi.spyOn(Date, "now").mockReturnValue(100_000);
  const req = new Request("https://demo.example", { headers: { "x-forwarded-for": "192.0.2.123" } });
  for (let i = 0; i < 10; i++) expect(publicRateLimit(req, "chat", "limited-thread")).toBeUndefined();
  expect(publicRateLimit(req, "chat", "limited-thread")?.status).toBe(429);
  for (let i = 0; i < 20; i++) expect(publicRateLimit(req, "chat", `other-${i}`)).toBeUndefined();
  expect(publicRateLimit(req, "chat", "another-thread")?.status).toBe(429);
  for (let i = 0; i < 5; i++) expect(publicRateLimit(req, "photo", "photo-thread")).toBeUndefined();
  expect(publicRateLimit(req, "photo", "photo-thread")?.headers.get("Retry-After")).toBe("60");
  vi.mocked(Date.now).mockReturnValue(160_001);
  expect(publicRateLimit(req, "chat", "limited-thread")).toBeUndefined();
});
