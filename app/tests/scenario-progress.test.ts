/** Offline story progress and cancellable draft typing; no hook harness, browser or model needed. */
import { afterEach, expect, it, vi } from "vitest";
import { awaitingApprovalAnswer, scenarioProgress } from "@/lib/client/scenario-progress";
import { typeSuggestedDraft } from "@/lib/client/use-suggested-draft";
import { scenarios } from "@/lib/eval/scenarios";
import type { AgentEvent, SupportUIMessage } from "@/lib/types";
import { toChatMessage, withInspectorCorrelation } from "@/lib/client/pushed-messages";
import { toCustomerEvent } from "@/lib/runtime/event-visibility";

const scenario = scenarios.find((entry) => entry.id === "claim-slot-filling")!;
const playback = { scenario, threadId: "own-thread" };
const message = (id: string, role: "user" | "assistant", text = "Text"): SupportUIMessage => ({ id, role, parts: [{ type: "text", text }] });
const first = [message("u1", "user"), message("a1", "assistant")];
const approval: Extract<AgentEvent, { kind: "approval_request" }> = { id: "pause", ts: 1, turnId: "paused-turn", kind: "approval_request",
  approval: { approvalId: "refund-approval", threadId: "own-thread", turnId: "paused-turn", traceId: "trace", toolName: "create_refund",
    args: {}, customerId: "c-anna", customerName: "Anna", agent: "Orders", summary: "Refund", createdAt: 1 } };
const decision: Extract<AgentEvent, { kind: "approval_decision" }> = { id: "decision", ts: 2, turnId: "paused-turn", kind: "approval_decision", approvalId: "refund-approval", toolName: "create_refund", approved: true, decidedBy: "Marta Nowak" };
const resumed: Extract<AgentEvent, { kind: "chat_message" }> = { id: "resumed-event", ts: 3, turnId: "paused-turn", kind: "chat_message", role: "agent", entryId: "resumed-answer", text: "The refund decision has been processed." };
afterEach(() => vi.useRealTimers());

it("offers step two only after an answer, binding it to thread, scenario and the sent customer turn", () => {
  const progress = scenarioProgress(playback, "own-thread", first, false);
  expect(progress.label).toContain("Step 2 of 4");
  expect(progress.suggestion).toEqual({ key: `own-thread:${scenario.id}:u1`, text: scenario.followUps![0] });
  expect(scenarioProgress(playback, "own-thread", first.slice(0, 1), false).suggestion).toBeUndefined();
  expect(scenarioProgress(playback, "own-thread", first, true).suggestion).toBeUndefined();
});

it("thread changes, cleared stories and no sent first turn cannot suggest old customer text", () => {
  expect(scenarioProgress(playback, "another-thread", first, false)).toEqual({});
  expect(scenarioProgress(undefined, "own-thread", first, false)).toEqual({});
  expect(scenarioProgress(playback, "own-thread", [message("notice", "assistant")], false).suggestion).toBeUndefined();
});

it("sending an edited message advances by the real customer turn and fills date templates", () => {
  const edited = [...first, message("u2", "user", "My own damage description"), message("a2", "assistant")];
  const progress = scenarioProgress(playback, "own-thread", edited, false);
  expect(progress.label).toContain("Step 3 of 4");
  expect(progress.suggestion?.key).toContain(":u2");
  expect(progress.suggestion?.text).toContain(new Date().toISOString().slice(0, 10));
  expect(progress.suggestion?.text).not.toContain("{{today}}");
});

it("the completed story has no repeated next turn", () => {
  const complete = Array.from({ length: 4 }, (_, i) => [message(`u${i}`, "user"), message(`a${i}`, "assistant")]).flat();
  expect(scenarioProgress(playback, "own-thread", complete, false)).toMatchObject({ label: expect.stringContaining("Step 4 of 4"), suggestion: undefined });
});

it("consultant replies do not start an agent suggestion; system notices alone do not replace an answer", () => {
  const human: SupportUIMessage = { ...message("h", "assistant"), parts: [{ type: "text", text: "Human reply" }, { type: "data-sender", data: { kind: "human", name: "Marta" } }] };
  const notice: SupportUIMessage = { ...message("n", "assistant"), parts: [{ type: "text", text: "Notice" }, { type: "data-sender", data: { kind: "system", notice: true } }] };
  expect(scenarioProgress(playback, "own-thread", [...first, human], false).suggestion).toBeUndefined();
  expect(scenarioProgress(playback, "own-thread", [first[0], notice], false).suggestion).toBeUndefined();
  expect(scenarioProgress(playback, "own-thread", [...first, notice], false).suggestion).toBeDefined();
});

it("typing updates only the draft in short batches, completes within 600ms and has no send callback", () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const text = "A longer next message ".repeat(30);
  typeSuggestedDraft(text, update, false);
  expect(update).not.toHaveBeenCalled();
  vi.advanceTimersByTime(0);
  expect(update.mock.lastCall![0].length).toBeLessThan(text.length);
  vi.advanceTimersByTime(600);
  expect(update).toHaveBeenLastCalledWith(text);
  expect(update.mock.calls.length).toBeLessThanOrEqual(30);
});

it("editing or clearing cancels every remaining old write, preserving the manual value", () => {
  vi.useFakeTimers();
  for (const manual of ["My edited message", ""]) {
    let draft = "";
    const cancel = typeSuggestedDraft("The scripted next message", (text) => { draft = text; }, false);
    vi.advanceTimersByTime(20);
    cancel(); draft = manual;
    vi.runAllTimers();
    expect(draft).toBe(manual);
  }
});

it("switching suggestions cancels the old timer; reduced motion fills in one update", () => {
  vi.useFakeTimers();
  const update = vi.fn();
  const cancel = typeSuggestedDraft("Old customer message", update, false);
  vi.advanceTimersByTime(0); cancel(); update.mockClear();
  typeSuggestedDraft("New customer message", update, true);
  vi.runAllTimers();
  expect(update.mock.calls).toEqual([["New customer message"]]);
});

it("the linked damage/refund/human story keeps real business and approval expectations", () => {
  const story = scenarios.find((entry) => entry.id === "damage-refund-human")!;
  expect(story.followUps).toHaveLength(3);
  expect(story.expect).toMatchObject({ claimsCreated: 1, refundsCreated: 1, approvalRequested: true, resumeApproved: true, ticketCreated: true, toolsNotCalled: ["show_order_picker"] });
});

it.each([true, false])("waits through a decision (approved=%s) until the correlated resumed answer is in the chat", (approved) => {
  const pausedStory = { threadId: "own-thread", scenario: scenarios.find((entry) => entry.id === "refund-over-threshold")! };
  const pausedMessages = [message("refund-request", "user"), message("waiting", "assistant", "Waiting for a consultant's decision.")];
  const progress = (events: AgentEvent[], messages = pausedMessages) => scenarioProgress(pausedStory, "own-thread", messages, awaitingApprovalAnswer(events, messages, "own-thread"));
  expect(progress([approval]).suggestion).toBeUndefined();
  const decided = [approval, { ...decision, approved }];
  expect(progress(decided).suggestion).toBeUndefined();
  expect(progress([...decided, resumed]).suggestion).toBeUndefined(); // Event arrived before its bubble.
  const completed = progress([...decided, resumed], [...pausedMessages, toChatMessage(resumed)]);
  expect(completed.label).toContain("Step 2 of 3");
  expect(completed.suggestion?.text).toBe(pausedStory.scenario.followUps![0]);
});

it("an unrelated turn, a consultant reply or unknown correlation cannot complete a paused run", () => {
  const unrelated = { ...resumed, turnId: "another-turn" };
  const human = { ...resumed, role: "consultant" as const };
  for (const reply of [unrelated, human]) expect(awaitingApprovalAnswer([approval, decision, reply], [toChatMessage(reply)], "own-thread")).toBe(true);
  const unknown = { ...approval, turnId: undefined, approval: { ...approval.approval, turnId: undefined } };
  expect(awaitingApprovalAnswer([unknown, decision, resumed], [toChatMessage(resumed)], "own-thread")).toBe(true);
});

it("a customer-first duplicate gains inspector correlation without another bubble or widening the customer event", () => {
  const customer = toCustomerEvent(resumed)!;
  expect(customer).not.toHaveProperty("turnId");
  const events = [approval, decision, customer];
  const messages = [toChatMessage(resumed)];
  expect(awaitingApprovalAnswer(events, messages, "own-thread")).toBe(true);
  const enriched = withInspectorCorrelation(events, resumed);
  expect(enriched).toHaveLength(events.length);
  expect(awaitingApprovalAnswer(enriched, messages, "own-thread")).toBe(false);
  expect(toCustomerEvent(enriched.at(-1)!)).not.toHaveProperty("turnId");
});

it("inspector-first delivery retains its correlation when the customer copy follows", () => {
  const events = [approval, decision, resumed];
  const customer = toCustomerEvent(resumed)!;
  const duplicate = withInspectorCorrelation(events, customer);
  expect(duplicate).toBe(events);
  expect(withInspectorCorrelation(events, resumed)).toBe(events);
  expect(duplicate.filter((event) => event.id === resumed.id)).toHaveLength(1);
  expect(awaitingApprovalAnswer(duplicate, [toChatMessage(resumed)], "own-thread")).toBe(false);
  expect(customer).not.toHaveProperty("turnId");
});

it("a renewed approval pause remains waiting after its decision until a newer final answer", () => {
  const again = { ...approval, id: "second-pause", approval: { ...approval.approval, approvalId: "second-approval" } };
  const waiting = { ...resumed, id: "paused-again", entryId: "waiting-again", text: "Waiting for another decision." };
  const decidedAgain = { ...decision, id: "second-decision", approvalId: "second-approval" };
  const events = [approval, decision, again, waiting];
  expect(awaitingApprovalAnswer(events, [toChatMessage(waiting)], "own-thread")).toBe(true);
  expect(awaitingApprovalAnswer([...events, decidedAgain], [toChatMessage(waiting)], "own-thread")).toBe(true);
  expect(awaitingApprovalAnswer([...events, decidedAgain, resumed], [toChatMessage(waiting), toChatMessage(resumed)], "own-thread")).toBe(false);
});

it.each([true, false])("handles customer answer -> inspector decision -> full same-ID answer (approved=%s)", (approved) => {
  const customer = toCustomerEvent(resumed)!;
  const messages = [...first, toChatMessage(resumed)];
  const events = [approval, customer, { ...decision, approved }];
  expect(awaitingApprovalAnswer(events, messages, "own-thread")).toBe(true);
  const ordered = withInspectorCorrelation(events, resumed);
  expect(ordered.map((event) => event.id)).toEqual([approval.id, decision.id, resumed.id]);
  expect(ordered).toHaveLength(events.length);
  expect(ordered.filter((event) => event.id === resumed.id)).toHaveLength(1);
  expect(awaitingApprovalAnswer(ordered, messages, "own-thread")).toBe(false);
  expect(scenarioProgress(playback, "own-thread", messages, awaitingApprovalAnswer(ordered, messages, "own-thread")).suggestion).toBeDefined();
  expect(customer).not.toHaveProperty("turnId");
});

it("retains inspector order for repeated pauses when each customer answer arrives before its inspector decision", () => {
  const again = { ...approval, id: "second-pause", approval: { ...approval.approval, approvalId: "second-approval" } };
  const waiting = { ...resumed, id: "paused-again", entryId: "waiting-again", text: "Waiting for another decision." };
  const decidedAgain = { ...decision, id: "second-decision", approvalId: "second-approval" };
  const messages = [...first, toChatMessage(waiting)];
  let events: AgentEvent[] = [approval, toCustomerEvent(waiting)!, decision, again];
  events = withInspectorCorrelation(events, waiting);
  expect(awaitingApprovalAnswer(events, messages, "own-thread")).toBe(true);
  messages.push(toChatMessage(resumed));
  events = [...events, toCustomerEvent(resumed)!, decidedAgain];
  expect(awaitingApprovalAnswer(events, messages, "own-thread")).toBe(true);
  const ordered = withInspectorCorrelation(events, resumed);
  expect(ordered.map((event) => event.id)).toEqual([approval.id, decision.id, again.id, waiting.id, decidedAgain.id, resumed.id]);
  expect(ordered).toHaveLength(events.length);
  expect(awaitingApprovalAnswer(ordered, messages, "own-thread")).toBe(false);
  for (const event of ordered.filter((event) => event.kind === "chat_message")) expect(toCustomerEvent(event)).not.toHaveProperty("turnId");
});
