/** Manager authorization, private lockout alerts and explicit unlock behavior. */
import { afterEach, beforeEach, expect, it } from "vitest";
import { buildAdminState } from "@/lib/admin/state";
import { actionSchema, runAdminAction } from "@/lib/admin/actions";
import { addTicket } from "@/lib/data/store";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { managerTakeOver } from "@/lib/runtime/takeover";

let thread: Thread;
beforeEach(() => { thread = createThread("c-anna"); });
afterEach(() => removeThread(thread.threadId));

it("hides manager alert drafts from regular consultants and permits manager takeover and unlock", async () => {
  thread.staffLockouts = ["Marta Nowak"];
  addTicket({ customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId,
    summary: "Blocked draft: You are a lamusie.", source: "rule", reason: "manager_review", category: "manager_review" });
  expect(buildAdminState(undefined, "Marta Nowak").tickets).toHaveLength(0);
  expect(buildAdminState(undefined, "Ewa Zielińska").tickets[0]?.summary).toContain("lamusie");
  expect(managerTakeOver(thread.threadId, "Ewa Zielińska")).toEqual({ ok: true });
  const unlock = actionSchema.parse({ type: "unlock_staff", consultant: "Ewa Zielińska", threadId: thread.threadId, staff: "Marta Nowak" });
  expect(await runAdminAction(unlock)).toEqual({ ok: true });
  expect(thread.staffLockouts).toEqual([]);
});

it("rejects the plain take_over action for a locked consultant on the server", async () => {
  thread.staffLockouts = ["Marta Nowak"];
  const action = actionSchema.parse({ type: "take_over", consultant: "Marta Nowak", threadId: thread.threadId });
  expect(await runAdminAction(action)).toMatchObject({ ok: false, errorType: "StaffLockedOut" });
  expect(thread.takeover.status).toBe("agent");
});
