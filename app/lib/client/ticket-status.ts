/**
 * Status word on the ticket badge of an "Automatic step" card.
 *
 * The card is stored once, when the ticket opens; its status must follow the conversation, so it is
 * derived at render time from facts the page already has (the open ticket and who is handling).
 */
import type { HandlerStatus } from "@/lib/types";

export type TicketBadgeStatus = "waiting" | "taken over" | "closed";

/** What the page knows now: the ticket still open (if any) and who handles the conversation. */
export type TicketContext = { openTicketId?: string; handler: HandlerStatus };

/** A ticket that is no longer the open one was closed by a hand-back; a human handler means taken over. */
export function ticketBadgeStatus(ticketId: string, context?: TicketContext): TicketBadgeStatus {
  if (!context) return "waiting";
  if (context.openTicketId !== ticketId) return "closed";
  return context.handler === "human" ? "taken over" : "waiting";
}
