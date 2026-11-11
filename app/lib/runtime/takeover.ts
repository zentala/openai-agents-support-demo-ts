/**
 * Conversation takeover: the effectful side of the state machine in takeover-state.ts.
 *
 * A consultant opens an escalated conversation, takes it over, types replies that appear in the
 * customer's chat, and hands it back. While `human`, `handleUserMessage` (turn.ts) routes customer
 * messages here instead of running the agent.
 *
 * INTERVIEW: human-in-the-loop is not only "approve a tool call". Here a person replaces the agent
 * mid-conversation, and the agent still learns what was said (history items), so hand-back is seamless.
 */
import { findOpenTicketForThread, resolveTicketsForThread, getCustomer } from "@/lib/data/store";
import { handedBackNotice, joinedNotice } from "@/lib/escalation/notices";
import type { RunOutcome } from "./run-support";
import { emitAgentEvent } from "./event-bus";
import { assistantItem, getThread, pushToCustomer, userItem, type Thread } from "./threads";
import { reduceTakeover, type TakeoverAction } from "./takeover-state";

export type ActionResult = { ok: true } | { ok: false; errorType: string; message: string };

/** History line for the model (never shown to the customer): everything before it was handled by a person. */
export const handedBackHistoryNote = (consultant: string): string =>
  `[System note: human colleague ${consultant} handled the conversation until now. Every customer message ` +
  "above that has no answer from you was answered by them. Do not answer those older messages again; " +
  "reply only to the customer's NEXT message.]";

const languageOf =(thread: Thread): string | undefined => getCustomer(thread.customerId)?.language;

/** Looks the thread up and applies one state-machine action; the caller runs the side effects on success. */
function transition(threadId: string, action: TakeoverAction): ActionResult & { thread?: Thread } {
  const thread = getThread(threadId);
  if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${threadId}` };
  const next = reduceTakeover(thread.takeover, action);
  if (!next.ok) return next;
  thread.takeover = next.state;
  return { ok: true, thread };
}

export function takeOver(threadId: string, consultant: string): ActionResult {
  const result = transition(threadId, { type: "take", consultant, at: Date.now() });
  if (!result.ok || !result.thread) return result;
  emitAgentEvent(threadId, { kind: "takeover", status: "human", consultant });
  pushToCustomer(result.thread, { role: "system", text: joinedNotice(languageOf(result.thread), consultant), author: consultant });
  return { ok: true };
}

export function handBack(threadId: string, consultant: string): ActionResult {
  const result = transition(threadId, { type: "release", consultant });
  if (!result.ok || !result.thread) return result;
  resolveTicketsForThread(threadId);
  // The customer's messages during the takeover sit in the history with no assistant answer of their
  // own. Without this note the agent would answer the oldest of them first after hand-back.
  result.thread.history.push(assistantItem(handedBackHistoryNote(consultant)));
  // A fresh start: old trips must not re-escalate the very next message.
  result.thread.signals = { guardrailTrips: 0, toolErrors: 0 };
  emitAgentEvent(threadId, { kind: "takeover", status: "agent", consultant });
  pushToCustomer(result.thread, { role: "system", text: handedBackNotice(languageOf(result.thread)) });
  return { ok: true };
}

export function consultantReply(threadId: string, consultant: string, text: string): ActionResult {
  const result = transition(threadId, { type: "reply", consultant });
  if (!result.ok || !result.thread) return result;
  // The agent reads this after hand-back; the name tells it a person, not itself, wrote the line.
  result.thread.history.push(assistantItem(`[Human colleague ${consultant}]: ${text}`));
  pushToCustomer(result.thread, { role: "consultant", text, author: consultant });
  return { ok: true };
}

/**
 * The customer wrote while a human is in charge: the agent stays silent. The line goes to the
 * history (so the agent is up to date after hand-back) and the panel is told where it went.
 */
export function routeToConsultant(thread: Thread, text: string): RunOutcome {
  thread.history.push(userItem(text));
  const consultant = thread.takeover.status === "human" ? thread.takeover.consultant : undefined;
  const ticket = findOpenTicketForThread(thread.threadId);
  emitAgentEvent(thread.threadId, {
    kind: "takeover",
    status: "human",
    consultant,
    note: `Customer message sent to ${consultant ?? "the consultant"}${ticket ? ` (ticket ${ticket.id})` : ""}; the agent did not answer`,
  });
  return { reply: "", approvals: [], handledByHuman: true };
}
