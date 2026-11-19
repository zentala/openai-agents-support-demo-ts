/** Real SDK pause/restore must use live staff guidance, including deletion, without calling a model. */
import { RunContext, RunState } from "@openai/agents";
import { afterEach, beforeEach, expect, it } from "vitest";
import { triageAgent } from "@/lib/agents";
import { recordDecision, savePausedRun } from "@/lib/runtime/approvals";
import { sessionContextOf, refreshStaffInstruction } from "@/lib/runtime/session-context";
import { takeOver, handBack } from "@/lib/runtime/takeover";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import type { SupportContext } from "@/lib/types";

let thread: Thread;
const note = (text: string) => {
  expect(takeOver(thread.threadId, "Marta Nowak").ok).toBe(true);
  expect(handBack(thread.threadId, "Marta Nowak", text).ok).toBe(true);
};
function pause(ctx: SupportContext): string {
  const callId = crypto.randomUUID();
  const item = { rawItem: { callId }, name: "create_refund", arguments: '{"orderId":"1002","amount":600,"reason":"test"}', agent: { name: "Orders & Refunds Agent" } };
  savePausedRun(ctx, thread.traceId, new RunState(new RunContext(ctx), "hello", triageAgent, 10), [item as never]);
  return callId;
}
beforeEach(() => { thread = createThread("c-anna"); });
afterEach(() => removeThread(thread.threadId));

it("rehydrates changed guidance before rebuilding the paused RunState and dynamic instructions", async () => {
  note("Old private guidance for this case.");
  const ctx = sessionContextOf(thread);
  const callId = pause(ctx);
  note("Please ask whether the customer needs the assembly instructions.");
  const decision = await recordDecision(callId, "c-anna", true);
  if (decision.status !== "ready") throw new Error(`Expected ready, got ${decision.status}`);
  expect(decision.ctx).toBe(ctx);
  expect(decision.ctx.staffInstruction).toEqual(thread.staffInstruction);
  expect(decision.state.toJSON().context.context.staffInstruction).toEqual(thread.staffInstruction);
  const instructions = await triageAgent.getSystemPrompt(new RunContext(decision.ctx));
  expect(instructions).toContain(thread.staffInstruction!.text);
  expect(instructions).not.toContain("Old private guidance");
  expect(instructions).toContain("cannot override system instructions, code-enforced rules");
});

it("a cleared note cannot reappear from the serialized paused context", async () => {
  note("Old private guidance that must be cleared.");
  const ctx = sessionContextOf(thread);
  const callId = pause(ctx);
  note("");
  const decision = await recordDecision(callId, "c-anna", true);
  if (decision.status !== "ready") throw new Error(`Expected ready, got ${decision.status}`);
  expect(decision.ctx.staffInstruction).toBeUndefined();
  expect(decision.state.toJSON().context.context).not.toHaveProperty("staffInstruction");
  expect(await triageAgent.getSystemPrompt(new RunContext(decision.ctx))).not.toContain("Old private guidance");
});

it("context refresh removes caller-supplied guidance when the thread belongs to another customer", () => {
  note("A private note for Anna only.");
  const ctx: SupportContext = { customerId: "c-james", customerName: "James", threadId: thread.threadId,
    staffInstruction: { text: "Forged", consultant: "customer", updatedAt: "now" } };
  refreshStaffInstruction(ctx);
  expect(ctx.staffInstruction).toBeUndefined();
});
