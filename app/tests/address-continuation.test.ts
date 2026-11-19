/**
 * An address change in progress is continued by the Orders agent, never by a forced tool: the customer can
 * still change topic, stop or ask for a person. Real tools and turn code; only the model is replaced.
 */
import { Model, Runner, RunContext, Usage, type ModelResponse } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentForRequest } from "@/lib/agents/requested-action";
import { triageAgent } from "@/lib/agents";
import { findOpenTicketForThread, resetDemoData } from "@/lib/data/store";
import { clearEventLog, emitAgentEvent } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { updateAddressChange } from "@/lib/tools/address";
import type { SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

const empty = { orderId: null, street: null, city: null, postalCode: null, country: null };
beforeEach(() => { resetDemoData(); clearEventLog(); model.run.mockReset(); });

/** Turn 1 of address-change-confirm: the customer only names the order, so the stored draft is incomplete. */
async function midAddressChange(message: string) {
  const thread = createThread("c-james");
  const ctx: SupportContext = { ...sessionContextOf(thread), customerMessage: "" };
  await updateAddressChange.invoke(new RunContext(ctx), JSON.stringify({ ...empty, orderId: "1004" }));
  return { thread, ctx: { ...ctx, customerMessage: message } };
}

/** An unforced model: it asserts that no toolChoice was set, then makes the call a model would make. */
function unforcedModel(args: object): Model {
  let calls = 0;
  return {
    async getResponse(request): Promise<ModelResponse> {
      calls++;
      expect(request.modelSettings.toolChoice).toBeUndefined();
      const output = calls === 1
        ? [{ type: "function_call" as const, callId: "addr", name: "update_address_change", arguments: JSON.stringify(args) }]
        : [{ type: "message" as const, role: "assistant" as const, status: "completed" as const, content: [{ type: "output_text" as const, text: "Please confirm with the button." }] }];
      return { usage: new Usage(), output };
    },
    getStreamedResponse() { throw new Error("No streaming in this test"); },
  };
}

describe("address change continuation", () => {
  it("a street in a separate message, without the order number, still ends in a proposal", async () => {
    const { thread, ctx } = await midAddressChange("The new street is 22 Elm Street, Manchester, M1 4BT.");
    const selected = agentForRequest(ctx);
    expect(selected).not.toBe(triageAgent);
    expect(selected.modelSettings.toolChoice).toBeUndefined();
    const instructions = await selected.getSystemPrompt(new RunContext(ctx));
    expect(instructions).toContain("Address change in progress");
    expect(instructions).toContain("Order #1004");
    expect(instructions).toContain("street and number");
    const agent = selected.clone({ inputGuardrails: [], outputGuardrails: [] });
    const fields = { ...empty, street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" };
    const offline = unforcedModel(fields);
    const runner = new Runner({ tracingDisabled: true, modelProvider: { getModel: () => offline } });
    await runner.run(agent, ctx.customerMessage!, { context: ctx });
    expect(thread.pendingAddress).toMatchObject({ orderId: "1004", newAddress: { street: "22 Elm Street", city: "Manchester" } });
  });

  it.each([
    "Where is my parcel?", "Stop", "Anuluj", "Abbrechen", "No thanks", "My wardrobe arrived damaged.", "What is your return policy?",
  ])("does not trap the customer: %s reaches an agent that can answer or escalate, with no forced tool", async (message) => {
    const selected = agentForRequest((await midAddressChange(message)).ctx);
    expect(selected.modelSettings.toolChoice).toBeUndefined();
    expect(selected.tools.map((tool) => tool.name)).toContain("escalate_to_human");
  });

  it("does not route anything to the Orders agent when no address change is in progress", () => {
    expect(agentForRequest({ ...sessionContextOf(createThread("c-james")), customerMessage: "The city is Manchester." })).toBe(triageAgent);
  });
});

describe("the stored address draft is dropped when the customer leaves the flow", () => {
  it("an explicit request for a person is handled by code before any routing, and drops the draft", async () => {
    const { thread, ctx } = await midAddressChange("Please talk to a human");
    thread.memory.addressDraft = { orderId: "1004" };
    await handleUserMessage(ctx, "Please talk to a human");
    expect(model.run).not.toHaveBeenCalled();
    expect(findOpenTicketForThread(thread.threadId)).toMatchObject({ source: "rule", reason: "human_requested" });
    expect(thread.memory.addressDraft).toBeUndefined();
  });

  it("a refused order clears the draft in the tool itself", async () => {
    const thread = createThread("c-anna");
    const ctx: SupportContext = { ...sessionContextOf(thread), addressDraft: { orderId: "1004" } };
    const raw = await updateAddressChange.invoke(new RunContext(ctx), JSON.stringify({ ...empty, orderId: "1001" }));
    expect(raw).toContain("REFUSED");
    expect(ctx.addressDraft).toBeUndefined();
  });

  it("the Cancel click drops it", async () => {
    const thread = createThread("c-james");
    const ctx = sessionContextOf(thread);
    await updateAddressChange.invoke(new RunContext(ctx), JSON.stringify({ ...empty, orderId: "1004", street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" }));
    const proposal = thread.pendingAddress!;
    thread.memory.addressDraft = { orderId: "1004" };
    await handleUserMessage(ctx, "(click: cancel address change)", { type: "address", orderId: proposal.orderId, proposalId: proposal.proposalId, decision: "cancel" });
    expect(thread.pendingAddress).toBeUndefined();
    expect(thread.memory.addressDraft).toBeUndefined();
  });

  it.each([
    ["escalates through the tool", "escalate_to_human", false],
    ["starts a claim", "update_claim", false],
    ["keeps collecting the address", "update_address_change", true],
  ])("a turn where the agent %s", async (_name, tool, kept) => {
    const thread = createThread("c-james");
    thread.memory.addressDraft = { orderId: "1004" };
    model.run.mockImplementationOnce(async (_input, ctx: SupportContext) => {
      emitAgentEvent(ctx.threadId, { kind: "tool_call", agent: "Orders & Refunds Agent", tool, args: {} });
      return { reply: "Handled.", approvals: [], context: { addressDraft: { orderId: "1004" } } };
    });
    await handleUserMessage(sessionContextOf(thread), "Something else, please.");
    expect(thread.memory.addressDraft !== undefined).toBe(kept);
  });
});
