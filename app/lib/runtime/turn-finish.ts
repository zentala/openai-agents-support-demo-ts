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
import { publishQuickReplies } from "./quick-replies";
import { automaticStep } from "@/lib/message-kinds";
import { customerMessages } from "./customer-messages";

/** What the customer reads while a refund waits for a consultant. */
export const waitingText = (approvals: ApprovalRequest[]): string =>
  `I need a human colleague to approve this before I continue: ${approvals.map((a) => a.summary).join("; ")}. ` +
  "A consultant will decide shortly; you will see the answer here.";

export function finishTurn(
  thread: Thread,
  ctx: SupportContext,
  outcome: RunOutcome,
  observed: RunObservation,
  delivery: "request" | "push",
): RunOutcome {
  if (outcome.history) thread.history = outcome.history;
  if (outcome.context) thread.memory = outcome.context;
  thread.signals.toolErrors += observed.toolErrors;
  if (outcome.tripwire) thread.signals.guardrailTrips += 1;

  let reply = outcome.approvals.length > 0 ? waitingText(outcome.approvals) : outcome.reply;
  const messages = customerMessages({ ...outcome, reply });
  // INTERVIEW: the counters are judged in code after every run; the model cannot "forget" to escalate.
  const decision = decideEscalation({ text: "", ...thread.signals });
  const automaticallyEscalated = decision.escalate && !findOpenTicketForThread(thread.threadId);
  if (automaticallyEscalated) {
    const text = escalateByRule(ctx, decision, "");
    messages.push({ text, sender: automaticStep("Passed to a human", findOpenTicketForThread(thread.threadId)?.id) });
    reply = messages.map((message) => message.text).join("\n\n");
  }

  const quickReplies = publishQuickReplies(thread, { ...outcome, reply }, observed.tools, automaticallyEscalated);
  for (const message of messages) {
    const entry = { role: message.sender.kind === "ai" ? "agent" as const : "system" as const, ...message, tools: observed.tools };
    if (delivery === "push") pushToCustomer(thread, entry, quickReplies);
    else addTranscript(thread, entry);
  }
  return { ...outcome, reply, messages };
}
