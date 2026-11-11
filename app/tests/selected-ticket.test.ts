/** A second escalation must not leave its conversation header pointing at an older resolved ticket. */
import { expect, it } from "vitest";
import { ticketForThread } from "@/lib/client/selected-ticket";
const ticket = (id: string, status: "open" | "resolved", day: number, threadId = "t") =>
  ({ id, status, createdAt: `2026-11-${String(day).padStart(2, "0")}T12:00:00Z`, threadId });
it("prefers an open ticket even when a resolved record is newer or appears first", () => {
  const open = ticket("T-2", "open", 2);
  const records = [ticket("T-1", "resolved", 1), ticket("T-3", "resolved", 3), open, ticket("T-4", "open", 4, "other")];
  expect(ticketForThread(records, "t")).toBe(open);
  expect(records.map((t) => t.id)).toEqual(["T-1", "T-3", "T-2", "T-4"]);
});
it("chooses the newest when all are resolved, including equal-time ticket ids", () => {
  const newest = ticket("T-10", "resolved", 3);
  expect(ticketForThread([ticket("T-9", "resolved", 3), newest, ticket("T-1", "resolved", 1)], "t")).toBe(newest);
});
it("returns no ticket for an absent or unselected conversation", () => {
  expect(ticketForThread([ticket("T-1", "open", 1)], "other")).toBeUndefined();
  expect(ticketForThread([ticket("T-1", "open", 1)])).toBeUndefined();
});
