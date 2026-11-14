/**
 * A message that names the logged-in customer's own order goes to the Orders agent in code (agent choice, no
 * forced tool). Foreign and non-existent numbers keep the old path, so the routing leaks nothing about orders.
 */
import { Model, Runner, Usage, type ModelResponse } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { clearEventLog, readEventLog } from "@/lib/runtime/event-bus";
import { agentForRequest, routeRequest } from "@/lib/agents/requested-action";
import { triageAgent } from "@/lib/agents";
import { resetDemoData } from "@/lib/data/store";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { GUEST_ID, type SupportContext } from "@/lib/types";

beforeEach(() => resetDemoData());

const ask = (customerId: string, customerMessage: string): SupportContext => ({ ...sessionContextOf(createThread(customerId)), customerMessage });

it.each([
  "What is my delivery address for 1004?",
  "Where is order #1004?",
  "Gdzie jest zamówienie 1004?",
  "Wo ist Bestellung 1004?",
])("sends %s to the Orders agent without forcing a tool", (message) => {
  const selected = agentForRequest(ask("c-james", message));
  expect(selected).not.toBe(triageAgent);
  expect(selected.name).toBe("Orders & Refunds Agent");
  expect(selected.modelSettings.toolChoice).toBeUndefined();
});

it("keeps a foreign order and a non-existent order on the same triage path: no existence leak", () => {
  const foreign = agentForRequest(ask("c-james", "What is my delivery address for 2002?"));
  const unknown = agentForRequest(ask("c-james", "What is my delivery address for 9999?"));
  expect(foreign).toBe(triageAgent);
  expect(unknown).toBe(foreign);
});

it("keeps an unverified guest on triage, whose handoff leads to verification first", () => {
  expect(agentForRequest(ask(GUEST_ID, "What is my delivery address for 1004?"))).toBe(triageAgent);
});

it("a message without an order number keeps the triage path", () => {
  expect(agentForRequest(ask("c-james", "Where is my parcel?"))).toBe(triageAgent);
});

it("the routed turn really runs on the Orders agent and can read the order with its own tool", async () => {
  const ctx = ask("c-james", "What is my delivery address for 1004?");
  const agent = agentForRequest(ctx).clone({ inputGuardrails: [], outputGuardrails: [] });
  let calls = 0;
  const model: Model = {
    async getResponse(request): Promise<ModelResponse> {
      calls++;
      expect(request.modelSettings.toolChoice).toBeUndefined();
      const output = calls === 1
        ? [{ type: "function_call" as const, callId: "order", name: "get_order", arguments: JSON.stringify({ orderId: "1004" }) }]
        : [{ type: "message" as const, role: "assistant" as const, status: "completed" as const, content: [{ type: "output_text" as const, text: "Order 1004 goes to 14 Baker Lane." }] }];
      return { usage: new Usage(), output };
    },
    getStreamedResponse() { throw new Error("No streaming in this test"); },
  };
  const result = await new Runner({ tracingDisabled: true, modelProvider: { getModel: () => model } }).run(agent, ctx.customerMessage!, { context: ctx });
  expect(JSON.stringify(result.newItems)).toContain("14 Baker Lane");
  expect(JSON.stringify(result.newItems)).toContain("get_order");
});

it("treats a number followed by a currency as an amount, not an order", () => {
  expect(agentForRequest(ask("c-james", "I paid 1004 PLN for the whole set."))).toBe(triageAgent);
});

describe("code-routed turns record the context the handoff hook would", () => {
  const eventsOf = () => readEventLog().map(({ event }) => event);

  it("writes the validated order and a code-written reason, and announces the change in the panel", () => {
    clearEventLog();
    const ctx = ask("c-james", "Where is my order 1004?");
    expect(routeRequest(ctx).name).toBe("Orders & Refunds Agent");
    expect(ctx).toMatchObject({ activeOrderId: "1004", handoffReason: expect.stringContaining("#1004") });
    expect(eventsOf().find((event) => event.kind === "context_update")).toMatchObject({ changes: { activeOrderId: { to: "1004" }, handoffReason: expect.anything() } });
  });

  it("changes nothing for a foreign order, an unverified guest or a message without an order", () => {
    clearEventLog();
    for (const ctx of [ask("c-james", "Where is my order 2002?"), ask(GUEST_ID, "Where is my order 1004?"), ask("c-james", "Where is my parcel?")]) {
      expect(routeRequest(ctx)).toBe(triageAgent);
      expect(ctx.activeOrderId).toBeUndefined();
      expect(ctx.handoffReason).toBeUndefined();
    }
    expect(eventsOf().filter((event) => event.kind === "context_update")).toHaveLength(0);
  });
});
