/**
 * Escalation by rule, the effectful half: the pure decision (lib/escalation/rules.ts) says WHETHER,
 * this file opens the ticket and returns the sentence the customer reads.
 */
import type { EscalationDecision } from "@/lib/escalation/rules";
import { alreadyEscalatedNotice, escalationNotice } from "@/lib/escalation/notices";
import type { SupportContext } from "@/lib/types";
import { openTicket } from "./tickets";

const MAX_QUOTED_TEXT = 300;

export function escalateByRule(
  ctx: SupportContext,
  decision: Extract<EscalationDecision, { escalate: true }>,
  customerText: string,
): string {
  const quoted = customerText ? ` Customer wrote: "${customerText.slice(0, MAX_QUOTED_TEXT)}"` : "";
  const { ticket, created } = openTicket({
    customerId: ctx.customerId,
    threadId: ctx.threadId,
    traceId: ctx.traceId ?? "",
    summary: `Automatic escalation: ${decision.detail}.${quoted}`,
    source: "rule",
    reason: decision.reason,
  });
  return created ? escalationNotice(ctx.language, ticket.id) : alreadyEscalatedNotice(ctx.language, ticket.id);
}
