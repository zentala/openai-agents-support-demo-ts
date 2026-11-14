/** Real tool offers and cookie-scoped chat clicks; inference alone is mocked, never refund/auth/turn rules. */
import { RunContext } from "@openai/agents";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/chat/route";
import { addRefund, listRefunds, listTickets, resetDemoData } from "@/lib/data/store";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { clearEventLog, currentTurnId, emitAgentEvent, readEventLog, withTurnEvents } from "@/lib/runtime/event-bus";
import { finishTurn } from "@/lib/runtime/turn-finish";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { offerEscalationChoices, offerReplyChoices } from "@/lib/tools/reply-choices";
import { createRefund } from "@/lib/tools/refund";
import { takeOver } from "@/lib/runtime/takeover";
import type { ReplyOfferInput } from "@/lib/runtime/quick-replies";
import { openTicket } from "@/lib/runtime/tickets";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
let thread: Thread;
let other: Thread;
const escalation: ReplyOfferInput = { kind: "escalation", orderId: null, amount: null, reason: null };
const refund: ReplyOfferInput = { kind: "refund", orderId: "1001", amount: 249, reason: "Does not fit" };
const cookie = (owner: Thread) => credentialSetCookie(owner.threadId, false).split(";")[0];
async function click(decision: "yes" | "no", offerId = thread.pendingQuickReply!.id, owner = thread) {
  const response = await POST(new Request("https://demo.example/api/chat", { method: "POST",
    headers: { "Content-Type": "application/json", cookie: cookie(owner) },
    body: JSON.stringify({ threadId: thread.threadId, selection: { type: "quick-reply", offerId, decision },
      messages: [{ role: "user", parts: [{ type: "text", text: "Client cannot replace stored refund details: 99999 for 1004" }] }] }) }));
  return { status: response.status, body: await response.text() };
}
async function offer(input = escalation, extra = {}) {
  model.run.mockImplementationOnce(async (_input, ctx) => {
    expect(await offerReplyChoices.invoke(new RunContext(ctx), JSON.stringify(input))).toContain('"ok": true');
    return { reply: "Please choose how to continue.", approvals: [], ...extra };
  });
  return handleUserMessage(sessionContextOf(thread), "Help with my order");
}
beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "true"); vi.stubEnv("SESSION_SECRET", "synthetic-quick-reply-secret");
  resetDemoData(); clearEventLog();
  thread = createThread("c-anna"); other = createThread("c-anna");
  model.run.mockReset().mockResolvedValue({ reply: "Ordinary reply.", approvals: [] });
});
afterEach(() => { removeThread(thread.threadId); removeThread(other.threadId); resetDemoData(); clearEventLog(); vi.unstubAllEnvs(); });

it("publishes a structured localized offer only after a successful answer, without creating a ticket", async () => {
  await offer();
  expect(thread.pendingQuickReply?.widget).toMatchObject({ threadId: thread.threadId, yes: "Tak, poproszę", no: "Nie, dziękuję" });
  expect(readEventLog().find(({ event }) => event.kind === "widget")?.event).toMatchObject({ kind: "widget", widget: { type: "quick-replies" } });
  expect(listTickets()).toHaveLength(0); expect(listRefunds()).toHaveLength(0);
});
it.each([escalation, refund])("declining %j consumes the offer without model work or business effects", async (input) => {
  await offer(input);
  const before = model.run.mock.calls.length;
  const result = await click("no");
  expect(result.status).toBe(200); expect(result.body).toContain("nie będę kontynuować");
  expect(model.run).toHaveBeenCalledTimes(before);
  expect(thread.pendingQuickReply).toBeUndefined(); expect(listTickets()).toHaveLength(0); expect(listRefunds()).toHaveLength(0);
});
it("accepting escalation uses the existing explicit-person rule exactly once, ignoring client text", async () => {
  await offer(); const id = thread.pendingQuickReply!.id;
  const before = model.run.mock.calls.length;
  expect((await click("yes", id)).status).toBe(200);
  expect(listTickets()).toHaveLength(1); expect(model.run).toHaveBeenCalledTimes(before);
  expect((await click("yes", id)).body).toContain("no longer current");
  expect(listTickets()).toHaveLength(1);
});
it("accepting a refund supplies only stored owned details to the normal run and preserves tool validation", async () => {
  await offer(refund);
  model.run.mockImplementationOnce(async (input, ctx) => {
    const text = JSON.stringify(input);
    expect(text).toContain("249 PLN"); expect(text).toContain("#1001"); expect(text).not.toContain("99999");
    expect(await createRefund.invoke(new RunContext(ctx), JSON.stringify(refund))).toContain("REFUND_CREATED");
    return { reply: "Refund created.", approvals: [] };
  });
  expect((await click("yes")).status).toBe(200);
  expect(listRefunds()).toMatchObject([{ customerId: "c-anna", orderId: "1001", amount: 249 }]);
});
it("refund confirmation cannot move past newly invalid policy state or make a guest/foreign offer", async () => {
  await offer(refund);
  thread.pendingQuickReply!.refund!.orderId = "1004"; // Corrupted stored proposal must be checked again.
  const calls = model.run.mock.calls.length;
  expect((await click("yes")).body).toContain("No such order");
  expect(model.run).toHaveBeenCalledTimes(calls); expect(listRefunds()).toHaveLength(0);
  for (const customerId of ["guest", "c-james"]) {
    thread.customerId = customerId;
    thread.latestTurnId = crypto.randomUUID();
    const result = await withTurnEvents(thread.threadId, thread.latestTurnId, () => offerReplyChoices.invoke(new RunContext(sessionContextOf(thread)), JSON.stringify(refund)));
    expect(result).toMatch(/NOT_VERIFIED|No such order/);
    expect(thread.pendingQuickReply).toBeUndefined();
  }
});
it("a refund created after the offer makes confirmation refuse without another run or duplicate refund", async () => {
  await offer(refund);
  addRefund({ customerId: thread.customerId, orderId: "1001", amount: 249, reason: "Already handled" });
  const before = model.run.mock.calls.length;
  expect((await click("yes")).body).toContain("higher than the refundable value");
  expect(model.run).toHaveBeenCalledTimes(before); expect(listRefunds()).toHaveLength(1);
});
it("a different same-customer cookie cannot click, consume or rewrite this offer", async () => {
  await offer(); const id = thread.pendingQuickReply!.id;
  expect((await click("yes", id, other)).status).toBe(403);
  expect(thread.pendingQuickReply?.id).toBe(id); expect(listTickets()).toHaveLength(0);
});
it("another message, another thread, a newer offer or takeover invalidates stale choices", async () => {
  await offer(); const old = thread.pendingQuickReply!.id;
  await handleUserMessage(sessionContextOf(thread), "Different question");
  expect((await click("yes", old)).body).toContain("no longer current");
  await offer(); const next = thread.pendingQuickReply!.id;
  await offer();
  expect(thread.pendingQuickReply!.id).not.toBe(next);
  expect((await click("yes", next)).body).toContain("no longer current");
  await offer(); const beforeTakeover = thread.pendingQuickReply!.id;
  takeOver(thread.threadId, "Marta Nowak");
  expect((await click("yes", beforeTakeover)).body).toContain("no longer current");
  expect(other.pendingQuickReply).toBeUndefined(); expect(listTickets()).toHaveLength(0);
});
it.each([{ tripwire: "leak" }, { failed: "ProviderFailure" }, { approvals: [{}] }])("suppresses choices after an unsuccessful final outcome %j", async (extra) => {
  await offer(escalation, extra);
  expect(thread.pendingQuickReply).toBeUndefined();
  expect(readEventLog().some(({ event }) => event.kind === "widget")).toBe(false);
});
it("an older resumed run cannot replace the current turn's offer; valid pushed replies retain their widget", async () => {
  await offer(); const firstTurn = thread.latestTurnId!;
  await offer(); const current = thread.pendingQuickReply!.id;
  await withTurnEvents(thread.threadId, firstTurn, async () => {
    expect(await offerReplyChoices.invoke(new RunContext(sessionContextOf(thread)), JSON.stringify(escalation))).toContain("no longer current");
    finishTurn(thread, sessionContextOf(thread), { reply: "Old resumed answer", approvals: [] }, { tools: [], toolErrors: 0 }, "push");
  });
  expect(thread.pendingQuickReply?.id).toBe(current);
  withTurnEvents(thread.threadId, thread.latestTurnId, () => finishTurn(thread, sessionContextOf(thread), { reply: "Current pushed answer", approvals: [] }, { tools: [], toolErrors: 0 }, "push"));
  expect(readEventLog().at(-1)?.event).toMatchObject({ kind: "chat_message", quickReplies: { offerId: current } });
});
it("FAQ/Triage choices cannot reveal refund details or perform any refund", async () => {
  await offer();
  const result = await withTurnEvents(thread.threadId, currentTurnId(thread.threadId), () => offerEscalationChoices.invoke(new RunContext(sessionContextOf(thread)), JSON.stringify(refund)));
  expect(result).toContain("Only the Orders agent"); expect(result).not.toContain("Oslo"); expect(listRefunds()).toHaveLength(0);
});
it.each([escalation, refund])("automatic error-limit escalation suppresses the earlier offer %j", async (input) => {
  model.run.mockImplementationOnce(async (_input, ctx) => {
    expect(await offerReplyChoices.invoke(new RunContext(ctx), JSON.stringify(input))).toContain('"ok": true');
    for (let i = 0; i < 2; i++) emitAgentEvent(thread.threadId, { kind: "error", where: "tool search_kb", errorType: "SyntheticToolFailure", message: "Offline failure fixture" });
    return { reply: "I could not finish this request.", approvals: [] };
  });
  const result = await handleUserMessage(sessionContextOf(thread), "Please help with this request");
  expect(result.reply).toMatch(/T-\d+/);
  expect(listTickets()).toMatchObject([{ threadId: thread.threadId, source: "rule", reason: "tool_errors" }]);
  expect(thread.pendingQuickReply).toBeUndefined(); expect(listRefunds()).toHaveLength(0);
  expect(readEventLog().some(({ event }) => event.kind === "widget" && event.widget.type === "quick-replies")).toBe(false);
});
it("an already open ticket rejects escalation offers and an escalation click after independent escalation", async () => {
  await offer(); const id = thread.pendingQuickReply!.id;
  openTicket({ threadId: thread.threadId, customerId: thread.customerId, traceId: thread.traceId, source: "rule", reason: "tool_errors", summary: "Existing escalation" });
  const before = model.run.mock.calls.length;
  expect((await click("yes", id)).body).toContain("no longer current");
  expect(model.run).toHaveBeenCalledTimes(before); expect(listTickets()).toHaveLength(1);
  const result = await withTurnEvents(thread.threadId, thread.latestTurnId, () => offerReplyChoices.invoke(new RunContext(sessionContextOf(thread)), JSON.stringify(escalation)));
  expect(result).toContain("ticket is already open"); expect(thread.pendingQuickReply).toBeUndefined();
});
it("an existing ticket with an active agent still allows a valid refund offer and confirmation", async () => {
  openTicket({ threadId: thread.threadId, customerId: thread.customerId, traceId: thread.traceId, source: "rule", reason: "human_requested", summary: "Waiting for a consultant" });
  expect(thread.takeover.status).toBe("agent");
  await offer(refund);
  expect(thread.pendingQuickReply?.kind).toBe("refund");
  expect(readEventLog().some(({ event }) => event.kind === "widget" && event.widget.type === "quick-replies")).toBe(true);
  model.run.mockImplementationOnce(async (_input, ctx) => {
    expect(await createRefund.invoke(new RunContext(ctx), JSON.stringify(refund))).toContain("REFUND_CREATED");
    return { reply: "Your refund was created.", approvals: [] };
  });
  expect((await click("yes")).status).toBe(200);
  expect(listRefunds()).toMatchObject([{ orderId: "1001", customerId: thread.customerId, amount: 249 }]);
  expect(listTickets()).toHaveLength(1); expect(thread.takeover.status).toBe("agent");
});
