import { describe, expect, it } from "vitest";
import { findOrderForCustomer, getCustomer } from "@/lib/data/store";
import { evaluate } from "@/lib/eval/checks";
import { fillTemplates, scenarios } from "@/lib/eval/scenarios";
import { GUEST_ID } from "@/lib/types";
import { approvalsOf, currentAgent, latestGuardrails } from "@/lib/client/selectors";
import type { AgentEvent } from "@/lib/types";

const ev = (body: object): AgentEvent => ({ id: crypto.randomUUID(), ts: 0, ...body }) as AgentEvent;

describe("scenarios file", () => {
  it("has the 38 scenarios (15 of wave 1-2, 11 of wave 3a, 12 of wave 3b) with unique ids", () => {
    expect(scenarios).toHaveLength(38);
    expect(new Set(scenarios.map((s) => s.id)).size).toBe(38);
  });

  it("show_order_picker is forbidden wherever the customer already named an order or an item", () => {
    const named = [
      "iphone-signature", "refund-in-policy", "refund-over-threshold", "refund-expired", "foreign-order", "card-number", "handoff-context",
      "claim-slot-filling", "iban-typed-in-chat", "cod-refund-needs-iban", "cod-refund-with-iban", "address-change-confirm",
    ];
    for (const id of named) {
      expect(scenarios.find((s) => s.id === id)?.expect.toolsNotCalled, id).toContain("show_order_picker");
    }
  });

  it("every scenario names an existing customer (or the guest) and has at least one check", () => {
    for (const s of scenarios) {
      if (s.customerId !== GUEST_ID) expect(getCustomer(s.customerId), s.id).toBeDefined();
      expect(Object.keys(s.expect).length, s.id).toBeGreaterThan(0);
    }
  });

  it("seeded refunds point at orders of the scenario's own customer", () => {
    const seeded = scenarios.filter((s) => s.seedRefunds);
    expect(seeded.length).toBeGreaterThan(0);
    for (const s of seeded) {
      for (const seed of s.seedRefunds ?? []) {
        expect(findOrderForCustomer(s.customerId, seed.orderId), s.id).toBeDefined();
      }
    }
  });

  it("guest scenarios start as the guest, the others as a real customer", () => {
    const guests = scenarios.filter((s) => s.customerId === GUEST_ID).map((s) => s.id);
    expect(guests).toEqual(["guest-verify-success", "guest-no-data-before-verify", "guest-verify-lockout"]);
  });

  it("{{today}} in a scenario text becomes today's date", () => {
    expect(fillTemplates("noticed on {{today}}")).toBe(`noticed on ${new Date().toISOString().slice(0, 10)}`);
  });

  it("all expected regular expressions compile", () => {
    for (const s of scenarios) {
      [...(s.expect.replyMatches ?? []), ...(s.expect.replyNotMatches ?? [])].forEach((p) => expect(() => new RegExp(p, "i")).not.toThrow());
    }
  });
});

describe("evaluate: wave 3a expectations", () => {
  const out = (result: unknown) => ev({ kind: "tool_output", agent: "A", tool: "create_refund", result });

  it("counts refunds and looks into tool results", () => {
    const events = [out({ status: "REFUND_CREATED" }), out({ status: "REFUSED", code: "AMOUNT_EXCEEDS_ORDER" })];
    expect(evaluate({ refundsCreated: 1, toolResultIncludes: ["AMOUNT_EXCEEDS_ORDER"] }, { reply: "", events })).toEqual([]);
    expect(evaluate({ refundsCreated: 2 }, { reply: "", events })).toHaveLength(1);
    expect(evaluate({ toolResultIncludes: ["NOPE"] }, { reply: "", events })).toHaveLength(1);
  });

  it("ticketCreated reads the escalation event", () => {
    const events = [ev({ kind: "escalation", ticketId: "T-2001", source: "rule", reason: "human_requested" })];
    expect(evaluate({ ticketCreated: true }, { reply: "", events })).toEqual([]);
    expect(evaluate({ ticketCreated: true }, { reply: "", events: [] })).toHaveLength(1);
    expect(evaluate({ ticketCreated: false }, { reply: "", events })).toHaveLength(1);
  });
});

describe("kb-unknown: the pattern forbids an affirmative claim, not a hedge", () => {
  const pattern = new RegExp(scenarios.find((s) => s.id === "kb-unknown")!.expect.replyNotMatches![1], "i");

  it.each([
    "I can't tell if we deliver to Iceland.",
    "I do not have information on whether we deliver to Iceland.",
    "I don't know whether or not we deliver to Iceland.",
    "I'm not sure we deliver to Iceland, but a colleague can check.",
    "I cannot confirm that we deliver to Iceland.",
  ])("a hedge is allowed: %s", (reply) => {
    expect(pattern.test(reply)).toBe(false);
  });

  it.each([
    "Yes, we deliver to Iceland.",
    "Good news! We do deliver to Iceland.",
    "We do deliver to Iceland, I am not sure about the cost.",
    "I do not know the price. We deliver to Iceland within 10 days.",
    "We don't ship much, but we deliver to Iceland.",
    "I'm not sure about prices, but we deliver to Iceland.",
    "I cannot confirm the date; we deliver to Iceland.",
    "I don't know whether it costs extra, although we do deliver to Iceland.",
  ])("an affirmative claim is caught: %s", (reply) => {
    expect(pattern.test(reply)).toBe(true);
  });
});

describe("evaluate: wave 3b expectations", () => {
  const tool = (name: string, result: unknown) => ev({ kind: "tool_output", agent: "A", tool: name, result });

  it("claimsCreated counts CLAIM_CREATED results of submit_claim only", () => {
    const events = [tool("submit_claim", { status: "INCOMPLETE" }), tool("submit_claim", { status: "CLAIM_CREATED" })];
    expect(evaluate({ claimsCreated: 1 }, { reply: "", events })).toEqual([]);
    expect(evaluate({ claimsCreated: 0 }, { reply: "", events })).toHaveLength(1);
  });

  it("verification: verified, locked, not_verified", () => {
    const verified = [ev({ kind: "verification", outcome: "verified", customerId: "c", customerName: "C" })];
    const locked = [ev({ kind: "verification", outcome: "failed" }), ev({ kind: "verification", outcome: "locked" })];
    expect(evaluate({ verification: "verified" }, { reply: "", events: verified })).toEqual([]);
    expect(evaluate({ verification: "not_verified" }, { reply: "", events: verified })).toHaveLength(1);
    expect(evaluate({ verification: "locked" }, { reply: "", events: locked })).toEqual([]);
    expect(evaluate({ verification: "not_verified" }, { reply: "", events: locked })).toEqual([]);
  });

  it("addressStatus reads the newest address_change event, or none", () => {
    const events = [ev({ kind: "address_change", orderId: "1004", status: "proposed" }), ev({ kind: "address_change", orderId: "1004", status: "applied" })];
    expect(evaluate({ addressStatus: "applied" }, { reply: "", events })).toEqual([]);
    expect(evaluate({ addressStatus: "proposed" }, { reply: "", events })).toHaveLength(1);
    expect(evaluate({ addressStatus: "none" }, { reply: "", events: [] })).toEqual([]);
  });

  it("eventsNotInclude fails when a secret shows up anywhere in the panel events", () => {
    const events = [tool("get_order", { note: "account 109010140000" })];
    expect(evaluate({ eventsNotInclude: ["109010140000"] }, { reply: "", events })).toHaveLength(1);
    expect(evaluate({ eventsNotInclude: ["nope"] }, { reply: "", events })).toEqual([]);
  });

  it("maxQuestionMarks checks the first N answers only", () => {
    const replies = ["Which item?", "What date? And which color?", "Photo? Summary ok?"];
    expect(evaluate({ maxQuestionMarks: { replies: 1, max: 1 } }, { reply: "", events: [], replies })).toEqual([]);
    expect(evaluate({ maxQuestionMarks: { replies: 2, max: 1 } }, { reply: "", events: [], replies })).toHaveLength(1);
  });
});

describe("evaluate", () => {
  const toolCall = (tool: string) => ev({ kind: "tool_call", agent: "A", tool, args: {} });

  it("passes and fails on tool expectations", () => {
    const obs = { reply: "see returns-policy", events: [toolCall("search_kb")] };
    expect(evaluate({ toolsCalled: ["search_kb"], citesKb: ["returns-policy"] }, obs)).toEqual([]);
    expect(evaluate({ toolsNotCalled: ["search_kb"] }, obs)).toHaveLength(1);
  });

  it("detects a created refund from the tool output", () => {
    const events = [ev({ kind: "tool_output", agent: "A", tool: "create_refund", result: { status: "REFUND_CREATED" } })];
    expect(evaluate({ refundCreated: true }, { reply: "", events })).toEqual([]);
    expect(evaluate({ refundCreated: false }, { reply: "", events })).toHaveLength(1);
  });

  it("treats a crash as a failure and checks guardrail name", () => {
    expect(evaluate({}, { reply: "", events: [], failed: "boom" })[0]).toContain("boom");
    expect(evaluate({ guardrailTripped: "jailbreak_guardrail" }, { reply: "", events: [] })).toHaveLength(1);
    expect(evaluate({ guardrailTripped: "jailbreak_guardrail" }, { reply: "", events: [], tripwire: "jailbreak_guardrail" })).toEqual([]);
  });
});

describe("panel selectors", () => {
  it("tracks the active agent through a handoff", () => {
    const events = [ev({ kind: "agent_active", agent: "Triage Agent" }), ev({ kind: "handoff", from: "Triage Agent", to: "FAQ Agent" })];
    expect(currentAgent(events)).toBe("FAQ Agent");
  });

  it("keeps the latest result per guardrail of the last turn", () => {
    const g = (passed: boolean) => ev({ kind: "guardrail", stage: "input", name: "jailbreak_guardrail", passed, reasoning: "" });
    const events = [ev({ kind: "trace", traceId: "t", url: "" }), g(true), ev({ kind: "trace", traceId: "t", url: "" }), g(false)];
    expect(latestGuardrails(events).map((x) => x.passed)).toEqual([false]);
  });

  it("marks an approval as decided", () => {
    const approval = { approvalId: "a1", threadId: "t", toolName: "create_refund", args: {}, customerId: "c", customerName: "C", agent: "A", summary: "s" };
    const events = [ev({ kind: "approval_request", approval })];
    expect(approvalsOf(events)[0].status).toBe("pending");
    events.push(ev({ kind: "approval_decision", approvalId: "a1", toolName: "create_refund", approved: true }));
    expect(approvalsOf(events)[0].status).toBe("approved");
  });
});
