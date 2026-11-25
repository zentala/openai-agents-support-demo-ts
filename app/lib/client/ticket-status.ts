/**
 * Status word on the ticket badge of an "Automatic step" card.
 *
 * The card is stored once, when the ticket opens; its status must follow the ticket, so it is
 * derived at render time from facts the page already has: which tickets the server reported closed,
 * which one the conversation is waiting on, and who is handling.
 */
import type { HandlerStatus } from "@/lib/types";

export type TicketBadgeStatus = "waiting" | "taken over" | "in review" | "closed";

/**
 * What the page knows now. `resolvedTicketIds` are tickets the server reported closed.
 * `openTicketId` is the ticket the conversation currently waits on (none after a hand-back).
 */
export type TicketContext = { openTicketId?: string; resolvedTicketIds?: string[]; handler: HandlerStatus };

/**
 * "closed" only when the ticket itself is closed. A ticket the conversation no longer waits on, yet
 * not closed (hand-back or lockout while staff still review it), is "in review".
 */
export function ticketBadgeStatus(ticketId: string, context?: TicketContext): TicketBadgeStatus {
  if (!context) return "waiting";
  if (context.resolvedTicketIds?.includes(ticketId)) return "closed";
  if (context.openTicketId !== ticketId) return "in review";
  return context.handler === "human" ? "taken over" : "waiting";
}
