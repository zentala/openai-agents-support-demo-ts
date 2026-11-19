/** finishTurn classifies the exact outgoing customer channel and fails closed on unsupported claims. */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { finishTurn } from "@/lib/runtime/turn-finish";
import { clearEventLog, readEventLog } from "@/lib/runtime/event-bus";
import { openTicket } from "@/lib/runtime/tickets";
import { withSecureFormNotice } from "@/lib/runtime/secure-form-notice";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/model-access", () => ({ createRequestRunner: () => ({ run: model.run }) }));

const thread = createThread;
let current: ReturnType<typeof createThread>;
const result = (claims: unknown[]) => ({ finalOutput: { claims } });
const claim = (type: string, stance = "done", recipient_named: string | null = null) => ({ type, stance, recipient_named });
const observed = { tools: [], toolErrors: 0, toolResults: {} };
const outcome = (reply: string, messages?: { text: string; sender: { kind: "ai" | "system" } }[]) => ({ reply, approvals: [], ...(messages ? { messages } : {}) });
const context = () => ({ ...sessionContextOf(current), language: "en" });

beforeEach(() => {
  current = thread("c-anna");
  clearEventLog();
  model.run.mockReset().mockResolvedValue(result([]));
});
afterEach(() => { removeThread(current.threadId); clearEventLog(); });

describe("finishTurn action claim guard", () => {
  it("blocks an unbacked present/future escalation claim", async () => {
    model.run.mockResolvedValue(result([claim("escalation", "will_happen")]));
    const final = await finishTurn(current, context(), outcome("A consultant will contact you shortly."), observed, "request");
    expect(final.reply).toContain("I have not forwarded this yet");
    expect(final.messages).toHaveLength(1);
    expect(readEventLog().some(({ event }) => event.kind === "unbacked_claim_blocked" && event.claimType === "escalation")).toBe(true);
  });

  it("passes an escalation claim only with an open ticket for this thread", async () => {
    openTicket({ threadId: current.threadId, customerId: current.customerId, traceId: current.traceId, source: "agent", reason: "customer_request", summary: "Help requested" });
    model.run.mockResolvedValue(result([claim("escalation", "done")]));
    const final = await finishTurn(current, context(), outcome("Your case is in the consultant queue."), observed, "request");
    expect(final.reply).toContain("consultant queue");
  });

  it("backs a report with its successfully filed claim result", async () => {
    model.run.mockResolvedValue(result([claim("report")]));
    const final = await finishTurn(current, context(), outcome("Your damage report has been filed."), {
      ...observed, toolResults: { submit_claim: [{ status: "CLAIM_CREATED" }] },
    }, "request");
    expect(final.reply).toContain("report has been filed");
  });

  it("backs a paid-refund statement with the tool's paid status", async () => {
    model.run.mockResolvedValue(result([claim("refund")]));
    const final = await finishTurn(current, context(), outcome("Your refund has already been paid."), {
      ...observed, toolResults: { cancel_refund: [{ status: "REFUSED", code: "REFUND_ALREADY_PAID" }] },
    }, "request");
    expect(final.reply).toContain("already been paid");
  });

  it("blocks a named recipient absent from thread state even when a ticket exists", async () => {
    openTicket({ threadId: current.threadId, customerId: current.customerId, traceId: current.traceId, source: "agent", reason: "customer_request", summary: "Help requested" });
    model.run.mockResolvedValue(result([claim("escalation", "done", "the right team")]));
    const final = await finishTurn(current, context(), outcome("I forwarded this to the right team."), observed, "request");
    expect(final.reply).toContain("I have not forwarded this yet");
  });

  it("passes offers and records a consultant offer for the next turn", async () => {
    model.run.mockResolvedValue(result([claim("escalation", "offer")]));
    const final = await finishTurn(current, context(), outcome("I can connect you with a consultant if you want."), observed, "request");
    expect(final.reply).toContain("if you want");
    expect(current.consultantOffered).toBe(true);
  });

  it("passes explicitly negated action claims", async () => {
    model.run.mockResolvedValue(result([claim("refund", "negated")]));
    const final = await finishTurn(current, context(), outcome("Your refund was not approved."), observed, "request");
    expect(final.reply).toContain("not approved");
  });

  it("blocks a mixed reply when any one of its claims is unbacked", async () => {
    openTicket({ threadId: current.threadId, customerId: current.customerId, traceId: current.traceId, source: "agent", reason: "customer_request", summary: "Help requested" });
    model.run.mockResolvedValue(result([claim("escalation"), claim("refund")]));
    const final = await finishTurn(current, context(), outcome("I forwarded this and started your refund."), {
      ...observed, toolResults: { escalate_to_human: [{ status: "TICKET_CREATED" }] },
    }, "request");
    expect(final.reply).toContain("refund was approved");
  });

  it("preserves a code-generated human-passed notice when the model claim is blocked", async () => {
    current.signals.guardrailTrips = 2;
    model.run.mockResolvedValue(result([claim("refund")]));
    const final = await finishTurn(current, context(), outcome("Your refund was approved.", [
      { text: "Your refund was approved.", sender: { kind: "ai" } },
    ]), observed, "request");
    expect(final.messages?.map(({ text, sender }) => [text, sender.kind, sender.title])).toEqual([
      ["Sorry, I can't confirm that a refund was approved.", "system", "Unbacked claim blocked"],
      [expect.stringContaining("consultant queue"), "system", "Passed to a human"],
    ]);
  });

  it("checks the model reply carried in messages on the secure-form notice path", async () => {
    model.run.mockImplementation(async (_agent, text: string) => result(text.includes("consultant will contact") ? [claim("escalation", "will_happen")] : []));
    const ctx = context();
    const withNotice = withSecureFormNotice(ctx, outcome("A consultant will contact you shortly.", [
      { text: "A consultant will contact you shortly.", sender: { kind: "ai" } },
    ]), { iban: 1, phone: 0 }, []);
    const final = await finishTurn(current, ctx, withNotice, observed, "request");
    expect(final.reply).toContain("I have not forwarded this yet");
    expect(final.reply).not.toContain("secure form below");
  });

  it("blocks with a visible error when the classifier fails", async () => {
    model.run.mockRejectedValue(new Error("classifier offline"));
    const final = await finishTurn(current, context(), outcome("Your case is forwarded."), observed, "request");
    expect(final.reply).toContain("I can't verify that action right now");
    expect(readEventLog().some(({ event }) => event.kind === "error" && event.errorType === "ActionClaimClassifierError")).toBe(true);
  });
});
