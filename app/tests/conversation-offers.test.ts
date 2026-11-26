/** State-owned offers work when inference never invokes the offer tool; existing auth/nonce rules remain real. */
import { beforeEach, expect, it, vi } from "vitest";
import { RunContext } from "@openai/agents";
import { createThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { emitAgentEvent, readEventLog, clearEventLog } from "@/lib/runtime/event-bus";
import { resetDemoData, listRefunds, listTickets } from "@/lib/data/store";
import { getOrder } from "@/lib/tools/orders";
const model = vi.hoisted(() => vi.fn());
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
beforeEach(() => { resetDemoData(); clearEventLog(); model.mockReset(); });

it("offers human help after a KB result without a model offer call; typed decline has no ticket effect", async () => {
  const thread = createThread("c-james");
  model.mockImplementationOnce(async (_input, ctx) => {
    emitAgentEvent(ctx.threadId, { kind: "tool_call", agent: "FAQ", tool: "search_kb", args: { query: "Iceland" } });
    return { reply: "I do not have that information.", approvals: [] };
  });
  await handleUserMessage(sessionContextOf(thread), "Do you deliver to Iceland?");
  expect(thread.pendingQuickReply?.kind).toBe("escalation");
  const calls = model.mock.calls.length;
  const declined = await handleUserMessage(sessionContextOf(thread), "No, thanks. Please leave it there; do not open a ticket.");
  expect(model).toHaveBeenCalledTimes(calls);
  expect(declined.sender?.kind).toBe("system");
  expect(listTickets()).toHaveLength(0);
});

it("stages owned refund details in code and resolves natural confirmation against that stored offer", async () => {
  const thread = createThread("c-anna");
  model.mockImplementationOnce(async (_input, ctx) => {
    await getOrder.invoke(new RunContext(ctx), JSON.stringify({ orderId: "1001" }));
    return { reply: "Please confirm your refund.", approvals: [] };
  });
  await handleUserMessage(sessionContextOf(thread), "Return order 1001 for 249 PLN because it does not fit. Please confirm first.");
  expect(thread.pendingQuickReply).toMatchObject({ kind: "refund", refund: { orderId: "1001", amount: 249 } });
  expect(listRefunds()).toHaveLength(0);
  model.mockResolvedValueOnce({ reply: "Continue through the ordinary guarded run.", approvals: [] });
  await handleUserMessage(sessionContextOf(thread), "Yes, please. I confirm those refund details.");
  expect(JSON.stringify(model.mock.calls.at(-1)?.[0])).toContain("249 PLN");
  expect(readEventLog().some(({ event }) => event.kind === "tool_call" && event.agent === "Conversation flow (code)" && event.tool === "offer_reply_choices")).toBe(true);
});

it("never manufactures refund choices for a foreign order, failed model or approval pause", async () => {
  for (const outcome of [{ reply: "Refused", failed: "failure", approvals: [] }, { reply: "", approvals: [{ approvalId: "pause", summary: "Refund" }] }, { reply: "Not yours", approvals: [] }]) {
    const thread = createThread("c-james");
    model.mockResolvedValueOnce(outcome);
    await handleUserMessage(sessionContextOf(thread), "Refund order 1001 for 249 PLN.");
    expect(thread.pendingQuickReply).toBeUndefined();
  }
});

it("offers no refund choices when the customer says not to refund (poisoned-note order 1006)", async () => {
  for (const text of ["What is the status of my order 1006? Do not change or refund anything.", "Order 1006 status please, no refund needed.", "Jaki jest status zamówienia 1006? Nie rób zwrotu.", "Status of 1006? Please don’t refund anything."]) {
    const thread = createThread("c-james");
    // Seeded so the test proves the negation branch cleared a wish, not that none was ever set.
    thread.refundRequest = "Refund order 1006 for 1190 PLN.";
    model.mockResolvedValueOnce({ reply: "Order 1006 is in transit.", approvals: [] });
    await handleUserMessage(sessionContextOf(thread), text);
    expect(thread.refundRequest, text).toBeUndefined();
    expect(thread.pendingQuickReply, text).toBeUndefined();
  }
});

it("a later 'no refund' withdraws an earlier refund wish", async () => {
  const thread = createThread("c-anna");
  thread.refundRequest = "Return order 1001 for 249 PLN.";
  model.mockResolvedValueOnce({ reply: "Understood.", approvals: [] });
  await handleUserMessage(sessionContextOf(thread), "Actually, never mind, do not refund it.");
  expect(thread.refundRequest).toBeUndefined();
  expect(thread.pendingQuickReply).toBeUndefined();
});
