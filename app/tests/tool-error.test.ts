import { RunContext, tool } from "@openai/agents";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { subscribeToThread } from "@/lib/runtime/event-bus";
import { createRefund } from "@/lib/tools/refund";
import { escalateToHuman, searchKbTool } from "@/lib/tools/kb-and-escalation";
import { getOrder, listMyOrders } from "@/lib/tools/orders";
import { reportToolError, toolErrorHandler, TOOL_ERROR_PREFIX } from "@/lib/tools/tool-error";
import type { AgentEvent, SupportContext } from "@/lib/types";

const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna", language: "pl", threadId: "thread-tool-error" };

function collect(threadId: string): { events: AgentEvent[]; stop: () => void } {
  const events: AgentEvent[] = [];
  return { events, stop: subscribeToThread(threadId, (e) => events.push(e)) };
}

describe("tool error handling", () => {
  it("a throwing execute becomes a panel event and a specific text for the model", async () => {
    const failing = tool({
      name: "boom",
      description: "always fails",
      parameters: z.object({}),
      errorFunction: toolErrorHandler("boom"),
      execute: async () => {
        throw new TypeError("429 Too Many Requests");
      },
    });
    const { events, stop } = collect(ctx.threadId);
    // `invoke` is what the runner calls; it catches the exception and calls errorFunction.
    const output = await failing.invoke(new RunContext(ctx), "{}");
    stop();

    expect(output).toBe(`${TOOL_ERROR_PREFIX} boom: TypeError: 429 Too Many Requests`);
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ kind: "error", errorType: "TypeError", where: "tool boom" });
  });

  it("without our handler the SDK hides the cause (the bug this guards against)", async () => {
    const hidden = tool({
      name: "hidden",
      description: "fails",
      parameters: z.object({}),
      execute: async () => {
        throw new Error("embeddings quota exceeded");
      },
    });
    const output = await hidden.invoke(new RunContext(ctx), "{}");
    expect(output).not.toContain("embeddings quota exceeded");
  });

  it("redacts API keys from the message and the event", () => {
    const { events, stop } = collect("thread-redact");
    const text = reportToolError("search_kb", "thread-redact", new Error("Incorrect API key: " + "sk-proj-" + "abcdef123456".repeat(3)));
    stop();
    expect(text).not.toContain("abcdef123456");
    expect(JSON.stringify(events)).not.toContain("abcdef123456");
  });

  it("still returns the text when there is no thread to notify", () => {
    expect(reportToolError("x", undefined, new Error("oops"))).toBe("TOOL_ERROR x: Error: oops");
  });

  it("every production tool reports a failure with the shared handler", async () => {
    // A run without a customer session makes each tool throw in sessionOf(): no network needed.
    const noSession = new RunContext(undefined);
    const calls: [{ name: string; invoke: (c: RunContext<never>, input: string) => Promise<unknown> }, string][] = [
      [getOrder, '{"orderId":"1001"}'],
      [listMyOrders, "{}"],
      [createRefund, '{"orderId":"1001","amount":10,"reason":"x"}'],
      [searchKbTool, '{"query":"returns"}'],
      [escalateToHuman, '{"summary":"help"}'],
    ];
    for (const [t, input] of calls) {
      const output = await t.invoke(noSession as never, input);
      expect(String(output), t.name).toBe(`${TOOL_ERROR_PREFIX} ${t.name}: Error: Tool called without a customer session`);
    }
  });
});
