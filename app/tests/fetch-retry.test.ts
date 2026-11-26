/** Start-up calls retry transient proxy failures, then fail with one readable typed error. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { fetchWithRetry, RETRY_DELAYS_MS, serverUnavailableError } from "@/lib/client/fetch-retry";
import { createThread } from "@/lib/client/create-thread";
import { adminResponse } from "@/lib/client/admin-response";
import { isKeyRequiredText } from "@/lib/client/key-required";

beforeEach(() => vi.useFakeTimers());
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const html = (status: number) => new Response("<html>Bad Gateway</html>", { status });

it("retries 502, 503 and a network error, then returns the first good response", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce(html(502)).mockRejectedValueOnce(new TypeError("fetch failed")).mockResolvedValueOnce(html(503))
    .mockResolvedValueOnce(Response.json({ ok: true }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const result = fetchWithRetry("/api/threads");
  await vi.advanceTimersByTimeAsync(RETRY_DELAYS_MS.reduce((a, b) => a + b, 0));
  expect((await result).status).toBe(201);
  expect(fetchMock).toHaveBeenCalledTimes(4);
});

it("throws ServerUnavailable with the last HTTP status after the last try", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => html(504));
  vi.stubGlobal("fetch", fetchMock);
  const result = fetchWithRetry("/api/threads");
  const assertion = expect(result).rejects.toMatchObject({ name: "ServerUnavailable", message: expect.stringContaining("HTTP 504") });
  await vi.advanceTimersByTimeAsync(20_000);
  await assertion;
  expect(fetchMock).toHaveBeenCalledTimes(RETRY_DELAYS_MS.length + 1);
});

it("names no status when the connection itself failed", () => {
  expect(serverUnavailableError({}).message).toBe("The demo server is starting or redeploying. Try again in a minute.");
});

it("returns 4xx and 500 at once, without waiting", async () => {
  for (const status of [400, 429, 500]) {
    const fetchMock = vi.fn().mockResolvedValue(new Response("x", { status }));
    vi.stubGlobal("fetch", fetchMock);
    expect((await fetchWithRetry("/api/threads")).status).toBe(status);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  }
});

it("does not retry an aborted request", async () => {
  const controller = new AbortController();
  controller.abort();
  const fetchMock = vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError"));
  vi.stubGlobal("fetch", fetchMock);
  await expect(fetchWithRetry("/x", { signal: controller.signal })).rejects.toMatchObject({ name: "AbortError" });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("maps a non-JSON proxy 502 on an admin call to ServerUnavailable, not a JSON parse error", async () => {
  await expect(adminResponse(html(502))).rejects.toMatchObject({ name: "ServerUnavailable" });
});

it("passes our own JSON 503 through: no retry, no relabel (fetch, createThread, adminResponse)", async () => {
  const own = () => Response.json({ errorType: "SessionSecretRequired", message: "Set SESSION_SECRET." }, { status: 503 });
  const fetchMock = vi.fn().mockImplementation(async () => own());
  vi.stubGlobal("fetch", fetchMock);
  expect((await fetchWithRetry("/api/threads")).status).toBe(503);
  await expect(createThread("c-anna")).rejects.toMatchObject({ name: "SessionSecretRequired", message: "Set SESSION_SECRET." });
  expect(fetchMock).toHaveBeenCalledTimes(2);
  await expect(adminResponse(own())).rejects.toThrow("SessionSecretRequired: Set SESSION_SECRET.");
});

it("a POST does not retry a 504, which may have reached the origin", async () => {
  const fetchMock = vi.fn().mockImplementation(async () => html(504));
  vi.stubGlobal("fetch", fetchMock);
  await expect(createThread("c-anna")).rejects.toMatchObject({ name: "ServerUnavailable", message: expect.stringContaining("HTTP 504") });
  expect(fetchMock).toHaveBeenCalledTimes(1);
});

it("a POST still retries a proxy 502 and a connection failure", async () => {
  const fetchMock = vi.fn().mockResolvedValueOnce(html(502)).mockRejectedValueOnce(new TypeError("fetch failed"))
    .mockResolvedValueOnce(Response.json({ threadId: "t-1" }, { status: 201 }));
  vi.stubGlobal("fetch", fetchMock);
  const result = createThread("c-anna");
  await vi.advanceTimersByTimeAsync(20_000);
  await expect(result).resolves.toBe("t-1");
});

it("aborting during the backoff wait rejects with AbortError, not ServerUnavailable", async () => {
  const controller = new AbortController();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => html(503)));
  const result = fetchWithRetry("/x", { signal: controller.signal });
  const assertion = expect(result).rejects.toMatchObject({ name: "AbortError" });
  await vi.advanceTimersByTimeAsync(100);
  controller.abort();
  await assertion;
});

it("recognises the missing-key error text in chat sentences and inspector rows", () => {
  expect(isKeyRequiredText("VisitorKeyRequired: Add your OpenAI key above to talk to the assistant")).toBe(true);
  expect(isKeyRequiredText("Sorry, the request failed with RateLimitError: slow down")).toBe(false);
});
