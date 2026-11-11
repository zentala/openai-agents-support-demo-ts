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
  // INTERVIEW: the counters are judged in code after every run; the model cannot "forget" to escalate.
  const decision = decideEscalation({ text: "", ...thread.signals });
  if (decision.escalate && !findOpenTicketForThread(thread.threadId)) {
    reply = [reply, escalateByRule(ctx, decision, "")].filter(Boolean).join("\n\n");
  }

  if (reply) {
    const entry = { role: "agent" as const, text: reply, tools: observed.tools };
    if (delivery === "push") pushToCustomer(thread, entry);
    else addTranscript(thread, entry);
  }
  return { ...outcome, reply };
}
