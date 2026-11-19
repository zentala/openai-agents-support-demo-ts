/**
 * Escalation records a queue entry, not an outbound call, contact promise or takeover.
 * Real tool and deterministic turn tests check exactly what the customer can do next.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { listTickets, resetDemoData } from "@/lib/data/store";
import { clearEventLog } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { addTranscript, createThread } from "@/lib/runtime/threads";
import { escalateToHuman } from "@/lib/tools/kb-and-escalation";
import { createRefund } from "@/lib/tools/refund";
import { unwrapData } from "@/lib/tools/helpers";
import type { SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const actionClassifier = vi.hoisted(() => ({ run: vi.fn(async (text: string) => {
  if (text.includes("I can connect you with a consultant")) return [{ type: "escalation" as const, stance: "offer" as const, recipient_named: null }];
  if (text.includes("delivery ticket is open")) return [{ type: "escalation" as const, stance: "done" as const, recipient_named: null }];
  return [];
}) }));
vi.mock("@/lib/guardrails/action-claims", async () => ({
  ...(await vi.importActual<typeof import("@/lib/guardrails/action-claims")>("@/lib/guardrails/action-claims")),
  classifyActionClaims: actionClassifier.run,
}));
const { handleUserMessage } = await import("@/lib/runtime/turn");

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  model.run.mockReset();
});

describe("escalation next action", () => {
  it("the tool tells the model the real next action for new and already-open tickets", async () => {
    const thread = createThread("c-james");
    const run = new RunContext(sessionContextOf(thread));
    const first = unwrapData(await escalateToHuman.invoke(run, '{"summary":"Missing policy answer"}'));
    expect(first).toMatchObject({
      status: "TICKET_CREATED", queueStatus: "waiting_for_consultant",
      nextStep: "A consultant can take over this conversation and reply here. You can keep this chat open.",
      outboundContactScheduled: false, responseTime: null,
    });
    const again = unwrapData(await escalateToHuman.invoke(run, '{"summary":"Still unresolved"}'));
    expect(again).toMatchObject({ ...(first as object), status: "TICKET_ALREADY_OPEN" });
    expect(listTickets()).toHaveLength(1);
    expect(thread.takeover.status).toBe("agent");
  });

  it("adds owned delivery facts to a delivery-dispute ticket", async () => {
    const thread = createThread("c-anna");
    const context = { ...sessionContextOf(thread), activeOrderId: "1003" };
    const result = unwrapData(await escalateToHuman.invoke(new RunContext(context), JSON.stringify({
      summary: "Customer says the delivery did not arrive.", category: "delivery_dispute",
    })));
    expect(result).toMatchObject({ status: "TICKET_CREATED" });
    expect(listTickets()[0]).toMatchObject({ category: "delivery_dispute", reason: "delivery_dispute" });
    expect(listTickets()[0].summary).toContain("#1003");
    expect(listTickets()[0].summary).toMatch(/delivered \d{4}-\d{2}-\d{2}/);
    expect(listTickets()[0].summary).toContain("ul. Piękna 12/4, Warszawa, 00-950");
  });

  it("requires customer agreement before opening a disputed-delivery ticket", async () => {
    const thread = createThread("c-anna");
    thread.memory.activeOrderId = "1003";
    addTranscript(thread, { role: "customer", text: "Order 1003 says delivered but I did not receive it." });
    const base = sessionContextOf(thread);
    const refused = unwrapData(await escalateToHuman.invoke(new RunContext({ ...base, customerMessage: "I insist, refund it now." }),
      JSON.stringify({ summary: "Customer asks for a refund." })));
    expect(refused).toMatchObject({ status: "CONSULTANT_CONSENT_REQUIRED" });
    expect(listTickets()).toHaveLength(0);
    const accepted = unwrapData(await escalateToHuman.invoke(new RunContext({ ...base, customerMessage: "Yes, please connect me with a consultant." }),
      JSON.stringify({ summary: "Customer agreed to consultant help." })));
    expect(accepted).toMatchObject({ status: "TICKET_CREATED" });
    expect(listTickets()[0]).toMatchObject({ reason: "delivery_dispute", category: "delivery_dispute" });
    expect(listTickets()[0].summary).toContain("#1003");
  });

  it("uses a plain yes after a classified consultant offer to open a tool-owned ticket", async () => {
    const thread = createThread("c-anna");
    thread.memory.activeOrderId = "1003";
    const context = sessionContextOf(thread);
    model.run.mockImplementationOnce(async () => ({ reply: "I can connect you with a consultant if you want.", approvals: [] }));
    await handleUserMessage(context, "Order 1003 is marked delivered, but I did not receive it.");
    expect(thread.consultantOffered).toBe(true);

    model.run.mockImplementationOnce(async (_input: unknown, runContext: SupportContext) => {
      const result = unwrapData(await escalateToHuman.invoke(new RunContext(runContext), JSON.stringify({
        summary: "Customer agreed to help.", category: "delivery_dispute",
      })));
      expect(result).toMatchObject({ status: "TICKET_CREATED" });
      return { reply: "A delivery ticket is open.", approvals: [] };
    });
    await handleUserMessage(context, "yes");
    expect(thread.customerAgreedToConsultant).toBe(true);
    expect(listTickets()).toMatchObject([{ source: "agent", reason: "delivery_dispute", category: "delivery_dispute" }]);
  });

  it("rejects a refund when a not-received dispute was stated earlier in the same thread", async () => {
    const thread = createThread("c-anna");
    thread.memory.activeOrderId = "1003";
    addTranscript(thread, { role: "customer", text: "Order 1003 is marked delivered, but I did not receive it." });
    const result = unwrapData(await createRefund.invoke(new RunContext({ ...sessionContextOf(thread), activeOrderId: "1003" }), JSON.stringify({
      orderId: "1003", amount: 890, reason: "Customer requests a refund.",
    })));
    expect(result).toMatchObject({ status: "REFUSED", code: "DELIVERY_DISPUTE_NEEDS_HUMAN" });
  });

  it("preserves the delivery-dispute category on an explicit human-request rule path", async () => {
    const thread = createThread("c-anna");
    thread.memory.activeOrderId = "1003";
    addTranscript(thread, { role: "customer", text: "Order 1003 says delivered but I never received it." });
    const outcome = await handleUserMessage(sessionContextOf(thread), "Please connect me with a human.");
    expect(outcome.reply).toContain("zgłoszenie T-");
    expect(listTickets()[0]).toMatchObject({ reason: "delivery_dispute", category: "delivery_dispute" });
    expect(listTickets()[0].summary).toContain("#1003");
  });

  it.each([
    ["en", "A consultant can take over this conversation and reply here. You can keep this chat open."],
    ["pl", "Konsultant może przejąć tę rozmowę i odpowiedzieć tutaj. Możesz zostawić ten czat otwarty."],
    ["de", "Ein Mitarbeiter kann dieses Gespräch übernehmen und hier antworten. Sie können diesen Chat geöffnet lassen."],
  ])("the actual rule reply and transcript explain the next step in %s, without contact promises", async (language, nextStep) => {
    const thread = createThread("c-james");
    const ctx = { ...sessionContextOf(thread), language };
    for (let turn = 0; turn < 2; turn++) {
      const outcome = await handleUserMessage(ctx, "I want to talk to a human.");
      expect(outcome.reply).toContain(nextStep);
      expect(outcome.reply).not.toMatch(/will contact|will get back|as soon|e-?mail|phone|Skontaktuje|Odezwie|meldet sich/i);
      expect(thread.transcript.at(-1)).toMatchObject({ role: "system", text: outcome.reply });
    }
    expect(listTickets()).toHaveLength(1);
    expect(thread.takeover.status).toBe("agent");
    expect(model.run).not.toHaveBeenCalled();
  });
});
