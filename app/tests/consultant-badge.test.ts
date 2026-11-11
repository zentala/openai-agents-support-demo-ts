/** Queue attention stays visible until the consultant opens their workspace. */
import { expect, it } from "vitest";
import { needsHumanCount, updateBadge } from "@/lib/client/consultant-badge";
import type { AdminState } from "@/lib/admin/types";
it("counts approvals and only open tickets", () => {
  const state = { approvals: [{}, {}], tickets: [{ status: "open" }, { status: "closed" }] };
  expect(needsHumanCount(state as Pick<AdminState, "approvals" | "tickets">)).toBe(3);
  expect(needsHumanCount(null)).toBe(0);
});
it("marks increases, retains attention through a decrease, and clears on opening", () => {
  const increase = updateBadge({ count: 0, unseen: false }, 3, false);
  expect(increase.unseen).toBe(true);
  expect(updateBadge(increase, 2, false).unseen).toBe(true);
  expect(updateBadge(increase, 3, true).unseen).toBe(false);
  expect(updateBadge({ count: 3, unseen: false }, 3, false).unseen).toBe(false);
});
it("loads the existing queue quietly, then highlights only subsequent increases", () => {
  const initial = updateBadge({ count: null, unseen: false }, 5, false);
  expect(initial).toEqual({ count: 5, unseen: false });
  expect(updateBadge(initial, 6, false).unseen).toBe(true);
  expect(updateBadge(initial, null, false)).toEqual(initial);
});
