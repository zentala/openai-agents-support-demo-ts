/**
 * Escalation by rule, the effectful half: the pure decision (lib/escalation/rules.ts) says WHETHER,
 * this file opens the ticket and returns the sentence the customer reads.
 */
import type { EscalationDecision } from "@/lib/escalation/rules";
import { alreadyEscalatedNotice, escalationNotice } from "@/lib/escalation/notices";
import type { SupportContext } from "@/lib/types";
import { openTicket } from "./tickets";
import { getThread } from "./threads";
import { currentAddress } from "@/lib/data/store";
import { disputedDeliveryOrder } from "@/lib/escalation/delivery-dispute";

const MAX_QUOTED_TEXT = 300;

export function escalateByRule(
  ctx: SupportContext,
  decision: Extract<EscalationDecision, { escalate: true }>,
  customerText: string,
): string {
  const thread = getThread(ctx.threadId);
  const customerMessages = thread?.transcript.filter((entry) => entry.role === "customer").map((entry) => entry.text) ?? [customerText];
  const disputeOrder = decision.reason === "human_requested"
    ? disputedDeliveryOrder(ctx.customerId, ctx.activeOrderId, customerMessages) : undefined;
  const disputeContext = disputeOrder && disputeOrder.deliveredDaysAgo !== null
    ? ` Recorded order #${disputeOrder.id} was delivered on ${new Date(Date.now() - disputeOrder.deliveredDaysAgo * 86_400_000).toISOString().slice(0, 10)} to ${Object.values(currentAddress(disputeOrder)).join(", ")}.` : "";
  const quoted = customerText ? ` Customer wrote: "${customerText.slice(0, MAX_QUOTED_TEXT)}"` : "";
  const { ticket, created } = openTicket({
    customerId: ctx.customerId,
    threadId: ctx.threadId,
    traceId: ctx.traceId ?? "",
    summary: `Automatic escalation: ${decision.detail}.${disputeContext}${quoted}`,
    source: "rule",
    reason: disputeOrder ? "delivery_dispute" : decision.reason,
    ...(disputeOrder ? { category: "delivery_dispute" as const } : {}),
    ...(decision.reason === "manager_requested" ? { category: "manager_requested" as const } : {}),
  });
  if (decision.reason === "manager_requested") {
    ticket.category = "manager_requested";
    ticket.reason = "manager_requested";
  }
  if (decision.reason === "manager_requested") return ctx.language === "pl" ? `Przekazuję tę rozmowę kierownikowi (zgłoszenie ${ticket.id}).` : ctx.language === "de" ? `Ich leite das Gespräch an die Leitung weiter (Ticket ${ticket.id}).` : `I'm passing this conversation to a manager (ticket ${ticket.id}).`;
  return created ? escalationNotice(ctx.language, ticket.id) : alreadyEscalatedNotice(ctx.language, ticket.id);
}
