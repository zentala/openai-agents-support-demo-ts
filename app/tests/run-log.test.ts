/** Run-log grouping uses real masked normalization events and preserves trace/metrics/customer boundaries. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { RunnerOutput } from "@/components/runner-output";
import { runLogGroups } from "@/lib/client/run-log";
import { timelineOf } from "@/lib/client/selectors";
import { computeMetrics } from "@/lib/admin/metrics";
import { toCustomerEvent } from "@/lib/runtime/event-visibility";
import { clearEventLog, emitAgentEvent, readEventLog, withTurnEvents } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { takeOver } from "@/lib/runtime/takeover";
import { RunContext, RunState } from "@openai/agents";
import { triageAgent } from "@/lib/agents";
import { savePausedRun } from "@/lib/runtime/approvals";
import { resolveApproval } from "@/lib/runtime/approval-flow";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
let thread: Thread;
const send = (text: string) => handleUserMessage(sessionContextOf(thread), text);
const log = () => readEventLog().filter((entry) => entry.threadId === thread.threadId);
const events = () => log().map((entry) => entry.event);
const counts = { pending: 0, approved: 0, rejected: 0 };
beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "false");
  clearEventLog(); model.run.mockReset();
  thread = createThread("c-james");
  takeOver(thread.threadId, "Marta Nowak");
  clearEventLog();
});
afterEach(() => { removeThread(thread.threadId); clearEventLog(); vi.unstubAllEnvs(); });

it("labels separate turns with normalized/masked text; no raw input is added to trace events", async () => {
  const card = "4111 1111 1111 1111", iban = "PL61109010140000071219812874", phone = "+48 501 234 567";
  const key = `sk-proj-${"x".repeat(30)}`;
  await send(`Help with ${card} and ${iban.slice(0, 8)}\u200b${iban.slice(8)}, phone ${phone}, key ${key}\nSent from my iPhone\n> quoted canary`);
  await send("Where is order 1004?\nSent from my Android");
  const groups = runLogGroups(timelineOf(events()));
  expect(groups.map((group) => group.turn)).toEqual([1, 2]);
  expect(groups[0].customerText).toContain("Help with");
  expect(groups[1].customerText).toBe("Where is order 1004?");
  const headers = groups.map((group) => group.customerText).join(" ");
  for (const raw of [card, iban, phone, key, "Sent from", "quoted canary", "\u200b"]) expect(headers).not.toContain(raw);
  const traces = events().filter((event) => event.kind === "trace");
  expect(traces).toHaveLength(2);
  expect(traces[0].traceId).toBe(traces[1].traceId); // One conversation trace; unique event IDs define its turns.
  expect(groups[0].id).not.toBe(groups[1].id);
  for (const trace of traces) {
    expect(Object.keys(trace).sort()).toEqual(["id", "kind", "traceId", "ts", "turnId", "url"]);
    expect(toCustomerEvent(trace)).toBeUndefined();
  }
  expect(events().filter((event) => event.kind === "normalization").every((event) => !toCustomerEvent(event))).toBe(true);
  expect(model.run).not.toHaveBeenCalled();
  expect(computeMetrics(log(), counts).conversations).toBe(1);
  const html = renderToStaticMarkup(createElement(RunnerOutput, { events: timelineOf(events()) }));
  for (const text of ["Run log (all turns)", "Turn 1", "Turn 2", "Where is order 1004?", "cleaned customer message"]) expect(html).toContain(text);
  for (const raw of [card, iban, phone, key]) expect(html).not.toContain(raw);
});
it("keeps rejected/empty turn boundaries without copying raw input or inflating metrics", async () => {
  await handleUserMessage(sessionContextOf(thread), "raw rejected canary", { type: "order", orderId: "1001" });
  await send("Sent from my iPhone");
  const groups = runLogGroups(timelineOf(events()));
  expect(groups.map((group) => group.customerText)).toEqual(["Order selection refused", "Empty message after cleanup"]);
  expect(JSON.stringify(groups)).not.toContain("raw rejected canary");
  expect(computeMetrics(log(), counts).conversations).toBe(0);
  expect(model.run).not.toHaveBeenCalled();
});
it("unknown correlation stays in Conversation updates instead of guessing the latest turn", async () => {
  emitAgentEvent(thread.threadId, { kind: "takeover", status: "human", consultant: "Marta Nowak" });
  await send("Please review my refund");
  emitAgentEvent(thread.threadId, { kind: "approval_decision", approvalId: "a", toolName: "create_refund", approved: true, decidedBy: "Marta Nowak" });
  withTurnEvents(thread.threadId, "missing-origin", () => emitAgentEvent(thread.threadId, { kind: "tool_output", tool: "old_run", agent: "Orders", result: "unknown origin" }));
  const groups = runLogGroups(timelineOf(events()));
  expect(groups).toHaveLength(2);
  expect(groups[0].turn).toBeUndefined(); expect(groups[0].customerText).toBeUndefined();
  expect(groups[1].turn).toBe(1);
  expect(groups[0].events.map((event) => event.kind)).toEqual(["takeover", "approval_decision", "tool_output"]);
  expect(groups[1].events.some((event) => event.kind === "approval_decision")).toBe(false);
  expect(runLogGroups([])).toEqual([]);
});
it("returns an interleaved approval decision, resumed events and final push to their originating customer turn", async () => {
  thread.takeover = { status: "agent" };
  model.run.mockImplementationOnce(async (_input, ctx) => {
    const item = { rawItem: { callId: "interleaved-refund" }, name: "create_refund", agent: { name: "Orders" },
      arguments: JSON.stringify({ orderId: "1004", amount: 600, reason: "test" }) };
    const approvals = savePausedRun(ctx, thread.traceId, new RunState(new RunContext(ctx), "first turn", triageAgent, 10), [item as never]);
    approvals.forEach((approval) => emitAgentEvent(ctx.threadId, { kind: "approval_request", approval }));
    return { reply: "", approvals };
  });
  await send("Please refund my table");
  model.run.mockResolvedValueOnce({ reply: "Your other question was answered.", approvals: [] });
  await send("What are your opening hours?");
  model.run.mockImplementationOnce(async (state, ctx) => {
    expect(state).toBeInstanceOf(RunState);
    emitAgentEvent(ctx.threadId, { kind: "tool_output", tool: "create_refund", agent: "Orders", result: "REFUND_CREATED" });
    await Promise.resolve();
    emitAgentEvent(ctx.threadId, { kind: "guardrail", name: "safe", stage: "output", passed: true, reasoning: "ok" });
    return { reply: "Your refund was approved.", approvals: [] };
  });
  expect((await resolveApproval("interleaved-refund", true, "Marta Nowak")).ok).toBe(true);
  const groups = runLogGroups(timelineOf(events()));
  expect(groups).toHaveLength(2);
  expect(groups.map((group) => group.customerText)).toEqual(["Please refund my table", "What are your opening hours?"]);
  expect(groups[0].events.map((event) => event.kind)).toEqual(expect.arrayContaining(["approval_request", "approval_decision", "tool_output", "guardrail", "chat_message"]));
  expect(groups[1].events.some((event) => ["approval_decision", "tool_output", "chat_message"].includes(event.kind))).toBe(false);
  expect(groups[0].events.at(-1)).toMatchObject({ kind: "chat_message", text: "Your refund was approved." });
  for (const event of events()) {
    const customer = toCustomerEvent(event);
    if (customer) expect(customer).not.toHaveProperty("turnId");
  }
  expect(events().filter((event) => event.kind === "trace")).toHaveLength(2);
  expect(computeMetrics(log(), counts).conversations).toBe(1);
  expect(model.run).toHaveBeenCalledTimes(3); // All three are offline mocks, including the restored RunState.
});
