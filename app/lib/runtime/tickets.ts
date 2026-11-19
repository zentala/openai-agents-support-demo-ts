/**
 * Opening an escalation ticket: ONE place used by the agent's `escalate_to_human` tool and by the
 * escalation rules in code, so both produce the same record and the same panel event.
 *
 * A conversation has at most one OPEN ticket. A second request (the model escalates after a rule
 * already did) returns the existing ticket instead of flooding the queue with duplicates.
 */
import { addTicket, findOpenTicketForThread, type TicketRecord } from "@/lib/data/store";
import { emitAgentEvent } from "./event-bus";
import { redactValue } from "@/lib/security/request-key";

export type OpenTicketInput = {
  customerId: string;
  threadId: string;
  traceId: string;
  summary: string;
  source: TicketRecord["source"];
  /** Short machine-readable reason, e.g. "legal_or_gdpr" or "agent_request". */
  reason: string;
};

export function openTicket(input: OpenTicketInput): { ticket: TicketRecord; created: boolean } {
  const existing = findOpenTicketForThread(input.threadId);
  if (existing) return { ticket: existing, created: false };
  const ticket = addTicket(redactValue(input));
  emitAgentEvent(input.threadId, { kind: "escalation", ticketId: ticket.id, source: input.source, reason: input.reason });
  return { ticket, created: true };
}
