/** Current-turn boundaries, tool outcomes, blocked requests, approvals and human takeover without models. */
import { expect, it } from "vitest";
import { turnTrace } from "@/lib/client/turn-trace";
import type { AgentEvent, AgentEventBody } from "@/lib/types";
const event = (body: AgentEventBody): AgentEvent => ({ id: crypto.randomUUID(), ts: 1000, ...body });
const trace = () => event({ kind: "trace", traceId: "t", url: "" });
it("shows an empty state before a turn", () => expect(turnTrace([])).toEqual([]));
it("keeps only the latest turn and joins tool calls to outputs", () => {
  const rows = turnTrace([trace(), event({ kind: "error", errorType: "Old", message: "old", where: "test" }), trace(),
    event({ kind: "normalization", stripped: ["1 invisible character"], before: "safe", after: "safe" }),
    event({ kind: "guardrail", name: "input", stage: "input", passed: true, reasoning: "ok" }),
    event({ kind: "handoff", from: "Triage", to: "Orders" }),
    event({ kind: "tool_call", tool: "refund", agent: "Orders", args: {} }),
    event({ kind: "tool_output", tool: "refund", agent: "Orders", result: { status: "REFUND_CREATED" } }),
    event({ kind: "guardrail", name: "leak", stage: "output", passed: true, reasoning: "ok" })], true);
  expect(rows.map((r) => r.label)).toEqual(["Input cleanup", "Input guardrail · input", "Handoff", "Tool · refund", "Output guardrail · leak", "Reply sent"]);
  expect(rows[3].detail).toBe("REFUND_CREATED");
});
it("reports errors and blocked guardrails without claiming successful delivery", () => {
  const rows = turnTrace([trace(), event({ kind: "guardrail", name: "input", stage: "input", passed: false, reasoning: "Attack" }),
    event({ kind: "error", errorType: "ProviderError", message: "no credits", where: "model" })], true);
  expect(rows.every((r) => r.status === "failed")).toBe(true);
  expect(rows.at(-1)?.detail).toContain("no credits");
});
it("shows takeover as a skipped model step and a consultant reply", () => {
  const rows = turnTrace([trace(), event({ kind: "takeover", status: "human", consultant: "Marta" }),
    event({ kind: "chat_message", entryId: "e", role: "consultant", text: "Hi", author: "Marta" })]);
  expect(rows[0]).toMatchObject({ status: "waiting", detail: expect.stringContaining("model skipped") });
  expect(rows[1].label).toBe("Reply sent");
});
it("keeps approval waiting, then continues within the same turn", () => {
  const approval = { approvalId: "a", threadId: "t", traceId: "tr", toolName: "refund", args: {}, customerId: "c", customerName: "C", agent: "A", summary: "Refund", createdAt: 0 };
  const events = [trace(), event({ kind: "approval_request", approval })];
  expect(turnTrace(events, true).at(-1)?.status).toBe("waiting");
  events.push(event({ kind: "approval_decision", approvalId: "a", toolName: "refund", approved: true, decidedBy: "Marta" }));
  expect(turnTrace(events, true).at(-1)?.label).toBe("Reply sent");
  expect(turnTrace(events, true).some((r) => r.status === "waiting")).toBe(false);
});
it("shows generic SDK outputs on the pending call and reports tool errors", () => {
  const rows = turnTrace([trace(), event({ kind: "tool_call", tool: "get_order", agent: "Orders", args: {} }),
    event({ kind: "tool_output", tool: "tool", agent: "Orders", result: "TOOL_ERROR get_order: unavailable" })]);
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ label: "Tool · get_order", status: "failed" });
});
it("marks escalation as human work waiting on a ticket, not skipped support", () => {
  const rows = turnTrace([trace(), event({ kind: "escalation", ticketId: "T-2001", source: "rule", reason: "human_requested" })], true);
  expect(rows[0]).toMatchObject({ label: "Waiting for a human · Ticket T-2001", status: "waiting", detail: "human_requested · model skipped" });
  expect(rows.some((r) => r.status === "skipped")).toBe(false);
});
