/** Shared UI wording for runtime ownership: a ticket alone does not disable the agent. */
import type { HandlerStatus } from "@/lib/types";
export function handlerDescription(status: HandlerStatus, consultant?: string, ticketId?: string): string {
  if (status === "human") return `Handled by ${consultant ?? "a consultant"}`;
  if (ticketId) return `Ticket ${ticketId} open — the agent keeps answering until a consultant takes over`;
  return "The agent answers the customer.";
}
