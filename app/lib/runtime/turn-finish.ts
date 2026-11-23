/**
 * What happens after ANY agent run finished (a normal turn or a run resumed after an approval):
 * store history and context, update the escalation counters, apply the escalation rules, and
 * record the answer in the transcript.
 *
 * `delivery` says how the text reaches the customer:
 * - "request": the customer's own chat request is still open and streams `outcome.reply`.
 * - "push": nobody is waiting (a consultant decided an approval later), so the text is pushed
 *   through the thread's SSE channel.
 */
import { findOpenTicketForThread } from "@/lib/data/store";
import { decideEscalation } from "@/lib/escalation/rules";
import type { ApprovalRequest, SupportContext } from "@/lib/types";
import { escalateByRule } from "./escalation-flow";
import type { RunObservation } from "./run-observer";
import type { RunOutcome } from "./run-support";
import { addTranscript, pushToCustomer, type Thread } from "./threads";
import { offerQuickReplies, publishQuickReplies } from "./quick-replies";
import { automaticStep } from "@/lib/message-kinds";
import { customerMessages, outcomeSender } from "./customer-messages";
import { classifyActionClaims, claimBackedByResults, type ActionClaim, type ActionClaimType } from "@/lib/guardrails/action-claims";
import { pick } from "@/lib/escalation/notices";
import { emitAgentEvent } from "./event-bus";
import { hasMessageConcernForThread } from "./message-concerns";

const unbackedClaimReply = (language: string | undefined, claimType: ActionClaimType): string => pick(language, {
  pl: claimType === "refund" ? "Przepraszam, nie mogę potwierdzić, że zwrot został zatwierdzony." : claimType === "claim" ? "Przepraszam, nie mogę potwierdzić, że reklamacja została złożona." : claimType === "address" ? "Przepraszam, adres nie został jeszcze zmieniony." : claimType === "report" ? "Przepraszam, nie mogę potwierdzić, że sprawa została zgłoszona." : claimType === "question" ? "Przepraszam, nie mogę potwierdzić, że pytanie zostało wysłane do konsultanta." : "Nie przekazałem jeszcze tej sprawy. Czy chcesz połączyć się z konsultantem?",
  en: claimType === "refund" ? "Sorry, I can't confirm that a refund was approved." : claimType === "claim" ? "Sorry, I can't confirm that a claim was submitted." : claimType === "address" ? "Sorry, the address has not been changed yet." : claimType === "report" ? "Sorry, I can't confirm that this issue was reported." : claimType === "question" ? "Sorry, I can't confirm that your question was sent to a consultant." : "I have not forwarded this yet. Do you want me to connect you with a consultant?",
  de: claimType === "refund" ? "Es tut mir leid, ich kann nicht bestätigen, dass eine Erstattung genehmigt wurde." : claimType === "claim" ? "Es tut mir leid, ich kann nicht bestätigen, dass eine Reklamation eingereicht wurde." : claimType === "address" ? "Es tut mir leid, die Adresse wurde noch nicht geändert." : claimType === "report" ? "Es tut mir leid, ich kann nicht bestätigen, dass Ihr Anliegen gemeldet wurde." : claimType === "question" ? "Es tut mir leid, ich kann nicht bestätigen, dass Ihre Frage weitergeleitet wurde." : "Ich habe Ihr Anliegen noch nicht weitergeleitet. Möchten Sie mit einem Mitarbeiter sprechen?",
});

function blockUnbackedClaim(thread: Thread, ctx: SupportContext, claimType: ActionClaimType): string {
  emitAgentEvent(thread.threadId, { kind: "unbacked_claim_blocked", claimType });
  offerQuickReplies(ctx, { kind: "escalation", orderId: null, amount: null, reason: null });
  return unbackedClaimReply(ctx.language, claimType);
}

function knownRecipient(thread: Thread, recipient: string | null): boolean {
  if (!recipient) return true;
  return thread.takeover.status === "human" && thread.takeover.consultant.toLocaleLowerCase() === recipient.toLocaleLowerCase();
}

function claimHasBacking(claim: ActionClaim, thread: Thread, results: Record<string, unknown[]>): boolean {
  if (!knownRecipient(thread, claim.recipient_named)) return false;
  if (claim.type === "escalation") return Boolean(findOpenTicketForThread(thread.threadId));
  if (claim.type === "report" || claim.type === "question") return hasMessageConcernForThread(thread.threadId, claim.type) || claimBackedByResults(claim.type, results);
  return claimBackedByResults(claim.type, results);
}

function replaceModelMessages(messages: { text: string; sender: { kind: "ai" | "human" | "system"; title?: string } }[], text: string, title: string): void {
  let replaced = false;
  const kept = messages.flatMap((message) => {
    if (message.sender.kind !== "ai") return [message];
    if (replaced) return [];
    replaced = true;
    return [{ text, sender: automaticStep(title) }];
  });
  if (!replaced) kept.push({ text, sender: automaticStep(title) });
  messages.splice(0, messages.length, ...kept);
}

async function checkCustomerReply(
  thread: Thread, ctx: SupportContext, outcome: RunOutcome, observed: RunObservation,
  messages: { text: string; sender: { kind: "ai" | "human" | "system"; title?: string } }[], reply: string,
): Promise<string> {
  if (!(outcomeSender(outcome).kind === "ai" || messages.some((message) => message.sender.kind === "ai"))) return reply;
  try {
    const claims = await classifyActionClaims([reply, ...messages.map((message) => message.text)].join("\n\n"));
    const unsupported = claims.find((claim) => (claim.stance === "done" || claim.stance === "in_progress" || claim.stance === "will_happen")
      && !claimHasBacking(claim, thread, observed.toolResults ?? {}));
    if (!unsupported) {
      if (claims.some((claim) => claim.type === "escalation" && claim.stance === "offer")) thread.consultantOffered = true;
      return reply;
    }
    const blocked = blockUnbackedClaim(thread, ctx, unsupported.type);
    replaceModelMessages(messages, blocked, "Unbacked claim blocked");
    return blocked;
  } catch {
    emitAgentEvent(thread.threadId, { kind: "error", errorType: "ActionClaimClassifierError",
      message: "The structured action-claim check failed; the reply was blocked.", where: "output guardrail" });
    const fallback = pick(ctx.language, {
      pl: "Nie mogę teraz zweryfikować tej czynności. Czy chcesz połączyć się z konsultantem?",
      en: "I can't verify that action right now. Would you like me to connect you with a consultant?",
      de: "Ich kann diese Aktion gerade nicht überprüfen. Möchten Sie mit einem Mitarbeiter sprechen?",
    });
    replaceModelMessages(messages, fallback, "Action claim check failed");
    thread.consultantOffered = true;
    return fallback;
  }
}

function deliverCustomerMessages(
  thread: Thread, outcome: RunOutcome, observed: RunObservation, delivery: "request" | "push",
  reply: string, messages: ReturnType<typeof customerMessages>, automaticallyEscalated: boolean,
): RunOutcome {
  const quickReplies = publishQuickReplies(thread, { ...outcome, reply }, observed.tools, automaticallyEscalated);
  for (const message of messages) {
    const entry = { role: message.sender.kind === "ai" ? "agent" as const : "system" as const, ...message, tools: observed.tools };
    if (delivery === "push") pushToCustomer(thread, entry, quickReplies);
    else message.id = addTranscript(thread, entry).id;
  }
  return { ...outcome, reply, messages };
}

/** What the customer reads while a refund waits for a consultant. */
export const waitingText = (approvals: ApprovalRequest[]): string =>
  `I need a human colleague to approve this before I continue: ${approvals.map((a) => a.summary).join("; ")}. ` +
  "A consultant will decide shortly; you will see the answer here.";

export async function finishTurn(
  thread: Thread,
  ctx: SupportContext,
  outcome: RunOutcome,
  observed: RunObservation,
  delivery: "request" | "push",
): Promise<RunOutcome> {
  if (outcome.history) thread.history = outcome.history;
  if (outcome.context) thread.memory = outcome.context;
  thread.signals.toolErrors += observed.toolErrors;
  if (outcome.tripwire) thread.signals.guardrailTrips += 1;

  let reply = outcome.approvals.length > 0 ? waitingText(outcome.approvals) : outcome.reply;
  // INTERVIEW: the counters are judged in code after every run; the model cannot "forget" to escalate.
  const decision = decideEscalation({ text: "", ...thread.signals });
  const automaticallyEscalated = decision.escalate && !findOpenTicketForThread(thread.threadId);
  const messages = customerMessages({ ...outcome, reply });
  if (automaticallyEscalated) {
    const text = escalateByRule(ctx, decision, "");
    messages.push({ text, sender: automaticStep("Passed to a human", findOpenTicketForThread(thread.threadId)?.id) });
    reply = messages.map((message) => message.text).join("\n\n");
  }

  reply = await checkCustomerReply(thread, ctx, outcome, observed, messages, reply);

  return deliverCustomerMessages(thread, outcome, observed, delivery, reply, messages, automaticallyEscalated);
}
