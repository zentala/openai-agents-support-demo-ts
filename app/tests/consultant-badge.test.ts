/** Queue attention stays visible until the consultant opens their workspace. */
import { expect, it } from "vitest";
import { humanQueueIds, needsHumanCount, updateBadge } from "@/lib/client/consultant-badge";
import type { AdminState } from "@/lib/admin/types";
it("counts approvals and only open tickets", () => {
  const state = { approvals: [{}, {}], tickets: [{ status: "open" }, { status: "closed" }] };
  expect(needsHumanCount(state as Pick<AdminState, "approvals" | "tickets">)).toBe(3);
  expect(needsHumanCount(null)).toBe(0);
});
it("marks increases, retains attention through a decrease, and clears on opening", () => {
  const increase = updateBadge({ count: 0, unseen: false, pulse: 0 }, 3, false);
  expect(increase.unseen).toBe(true);
  expect(updateBadge(increase, 2, false).unseen).toBe(true);
  expect(updateBadge(increase, 3, true).unseen).toBe(false);
  expect(updateBadge({ count: 3, unseen: false, pulse: 0 }, 3, false).unseen).toBe(false);
});
it("loads the existing queue quietly, then highlights only subsequent increases", () => {
  const initial = updateBadge({ count: null, unseen: false, pulse: 0 }, 5, false);
  expect(initial).toEqual({ count: 5, unseen: false, pulse: 0 });
  expect(updateBadge(initial, 6, false).unseen).toBe(true);
  expect(updateBadge(initial, null, false)).toEqual(initial);
});
it("detects a new ticket or approval even when the total count is unchanged", () => {
  const state = { approvals: [{ approvalId: "same-id" }], tickets: [{ id: "same-id", status: "open" }, { id: "closed", status: "resolved" }] };
  expect(humanQueueIds(state as Pick<AdminState, "approvals" | "tickets">)).toEqual(["approval:same-id", "ticket:same-id"]);
  const initial = updateBadge({ count: null, unseen: false, pulse: 0 }, 1, false, ["ticket:old"]);
  expect(initial.pulse).toBe(0);
  const replaced = updateBadge(initial, 1, false, ["approval:new"]);
  expect(replaced).toMatchObject({ unseen: true, pulse: 1 });
  expect(updateBadge(replaced, 1, false, ["approval:new"])).toBe(replaced);
  expect(updateBadge(replaced, 0, false, []).pulse).toBe(1);
  expect(updateBadge(replaced, 2, true, ["approval:new", "ticket:new"]))
    .toMatchObject({ unseen: false, pulse: 2 });
});
