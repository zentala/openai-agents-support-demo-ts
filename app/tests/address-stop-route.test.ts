/** Stop through the real chat route: an aborted request leaves no pending address draft behind. Only the model run is replaced. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as chatPost } from "@/app/api/chat/route";
import { clearEventLog, readEventLog } from "@/lib/runtime/event-bus";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));

let thread: Thread;
beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "false");
  vi.stubEnv("SESSION_SECRET", "synthetic-stop-route-test-secret");
  clearEventLog();
  thread = createThread("c-james");
});
afterEach(() => { removeThread(thread.threadId); vi.unstubAllEnvs(); });

async function chat(signal: AbortSignal) {
  const response = await chatPost(new Request("https://demo.example/api/chat", {
    method: "POST", signal,
    headers: { "Content-Type": "application/json", cookie: credentialSetCookie(thread.threadId, false).split(";")[0] },
    body: JSON.stringify({ threadId: thread.threadId, messages: [{ role: "user", parts: [{ type: "text", text: "Change the address of order 1004" }] }] }),
  }));
  await response.text();
}

describe("Stop on the chat request", () => {
  it("clears a draft that the stopped run left on the thread", async () => {
    const stop = new AbortController();
    model.run.mockImplementation(async () => {
      thread.memory.addressDraft = { orderId: "1004" };
      stop.abort();
      return { reply: "Which street?", approvals: [] };
    });

    await chat(stop.signal);

    expect(thread.memory.addressDraft).toBeUndefined();
    expect(readEventLog().some(({ event }) => event.kind === "slots" && event.outcome === "Stopped by the customer")).toBe(true);
  });

  it("keeps the draft when the request ran to the end", async () => {
    model.run.mockImplementation(async () => {
      thread.memory.addressDraft = { orderId: "1004" };
      return { reply: "Which street?", approvals: [] };
    });

    await chat(new AbortController().signal);

    expect(thread.memory.addressDraft).toEqual({ orderId: "1004" });
  });
});
