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
it("keeps an HTTP fallback when the response has no JSON", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("Unavailable", { status: 503 })));
  await expect(createThread("c-anna")).rejects.toThrow("HTTP 503");
});
