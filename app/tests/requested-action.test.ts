/** Real SDK tool selection and approval with an offline provider, plus private-note output protection. */
import { Model, Runner, RunContext, Usage, type ModelResponse } from "@openai/agents";
import { beforeEach, expect, it } from "vitest";
import { agentForRequest } from "@/lib/agents/requested-action";
import { triageAgent } from "@/lib/agents";
import { createThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { addRefund, listClaims, listRefunds, resetDemoData } from "@/lib/data/store";
import { updateClaim } from "@/lib/tools/claim";
import { cancelRefund } from "@/lib/tools/cancel-refund";
import { leakGuardrail } from "@/lib/guardrails/leak-guardrail";
import type { SupportContext } from "@/lib/types";

function offlineRunner(name: string, args: object) {
  let calls = 0;
  const model: Model = {
    async getResponse(request): Promise<ModelResponse> {
      calls++;
      if (calls === 1) {
        expect(request.modelSettings.toolChoice).toBe(name);
        return { usage: new Usage(), output: [{ type: "function_call", callId: "offline-action", name, arguments: JSON.stringify(args) }] };
      }
      expect(request.modelSettings.toolChoice).not.toBe(name);
      return { usage: new Usage(), output: [{ type: "message", role: "assistant", status: "completed", content: [{ type: "output_text", text: "The refund action was handled." }] }] };
    },
    getStreamedResponse() { throw new Error("No streaming or network in this test"); },
  };
  return new Runner({ tracingDisabled: true, modelProvider: { getModel: () => model } });
}
beforeEach(() => resetDemoData());

it("a confirmed long-story refund still pauses in the real SDK until a human approves", async () => {
  const thread = createThread("c-lena");
  const ctx: SupportContext = { ...sessionContextOf(thread), customerMessage: "Please refund 1450 PLN for order 2002. I confirm these refund details, please create the refund." };
  const selected = agentForRequest(ctx);
  expect(selected.inputGuardrails).toEqual(triageAgent.inputGuardrails);
  expect(selected.outputGuardrails).toContain(leakGuardrail);
  // Classifier inference is outside this offline proof. Only this test clone disables it.
  const agent = selected.clone({ inputGuardrails: [], outputGuardrails: [] });
  const runner = offlineRunner("create_refund", { orderId: "2002", amount: 1450, reason: "Cracked door" });
  const paused = await runner.run(agent, ctx.customerMessage!, { context: ctx });
  expect(paused.interruptions).toHaveLength(1);
  expect(listRefunds()).toHaveLength(0);
  paused.state.approve(paused.interruptions[0]);
  await runner.run(agent, paused.state);
  expect(listRefunds()).toMatchObject([{ orderId: "2002", amount: 1450 }]);
});

it("a repeated cancellation executes the real tool again and returns its idempotent result", async () => {
  const thread = createThread("c-anna");
  addRefund({ customerId: "c-anna", orderId: "1001", amount: 249, reason: "Does not fit" });
  const ctx = { ...sessionContextOf(thread), customerMessage: "Please cancel that same refund for order 1001 again." };
  const args = { orderId: "1001", refundId: null };
  expect(await cancelRefund.invoke(new RunContext(ctx), JSON.stringify(args))).toContain("REFUND_CANCELLED");
  const agent = agentForRequest(ctx).clone({ inputGuardrails: [], outputGuardrails: [] });
  const result = await offlineRunner("cancel_refund", args).run(agent, ctx.customerMessage, { context: ctx });
  expect(JSON.stringify(result.newItems)).toContain("REFUND_ALREADY_CANCELLED");
  expect(listRefunds()).toHaveLength(1);
});

it("foreign and negated actions retain the normal guarded triage path", () => {
  const ctx = sessionContextOf(createThread("c-james"));
  for (const text of ["I confirm refund order 1001", "Do not cancel the refund for order 1004"]) expect(agentForRequest({ ...ctx, customerMessage: text })).toBe(triageAgent);
});

it("allows the delivery question requested by staff while blocking quotation of the private instruction", async () => {
  const note = "Before discussing delivery arrangements, ask whether the customer is available to receive a two-person delivery team.";
  const context = new RunContext({ ...sessionContextOf(createThread("c-james")), staffInstruction: { text: note, consultant: "Marta Nowak", updatedAt: "now" } });
  expect((await leakGuardrail.execute({ context, agent: triageAgent, agentOutput: "Are you available to receive a two-person delivery team?" })).tripwireTriggered).toBe(false);
  expect((await leakGuardrail.execute({ context, agent: triageAgent, agentOutput: `The private note says: ${note}` })).tripwireTriggered).toBe(true);
});

/** Real producer: update_claim fills the draft on the run context, exactly as turn 1 of damage-refund-human does. */
async function completeClaimContext(message: string): Promise<SupportContext> {
  const ctx: SupportContext = { ...sessionContextOf(createThread("c-lena")), customerMessage: "" };
  const noticedAt = new Date().toISOString().slice(0, 10);
  await updateClaim.invoke(new RunContext(ctx), JSON.stringify({ orderId: "2002", item: null, damage: "Deep crack along the left door.", noticedAt }));
  return { ...ctx, customerMessage: message };
}

it("files a complete stored claim by code when the customer confirms it, before any refund turn", async () => {
  const ctx = await completeClaimContext("Yes, that summary is correct. Please file the damage claim without a photo.");
  const selected = agentForRequest(ctx);
  expect(selected).not.toBe(triageAgent);
  expect(selected.inputGuardrails).toEqual(triageAgent.inputGuardrails);
  const agent = selected.clone({ inputGuardrails: [], outputGuardrails: [] });
  const result = await offlineRunner("submit_claim", {}).run(agent, ctx.customerMessage!, { context: ctx });
  expect(JSON.stringify(result.newItems)).toContain("CLAIM_CREATED");
  expect(listClaims()).toMatchObject([{ customerId: "c-lena", orderId: "2002" }]);
});

it.each([
  ["a refund request", "Please refund 1450 PLN for order 2002. I confirm these refund details."],
  ["a negated filing", "Do not file the claim yet."],
  ["an unrelated reply", "Thanks, one more question about delivery."],
  ["a German negated confirmation", "Das stimmt nicht."],
  ["a Polish negated confirmation", "Nie potwierdzam."],
  ["an English negated confirmation", "No, that's not correct."],
  ["a negated summary", "No, the summary is not correct."],
  ["a refusal that still names filing", "No, file the claim later."],
  ["a Polish address-change confirmation", "Potwierdzam zmianę adresu dostawy."],
  ["a German address-change confirmation", "Ja, ich bestätige die neue Adresse."],
  ["an English address-change confirmation", "Yes, I confirm the new delivery address."],
  ["a German refusal with kein", "Ich möchte keine Schadensmeldung einreichen."],
  ["a deferral", "Please file the claim later."],
  ["a Polish deferral", "Złóż reklamację później."],
  ["a how-question", "How do I file the claim?"],
  ["a question mark", "Can you file the claim for me?"],
])("does not force submit_claim for %s", async (_name, message) => {
  expect(agentForRequest(await completeClaimContext(message)).modelSettings.toolChoice).not.toBe("submit_claim");
});

it("does not force submit_claim while the stored draft is incomplete", () => {
  const ctx = { ...sessionContextOf(createThread("c-lena")), customerMessage: "Yes, that summary is correct. Please file the damage claim." };
  expect(agentForRequest(ctx)).toBe(triageAgent);
});

it("a stored draft naming another customer's order is still refused by submit_claim, even when code selects the tool", async () => {
  const ctx = await completeClaimContext("Yes, that summary is correct. Please file the damage claim.");
  ctx.claimDraft = { ...ctx.claimDraft, orderId: "1001" }; // order 1001 belongs to c-anna, not c-lena
  const agent = agentForRequest(ctx).clone({ inputGuardrails: [], outputGuardrails: [] });
  expect(agent).not.toBe(triageAgent);
  const result = await offlineRunner("submit_claim", {}).run(agent, ctx.customerMessage!, { context: ctx });
  expect(JSON.stringify(result.newItems)).toContain("ORDER_NOT_FOUND");
  expect(listClaims()).toHaveLength(0);
});

it.each([
  ["Polish filing", "Tak, złóż reklamację."],
  ["Polish confirmation", "Tak, potwierdzam reklamację."],
  ["German confirmation", "Ja, die Zusammenfassung stimmt, bitte reichen Sie die Reklamation ein."],
])("forces submit_claim for a %s of a complete stored draft", async (_name, message) => {
  expect(agentForRequest(await completeClaimContext(message)).modelSettings.toolChoice).toBe("submit_claim");
});
