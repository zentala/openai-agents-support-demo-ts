/** Pure queue count and attention state. Opening the tab acknowledges unseen work. */
import type { AdminState } from "@/lib/admin/types";
export const needsHumanCount = (state: Pick<AdminState, "approvals" | "tickets"> | null): number =>
  state ? state.approvals.length + state.tickets.filter((ticket) => ticket.status === "open").length : 0;
/** Prefix IDs so a ticket and an approval cannot hide each other's arrival. */
export const humanQueueIds = (state: Pick<AdminState, "approvals" | "tickets">): string[] =>
  [...state.approvals.map((item) => `approval:${item.approvalId}`), ...state.tickets.filter((item) => item.status === "open").map((item) => `ticket:${item.id}`)].sort();
export type BadgeState = { count: number | null; unseen: boolean; pulse: number; itemIds?: string[] };
export function updateBadge(previous: BadgeState, count: number | null, active: boolean, itemIds?: string[]): BadgeState {
  if (count === null) return previous;
  const arrived = previous.count !== null && (itemIds && previous.itemIds
    ? itemIds.some((id) => !previous.itemIds!.includes(id)) : count > previous.count);
  const unseen = !active && previous.count !== null && (previous.unseen || arrived);
  const pulse = previous.pulse + (arrived ? 1 : 0);
  const sameIds = itemIds?.join("\n") === previous.itemIds?.join("\n");
  if (previous.count === count && previous.unseen === unseen && sameIds && pulse === previous.pulse) return previous;
  return { count, unseen, pulse, ...(itemIds ? { itemIds } : {}) };
}
