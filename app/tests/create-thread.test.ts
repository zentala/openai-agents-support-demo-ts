/** HTTP failures should display the server sentence, with the type preserved separately. */
import { afterEach, expect, it, vi } from "vitest";
import { createThread } from "@/lib/client/create-thread";

afterEach(() => vi.unstubAllGlobals());
it("shows the full-slot 429 message without a JSON wrapper", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    errorType: "ThreadCapacityError", message: "All conversation slots are busy. Try again later.",
  }, { status: 429 })));
  await expect(createThread("c-anna")).rejects.toMatchObject({
    name: "ThreadCapacityError", message: "All conversation slots are busy. Try again later.",
  });
});
it("keeps an HTTP fallback when a non-transient response has no JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Oops", { status: 500 })));
  await expect(createThread("c-anna")).rejects.toThrow("HTTP 500");
});
it("explains a server that stays unavailable instead of showing a raw HTTP status", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => new Response("<html></html>", { status: 503 })));
  const assertion = expect(createThread("c-anna")).rejects.toMatchObject({
    name: "ServerUnavailable", message: "The demo server is starting or redeploying (HTTP 503). Try again in a minute.",
  });
  await vi.advanceTimersByTimeAsync(20_000);
  await assertion;
  vi.useRealTimers();
});
