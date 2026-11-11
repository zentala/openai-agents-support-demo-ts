/** Pure queue count and attention state. Opening the tab acknowledges unseen work. */
import type { AdminState } from "@/lib/admin/types";
export const needsHumanCount = (state: Pick<AdminState, "approvals" | "tickets"> | null): number =>
  state ? state.approvals.length + state.tickets.filter((ticket) => ticket.status === "open").length : 0;
export type BadgeState = { count: number | null; unseen: boolean };
export function updateBadge(previous: BadgeState, count: number | null, active: boolean): BadgeState {
  if (count === null) return previous;
  return { count, unseen: !active && previous.count !== null && (previous.unseen || count > previous.count) };
}
