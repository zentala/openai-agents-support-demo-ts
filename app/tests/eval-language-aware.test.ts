/**
 * Eval expectations that must hold in the customer's language: real tools produce the events,
 * the real evaluator judges them. No model, no network.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { evaluate } from "@/lib/eval/checks";
import { scenarios } from "@/lib/eval/scenarios";
import { addRefund, findOpenTicketForThread, resetDemoData } from "@/lib/data/store";
import { emitAgentEvent, subscribeToThread } from "@/lib/runtime/event-bus";
import { offerReplyChoices } from "@/lib/tools/reply-choices";
import { createThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { cancelRefund } from "@/lib/tools/cancel-refund";
import { createRefund } from "@/lib/tools/refund";
import type { AgentEvent } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

beforeEach(() => { resetDemoData(); model.run.mockReset(); });

/** Plays the real tools of the refund-cancel-repeat story and returns their outputs as panel events. */
async function repeatedCancellationEvents(): Promise<AgentEvent[]> {
  const thread = createThread("c-anna");
  const run = new RunContext(sessionContextOf(thread));
  const calls: [typeof createRefund | typeof cancelRefund, object][] = [
    [createRefund, { orderId: "1001", amount: 249, reason: "does not fit" }],
    [cancelRefund, { orderId: "1001", refundId: null }],
    [cancelRefund, { orderId: "1001", refundId: null }],
  ];
  const events: AgentEvent[] = [];
  const unsubscribe = subscribeToThread(thread.threadId, (event) => events.push(event));
  for (const [tool, args] of calls) {
    emitAgentEvent(thread.threadId, { kind: "tool_call", agent: "Orders", tool: tool.name, args });
    const result = await tool.invoke(run, JSON.stringify(args));
    emitAgentEvent(thread.threadId, { kind: "tool_output", agent: "Orders", tool: tool.name, result });
  }
  unsubscribe();
  return events;
}

const expectation = scenarios.find((s) => s.id === "refund-cancel-repeat")!.expect;

it.each([
  ["Polish", "Zwrot za zamówienie 1001 był już wcześniej anulowany."],
  ["English", "That refund was already cancelled."],
])("refund-cancel-repeat accepts the %s cancellation wording", async (_language, reply) => {
  const events = await repeatedCancellationEvents();
  expect(evaluate(expectation, { reply, events })).toEqual([]);
});

it("refund-cancel-repeat still fails when the reply never mentions cancellation", async () => {
  const events = await repeatedCancellationEvents();
  expect(evaluate(expectation, { reply: "Dziękuję, wszystko gotowe.", events })).toEqual([expect.stringContaining("answer lacks")]);
});

it("refund-cancel-repeat still requires the tool to confirm the repeat, whatever language the reply is in", async () => {
  const events = (await repeatedCancellationEvents()).filter((e) => !(e.kind === "tool_output" && JSON.stringify(e.result).includes("REFUND_ALREADY_CANCELLED")));
  expect(evaluate(expectation, { reply: "Zwrot był już anulowany.", events })).toEqual(["no tool result contains REFUND_ALREADY_CANCELLED"]);
});

describe("kb-unknown-yes asserts the observable ticket outcome", () => {
  const kb = scenarios.find((s) => s.id === "kb-unknown-yes")!;

  /** Real turns; only inference is mocked. Turn 1: the model offers help through the real tool. Turn 2: the bare "Yes, please." opens the ticket in code. */
  async function playYes() {
    const thread = createThread("c-james");
    const ctx = sessionContextOf(thread);
    model.run.mockImplementationOnce(async (_input, runCtx) => {
      const offer = { kind: "escalation", orderId: null, amount: null, reason: null };
      expect(await offerReplyChoices.invoke(new RunContext(runCtx), JSON.stringify(offer))).toContain('"ok": true');
      return { reply: "I do not have delivery information for Iceland.", approvals: [] };
    });
    const events: AgentEvent[] = [];
    const unsubscribe = subscribeToThread(thread.threadId, (event) => events.push(event));
    await handleUserMessage(ctx, "Do you deliver to Iceland?");
    const outcome = await handleUserMessage(ctx, "Yes, please.");
    unsubscribe();
    expect(model.run).toHaveBeenCalledTimes(1);
    return { thread, events, outcome };
  }

  it("passes on the real deterministic Yes: rule-opened ticket, automatic-step entry, no contact promise", async () => {
    const { thread, events, outcome } = await playYes();
    const observation = { reply: outcome.reply, events, ticket: findOpenTicketForThread(thread.threadId), transcript: thread.transcript };
    expect(observation.ticket).toMatchObject({ source: "rule", reason: "human_requested" });
    const { toolsCalled, ...outcomeChecks } = kb.expect;
    expect(toolsCalled).not.toContain("escalate_to_human");
    expect(evaluate({ ...outcomeChecks, quickRepliesShown: undefined, toolsCalled: undefined }, observation)).toEqual([]);
  });

  it("fails when no ticket exists, when the model opened it, or when the reply promises a call", async () => {
    const { thread, events, outcome } = await playYes();
    const ticket = findOpenTicketForThread(thread.threadId)!;
    const base = { reply: outcome.reply, events, ticket, transcript: thread.transcript };
    const only = { ticketOpened: kb.expect.ticketOpened, automaticStepShown: true, replyNotMatches: kb.expect.replyNotMatches };
    expect(evaluate(only, { ...base, ticket: undefined })).toHaveLength(2);
    expect(evaluate(only, { ...base, ticket: { ...ticket, source: "agent" } })).toEqual([expect.stringContaining("open ticket should be rule/human_requested")]);
    expect(evaluate(only, { ...base, transcript: [] })).toEqual(["automatic step for the open ticket should be shown=true"]);
    expect(evaluate(only, { ...base, reply: "A colleague will call you tomorrow." })).toEqual([expect.stringContaining("forbidden")]);
  });
});

describe("refund-cancel-paid-refused accepts payout wording", () => {
  const paid = scenarios.find((s) => s.id === "refund-cancel-paid-refused")!;

  /** Real tool on a seeded paid refund, observed through the real event bus. */
  async function paidRefundEvents(): Promise<AgentEvent[]> {
    addRefund({ customerId: "c-james", orderId: "1005", amount: 180, reason: "seeded", status: "paid" });
    const thread = createThread("c-james");
    const events: AgentEvent[] = [];
    const unsubscribe = subscribeToThread(thread.threadId, (event) => events.push(event));
    const args = { orderId: "1005", refundId: null };
    emitAgentEvent(thread.threadId, { kind: "tool_call", agent: "Orders", tool: "cancel_refund", args });
    emitAgentEvent(thread.threadId, { kind: "tool_output", agent: "Orders", tool: "cancel_refund", result: await cancelRefund.invoke(new RunContext(sessionContextOf(thread)), JSON.stringify(args)) });
    unsubscribe();
    return events;
  }

  it.each([
    ["the logged model answer", "Your refund R-1001 for order #1005 cannot be cancelled because the payout has already been completed. Would you like me to escalate this to a human colleague?"],
    ["a Polish answer", "Zwrotu nie można anulować, bo wypłata została już zrealizowana. Przekazać sprawę konsultantowi?"],
    ["a German answer", "Die Erstattung wurde bereits ausgezahlt. Soll ich einen Mitarbeiter hinzuziehen?"],
  ])("passes %s", async (_name, reply) => {
    expect(evaluate(paid.expect, { reply, events: await paidRefundEvents() })).toEqual([]);
  });

  it("still fails on an unrelated reply, and without the tool's REFUND_ALREADY_PAID", async () => {
    const events = await paidRefundEvents();
    expect(evaluate(paid.expect, { reply: "All done, a colleague will help.", events })).toEqual([expect.stringContaining("answer lacks")]);
    expect(evaluate(paid.expect, { reply: "It was paid out; ask a consultant.", events: events.filter((e) => e.kind !== "tool_output") })).toEqual(["no tool result contains REFUND_ALREADY_PAID"]);
  });
});
