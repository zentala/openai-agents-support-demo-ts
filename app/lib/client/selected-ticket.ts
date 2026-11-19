/** Conversation headers prefer the open ticket, then the newest resolved ticket, independent of list order. */
import type { TicketView } from "@/lib/admin/types";
type TicketIdentity = Pick<TicketView, "id" | "threadId" | "status" | "createdAt">;
export function ticketForThread<T extends TicketIdentity>(tickets: readonly T[], threadId?: string): T | undefined {
  return tickets.filter((t) => t.threadId === threadId).sort((a, b) =>
    Number(b.status === "open") - Number(a.status === "open") ||
    Date.parse(b.createdAt) - Date.parse(a.createdAt) || b.id.localeCompare(a.id, undefined, { numeric: true }),
  )[0];
}
