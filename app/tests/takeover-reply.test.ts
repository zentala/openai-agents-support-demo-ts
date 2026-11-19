/**
 * Combined consultant action uses real HTTP validation, ownership rules, history and customer events.
 * Invalid drafts and another consultant's ownership must fail before any takeover or message.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/actions/route";
import { MAX_INPUT_LENGTH } from "@/lib/config";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import { createThread, type Thread } from "@/lib/runtime/threads";
import { consultantReply, takeOver, takeOverAndReply } from "@/lib/runtime/takeover";
import type { AgentEvent } from "@/lib/types";

let thread: Thread;
let events: AgentEvent[];
let stop: () => void;
const send = (text: string, consultant = "Marta Nowak", threadId = thread.threadId) => POST(new Request("https://demo.example/api/admin/actions", {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ type: "take_over_and_reply", consultant, threadId, text }),
}));

beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "false");
  clearEventLog();
  thread = createThread("c-anna");
  events = [];
  stop = subscribeToThread(thread.threadId, (event) => events.push(event));
});
afterEach(() => { stop(); vi.unstubAllEnvs(); });

describe("take over and reply", () => {
  it("one action takes over and delivers the trimmed reply to the same customer's transcript and channel", async () => {
    const response = await send("  Hello, I can help with your order.  ");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(thread.takeover).toMatchObject({ status: "human", consultant: "Marta Nowak" });
    expect(thread.transcript.map((entry) => entry.role)).toEqual(["system", "consultant"]);
    expect(thread.transcript.at(-1)).toMatchObject({ text: "Hello, I can help with your order.", author: "Marta Nowak" });
    expect(JSON.stringify(thread.history)).toContain("Hello, I can help with your order.");
    expect(events.filter((event) => event.kind === "chat_message").map((event) => event.kind === "chat_message" && event.role))
      .toEqual(["system", "consultant"]);
  });

  it("an owner can send another reply without another join notice", async () => {
    await send("First reply");
    await send("Second reply");
    expect(thread.transcript.map((entry) => entry.role)).toEqual(["system", "consultant", "consultant"]);
    expect(events.filter((event) => event.kind === "takeover")).toHaveLength(1);
  });

  it.each(["", "   ", "x".repeat(MAX_INPUT_LENGTH + 1)])("HTTP rejects an invalid draft without takeover or messages", async (text) => {
    expect((await send(text)).status).toBe(400);
    expect(thread.takeover.status).toBe("agent");
    expect(thread.transcript).toHaveLength(0);
    expect(events).toHaveLength(0);
  });

  it("runtime validation also refuses empty/long text before mutation", () => {
    expect(takeOverAndReply(thread.threadId, "Marta Nowak", " ")).toMatchObject({ ok: false, errorType: "InvalidReply" });
    expect(takeOverAndReply(thread.threadId, "Marta Nowak", "x".repeat(MAX_INPUT_LENGTH + 1))).toMatchObject({ ok: false, errorType: "InvalidReply" });
    expect(thread.takeover.status).toBe("agent");
    expect(thread.transcript).toHaveLength(0);
  });

  it("another consultant cannot take over or send, and existing content is preserved", async () => {
    takeOver(thread.threadId, "Marta Nowak");
    const snapshot = structuredClone(thread.transcript);
    const response = await send("Wrong consultant", "Tomasz Berg");
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ errorType: "NotYourConversation" });
    expect(thread.takeover).toMatchObject({ consultant: "Marta Nowak" });
    expect(thread.transcript).toEqual(snapshot);
    expect(consultantReply(thread.threadId, "Marta Nowak", "")).toMatchObject({ errorType: "InvalidReply" });
    expect(thread.transcript).toEqual(snapshot);
  });

  it("unknown threads and invalid consultant identities fail without changing this thread", async () => {
    expect((await send("Hello", "Marta Nowak", "unknown-thread")).status).toBe(409);
    expect((await send("Hello", "Unknown consultant")).status).toBe(400);
    expect(thread.takeover.status).toBe("agent");
    expect(thread.transcript).toHaveLength(0);
  });
});
