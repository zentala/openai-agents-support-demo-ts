import { RunContext, RunState } from "@openai/agents";
import { describe, expect, it } from "vitest";
import { triageAgent } from "@/lib/agents";
import { recordDecision, savePausedRun } from "@/lib/runtime/approvals";
import type { SupportContext } from "@/lib/types";

/**
 * Regression guard for the wave-2 review finding: run-support used to read the SDK's private
 * `result.state._context.context` to find the context the hooks mutate. The public contract we rely
 * on now is: the context object WE pass in is the one hooks and tools mutate, also after a resume.
 * These tests use the real SDK (no model call needed).
 */
const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "pl", threadId: "thread-run-context" };

describe("run context identity", () => {
  it("RunContext keeps the exact object it was given", () => {
    expect(new RunContext(ctx).context).toBe(ctx);
  });

  it("a resumed run is rebuilt around our context object, not a copy", async () => {
    const item = {
      rawItem: { callId: "call_ctx" },
      name: "create_refund",
      arguments: JSON.stringify({ orderId: "1002", amount: 3200, reason: "too big" }),
      agent: { name: "Orders & Refunds Agent" },
    };
    const paused = new RunState(new RunContext(ctx), "hi", triageAgent, 10);
    savePausedRun(ctx, "trace_ctx", paused, [item as never]);

    const decision = await recordDecision("call_ctx", "c-anna", true);
    if (decision.status !== "ready") throw new Error(`expected ready, got ${decision.status}`);

    // Hooks write into `ctx`; the restored run must see the same write (test peeks at the SDK's field once).
    ctx.activeOrderId = "1002";
    const inside = (decision.state as unknown as { _context: RunContext<SupportContext> })._context.context;
    expect(inside).toBe(ctx);
    expect(inside.activeOrderId).toBe("1002");
  });
});
