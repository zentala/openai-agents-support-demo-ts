import { describe, expect, it } from "vitest";
import { toChatMessage } from "@/lib/client/pushed-messages";
import { handlerOf } from "@/lib/client/selectors";
import type { AgentEvent } from "@/lib/types";

const ev = (body: object): AgentEvent => ({ id: crypto.randomUUID(), ts: 0, ...body }) as AgentEvent;

describe("toChatMessage", () => {
  it("a consultant line carries a sender part with the consultant name", () => {
    const message = toChatMessage({ id: "1", ts: 0, kind: "chat_message", entryId: "e1", role: "consultant", text: "Hi", author: "Marta Nowak" });
    expect(message).toMatchObject({ id: "e1", role: "assistant" });
    expect(message.parts).toEqual([{ type: "text", text: "Hi" }, { type: "data-sender", data: { kind: "consultant", name: "Marta Nowak" } }]);
  });

  it("an agent line is a plain assistant message", () => {
    const message = toChatMessage({ id: "1", ts: 0, kind: "chat_message", entryId: "e2", role: "agent", text: "Done" });
    expect(message.parts).toEqual([{ type: "text", text: "Done" }]);
  });
});

describe("handlerOf", () => {
  it("defaults to the agent and follows the newest takeover event", () => {
    expect(handlerOf([])).toEqual({ status: "agent" });
    const events = [ev({ kind: "takeover", status: "human", consultant: "Marta" }), ev({ kind: "takeover", status: "agent", consultant: "Marta" })];
    expect(handlerOf(events.slice(0, 1))).toEqual({ status: "human", consultant: "Marta" });
    expect(handlerOf(events).status).toBe("agent");
  });
});
