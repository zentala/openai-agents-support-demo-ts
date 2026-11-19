/**
 * One conversation turn, end to end: clean input -> (takeover? rules?) -> run -> store history.
 * Used by the chat route AND the eval script, so both exercise the same code.
 *
 * SECURITY: conversation history lives on the SERVER (see threads.ts), keyed by thread id and
 * bound to one customer. The browser only sends the new message, so a user cannot forge earlier
 * "assistant" messages to steer the model.
 */
import type { AgentInputItem } from "@openai/agents";
import { decideEscalation } from "@/lib/escalation/rules";
import { maskSensitiveText, normalizeInput, stripInvisible, type NormalizedInput } from "@/lib/guardrails/normalize-input";
import type { AddressDecision, SupportContext, WidgetSelection } from "@/lib/types";
import { decideAddressChange, leftAddressFlow } from "@/lib/address/address-flow";
import { MAX_HISTORY_ITEMS } from "@/lib/config";
import { isPublicDemo, redactSecrets } from "@/lib/security/request-key";
import { diffContext } from "./context-diff";
import { applySelection } from "./selection";
import { capHistory } from "./history";
import { currentTurnId, emitAgentEvent, withTurnEvents } from "./event-bus";
import { consumeQuickReply } from "./quick-replies";
import { escalateByRule } from "./escalation-flow";
import { observeRun } from "./run-observer";
import { executeSupportRun, type RunOutcome } from "./run-support";
import { withSecureFormNotice } from "./secure-form-notice";
import { routeToConsultant } from "./takeover";
import { addTranscript, assistantItem, threadFor, userItem, type Thread } from "./threads";
import { finishTurn } from "./turn-finish";
import { automaticStep } from "@/lib/message-kinds";
import { findOpenTicketForThread } from "@/lib/data/store";
import { fillEmptyReply } from "./empty-reply";
import { rememberRefundRequest, replyDecision, stageConversationOffer } from "./conversation-offers";

const fail = (reply: string): RunOutcome => ({ reply, approvals: [], failed: reply, sender: automaticStep("Request refused") });

const reportError = (threadId: string, errorType: string, message: string, where: string) =>
  emitAgentEvent(threadId, { kind: "error", errorType, message, where });

/** Applies a widget click and cleans the text. Returns the final customer text, or the failure to show. */
function prepareText(
  thread: Thread,
  baseCtx: SupportContext,
  rawText: string,
  selection?: WidgetSelection,
): { ok: true; text: string; sensitive: NormalizedInput["sensitive"] } | { ok: false; outcome: RunOutcome } {
  let incoming = rawText;
  if (selection?.type === "order") {
    // A widget click is validated here and written into the context by code, then announced in the panel.
    const picked = applySelection(baseCtx.customerId, thread.memory, selection);
    if (!picked.ok) {
      reportError(baseCtx.threadId, "InvalidSelection", picked.message, "widget click");
      return { ok: false, outcome: fail("I could not use that selection. Please pick one of your own orders.") };
    }
    const changes = diffContext(thread.memory, picked.memory);
    if (changes) emitAgentEvent(baseCtx.threadId, { kind: "context_update", changes });
    thread.memory = picked.memory;
    incoming = picked.text;
  }
  incoming = redactSecrets(incoming);
  const { text, stripped, sensitive } = normalizeInput(incoming);
  // SECURITY: the panel shows what was cleaned, but never raw card / account / phone data. Strip invisible
  // characters FIRST so an account split by zero-width characters cannot leak into the preview.
  emitAgentEvent(baseCtx.threadId, { kind: "normalization", stripped, before: maskSensitiveText(stripInvisible(incoming)).text, after: text });
  if (text.length === 0) {
    reportError(baseCtx.threadId, "EmptyMessage", "Nothing left after removing signatures and quoted text", "normalizeInput");
    return { ok: false, outcome: fail("Your message was empty after removing signatures and quoted text. Please type your question.") };
  }
  return { ok: true, text, sensitive };
}

/** Applies the click, records the exchange in history and transcript, and returns the fixed sentence. */
function answerAddressClick(thread: Thread, ctx: SupportContext, text: string, click: AddressDecision): RunOutcome {
  delete thread.memory.addressDraft;
  return fixedAnswer(thread, text, decideAddressChange(thread, ctx.language, click), "Address change");
}

function fixedAnswer(thread: Thread, text: string, reply: string, title = "Request updated"): RunOutcome {
  thread.history.push(userItem(text), assistantItem(reply));
  const sender = automaticStep(title);
  addTranscript(thread, { role: "system", text: reply, sender });
  return { reply, approvals: [], sender };
}

function recordFailure(thread: Thread, outcome: RunOutcome) {
  addTranscript(thread, { role: "system", text: outcome.reply, sender: outcome.sender });
  return { ok: false as const, outcome };
}

function beginTurn(baseCtx: SupportContext, rawText: string, selection?: WidgetSelection) {
  const thread = threadFor(baseCtx);
  if (!thread) {
    reportError(baseCtx.threadId, "ThreadOwnershipError", "Thread belongs to another customer", "chat route");
    return { ok: false as const, outcome: fail("This conversation belongs to another customer, so I cannot continue it.") };
  }
  const decision = !selection && thread.pendingQuickReply ? replyDecision(rawText) : undefined;
  const click = selection?.type === "quick-reply" ? selection : decision ? { type: "quick-reply" as const, offerId: thread.pendingQuickReply!.id, decision } : undefined;
  const choice = click ? consumeQuickReply(thread, baseCtx, click) : undefined;
  if (choice) delete thread.refundRequest;
  delete thread.pendingQuickReply;
  thread.latestTurnId = currentTurnId(thread.threadId);
  // A trace starts every incoming turn, including rejected choices; it never carries raw input.
  emitAgentEvent(baseCtx.threadId, { kind: "trace", traceId: thread.traceId,
    url: isPublicDemo() ? "" : `https://platform.openai.com/traces/trace?trace_id=${thread.traceId}` });
  if (choice && !choice.ok) {
    reportError(thread.threadId, "InvalidSelection", choice.message, "quick reply");
    return recordFailure(thread, fail(choice.message));
  }
  const prepared = prepareText(thread, baseCtx, choice?.text ?? rawText, selection);
  return prepared.ok ? { ...prepared, thread, declined: choice?.reply } : recordFailure(thread, prepared.outcome);
}

// INTERVIEW: normalize -> takeover check -> escalation rules -> input guardrails -> agents -> output guardrail. Defense in depth: each layer assumes the one before can fail.
export async function handleUserMessage(
  baseCtx: SupportContext,
  rawText: string,
  selection?: WidgetSelection,
): Promise<RunOutcome> {
  return withTurnEvents(baseCtx.threadId, crypto.randomUUID(), () => handleTurn(baseCtx, rawText, selection));
}

async function handleTurn(
  baseCtx: SupportContext,
  rawText: string,
  selection?: WidgetSelection,
): Promise<RunOutcome> {
  const started = beginTurn(baseCtx, rawText, selection);
  if (!started.ok) return started.outcome;
  const { thread, text, sensitive, declined } = started;
  if (!declined) rememberRefundRequest(thread, text);

  // The run context = identity from the session + the mutable fields this thread remembers.
  const ctx: SupportContext = { ...baseCtx, ...thread.memory, traceId: thread.traceId, customerMessage: text,
    staffInstruction: thread.staffInstruction ? { ...thread.staffInstruction } : undefined };
  addTranscript(thread, { role: "customer", text });

  // A human is in charge: the agent must not answer. Enforced here in code, before any model call.
  if (thread.takeover.status === "human") return routeToConsultant(thread, text);
  if (declined) return fixedAnswer(thread, text, declined, "Request declined");

  // The Confirm / Cancel click of an address change card is applied by code; no model call.
  if (selection?.type === "address") return answerAddressClick(thread, ctx, text, selection);

  // Legal/GDPR terms and explicit requests for a person never reach the model.
  const early = decideEscalation({ text, guardrailTrips: 0, toolErrors: 0 });
  if (early.escalate) {
    delete thread.memory.addressDraft;
    const notice = escalateByRule(ctx, early, text);
    thread.history.push(userItem(text), assistantItem(notice));
    // Rule-generated customer replies are agent answers; only lifecycle notices are system lines.
    const sender = automaticStep("Passed to a human", findOpenTicketForThread(thread.threadId)?.id);
    addTranscript(thread, { role: "system", text: notice, sender });
    return { reply: notice, approvals: [], sender };
  }

  // Only the newest complete turns go to the model; see capHistory for why we cut at user messages.
  const input: AgentInputItem[] = [...capHistory(thread.history, MAX_HISTORY_ITEMS), userItem(text)];
  const stopObserving = observeRun(ctx.threadId);
  const outcome = await executeSupportRun(input, ctx, thread.traceId);
  const observed = stopObserving();
  await stageConversationOffer(thread, ctx, outcome, observed);
  if (leftAddressFlow(observed.tools)) {
    delete thread.memory.addressDraft;
    delete outcome.context?.addressDraft;
  }
  const answered = fillEmptyReply(thread, ctx, text, outcome, observed);
  // A bank account or phone number typed into the chat was masked above: code now points to the secure form.
  return finishTurn(thread, ctx, withSecureFormNotice(ctx, answered, sensitive, observed.tools), observed, "request");
}
