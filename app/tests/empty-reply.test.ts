/**
 * A run that ends with no text gets a fixed system line built from THIS turn's tool output only.
 * Real tool, real observer, real turn; only the model run is replaced.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, expect, it, vi } from "vitest";
import { resetDemoData } from "@/lib/data/store";
import { emptyReplyText, fillEmptyReply } from "@/lib/runtime/empty-reply";
import { clearEventLog, emitAgentEvent } from "@/lib/runtime/event-bus";
import { observeRun } from "@/lib/runtime/run-observer";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { updateAddressChange } from "@/lib/tools/address";
import { unwrapData } from "@/lib/tools/helpers";
import type { SupportContext } from "@/lib/types";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");

const empty = { orderId: null, street: null, city: null, postalCode: null, country: null };
const full = { ...empty, orderId: "1004", street: "22 Elm Street", city: "Manchester", postalCode: "M1 4BT" };
beforeEach(() => { resetDemoData(); clearEventLog(); model.run.mockReset(); });

/** Calls the real tool and publishes its output the way the SDK stream does (translate-events unwraps the data). */
async function addressCall(ctx: SupportContext, args: object): Promise<void> {
  const raw = await updateAddressChange.invoke(new RunContext(ctx), JSON.stringify(args));
  emitAgentEvent(ctx.threadId, { kind: "tool_output", agent: "Orders & Refunds Agent", tool: "update_address_change", result: unwrapData(raw) });
}
const observeTurn = async (ctx: SupportContext, args?: object) => {
  const stop = observeRun(ctx.threadId);
  if (args) await addressCall(ctx, args);
  return stop();
};
const blank = { reply: "", approvals: [] };

it("announces the confirmation card only when this turn created the proposal, in the customer's language", async () => {
  const thread = createThread("c-james");
  const ctx = sessionContextOf(thread);
  const observed = await observeTurn(ctx, full);
  expect(thread.pendingAddress).toBeDefined();
  expect(emptyReplyText(ctx, observed)).toContain("Confirm button");
  expect(emptyReplyText({ ...ctx, language: "pl" }, observed)).toContain("Potwierdź");
  expect(emptyReplyText({ ...ctx, language: "de" }, observed)).toContain("Bestätigen");
  // Next turn the card is old news: the observation of a turn without an address result never mentions it.
  const later = await observeTurn(ctx);
  expect(later.addressResult).toBeUndefined();
  expect(emptyReplyText(ctx, later)).toBe("I could not prepare an answer. Please send your message again.");
});

it("explains a refusal of this turn in the customer's language, with the real policy reason", async () => {
  const thread = createThread("c-anna");
  const ctx = { ...sessionContextOf(thread), language: "pl" };
  const observed = await observeTurn(ctx, { ...empty, orderId: "1001" });
  expect(observed.addressResult).toMatchObject({ status: "REFUSED", code: "ORDER_DELIVERED" });
  const text = emptyReplyText(ctx, observed);
  expect(text).toContain("dostarczone");
  expect(text).not.toContain("Potwierdź");
});

it("leaves a real answer, an approval pause, a tripwire and a failure alone, and records the system line in history", async () => {
  const thread = createThread("c-james");
  const ctx = sessionContextOf(thread);
  const observed = await observeTurn(ctx);
  for (const outcome of [{ reply: "Real answer.", approvals: [] }, { ...blank, approvals: [{} as never] }, { ...blank, tripwire: "x" }, { ...blank, failed: "boom" }]) {
    expect(fillEmptyReply(thread, ctx, "hi", outcome, observed)).toBe(outcome);
  }
  expect(thread.history).toHaveLength(0);
  const filled = fillEmptyReply(thread, ctx, "hi", blank, observed);
  expect(filled).toMatchObject({ reply: expect.stringContaining("could not prepare"), sender: { kind: "system", title: "Automatic reply" } });
  expect(thread.history).toHaveLength(2);
});

it("delivers the system line through a whole turn when the model returns no text", async () => {
  const thread = createThread("c-james");
  model.run.mockImplementationOnce(async (_input, ctx: SupportContext) => {
    await addressCall(ctx, full);
    return blank;
  });
  const outcome = await handleUserMessage(sessionContextOf(thread), "The new street is 22 Elm Street, Manchester, M1 4BT for order 1004.");
  expect(outcome.reply).toContain("Confirm button");
  expect(thread.transcript.at(-1)).toMatchObject({ role: "system", sender: { kind: "system", title: "Automatic reply" } });
});

const PROMISE = "I will check the delivery address for your order #1004. Please wait a moment while I retrieve this information.";

it.each([
  ["English", PROMISE],
  ["Polish", "Sprawdzę adres dostawy zamówienia 1004. Chwileczkę."],
  ["German", "Einen Moment bitte, ich prüfe die Lieferadresse."],
])("replaces a %s promise to look something up when no tool ran in the turn", async (_name, promise) => {
  const thread = createThread("c-james");
  const ctx = sessionContextOf(thread);
  const observed = await observeTurn(ctx);
  const filled = fillEmptyReply(thread, ctx, "What is my delivery address for 1004?", { reply: promise, approvals: [], history: [] }, observed);
  expect(filled.reply).toBe("I could not prepare an answer. Please send your message again.");
  expect(filled).toMatchObject({ history: undefined, sender: { kind: "system", title: "Automatic reply" } });
});

it("keeps the same words when a tool did run, and ordinary answers that merely say 'let me know'", async () => {
  const thread = createThread("c-james");
  const ctx = sessionContextOf(thread);
  const quiet = await observeTurn(ctx);
  const withTool = { ...quiet, tools: ["get_order"] };
  const promise = { reply: PROMISE, approvals: [] };
  expect(fillEmptyReply(thread, ctx, "hi", promise, withTool)).toBe(promise);
  const answer = { reply: "Order 1004 goes to 14 Baker Lane. Let me know if you need anything else.", approvals: [] };
  expect(fillEmptyReply(thread, ctx, "hi", answer, quiet)).toBe(answer);
});

it("a whole turn that ends in a dead promise delivers the system line and keeps the promise out of history", async () => {
  const thread = createThread("c-james");
  model.run.mockImplementationOnce(async () => ({ reply: PROMISE, approvals: [], history: [{ role: "assistant", status: "completed", content: [{ type: "output_text", text: PROMISE }] }] }));
  const outcome = await handleUserMessage(sessionContextOf(thread), "What is my delivery address for 1004?");
  expect(outcome.reply).toBe("I could not prepare an answer. Please send your message again.");
  expect(thread.transcript.at(-1)).toMatchObject({ role: "system", sender: { kind: "system", title: "Automatic reply" } });
  expect(JSON.stringify(thread.history)).not.toContain("wait a moment");
});
