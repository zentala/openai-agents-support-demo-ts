/** Thread eviction must preserve paused refunds; explicit removal must revoke every associated approval. */
import { beforeEach, describe, expect, it } from "vitest";
import { POST as openThread } from "@/app/api/threads/route";
import { getPendingApproval, listPendingApprovals, recordDecision, savePausedRun } from "@/lib/runtime/approvals";
import { resolveApproval } from "@/lib/runtime/approval-flow";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, getThread, listThreads, MAX_THREADS, removeThread, type Thread } from "@/lib/runtime/threads";

/** Only the SDK serialization boundary is synthetic; our registries, decisions and HTTP route are real. */
function pause(thread: Thread, count = 1): string[] {
  const ids = Array.from({ length: count }, () => crypto.randomUUID());
  const items = ids.map((callId) => ({
    rawItem: { callId }, name: "create_refund",
    arguments: JSON.stringify({ orderId: "1002", amount: 3200, reason: "too big" }),
    agent: { name: "Orders & Refunds Agent" },
  }));
  savePausedRun(sessionContextOf(thread), "trace_test", { toString: () => "{}" } as never, items as never);
  return ids;
}

beforeEach(() => {
  for (const thread of listThreads()) removeThread(thread.threadId);
  for (const request of listPendingApprovals()) removeThread(request.threadId);
});

describe("thread and approval lifecycle", () => {
  it("skips the oldest paused thread and evicts the next oldest without an approval", () => {
    const protectedThread = createThread("c-anna");
    const [approvalId] = pause(protectedThread);
    const nextOldest = createThread("c-james");
    for (let i = 0; i < MAX_THREADS - 2; i++) createThread("c-james");
    const newest = createThread("c-james");
    expect(getThread(protectedThread.threadId)).toBe(protectedThread);
    expect(getPendingApproval(approvalId)?.threadId).toBe(protectedThread.threadId);
    expect(getThread(nextOldest.threadId)).toBeUndefined();
    expect(getThread(newest.threadId)).toBe(newest);
    expect(listThreads()).toHaveLength(MAX_THREADS);
  });

  it("removal clears all keys of a partly decided run and leaves another thread's approval intact", async () => {
    const thread = createThread("c-anna");
    const ids = pause(thread, 2);
    const other = createThread("c-anna");
    const [otherId] = pause(other);
    expect(await recordDecision(ids[0], "c-anna", true)).toEqual({ status: "waiting", remaining: 1 });
    removeThread(thread.threadId);
    expect(getThread(thread.threadId)).toBeUndefined();
    for (const id of ids) {
      expect(getPendingApproval(id)).toBeUndefined();
      expect(await recordDecision(id, "c-anna", true)).toEqual({ status: "unknown" });
      expect(await resolveApproval(id, true, "Test consultant")).toMatchObject({ ok: false, errorType: "UnknownApproval" });
    }
    expect(getPendingApproval(otherId)?.threadId).toBe(other.threadId);
    expect(getThread(other.threadId)).toBe(other);
  });

  it("keeps a partly decided thread protected until its last decision", async () => {
    const thread = createThread("c-anna");
    const ids = pause(thread, 2);
    await recordDecision(ids[0], "c-anna", true);
    for (let i = 0; i < MAX_THREADS; i++) createThread("c-james");
    expect(getThread(thread.threadId)).toBe(thread);
    expect(getPendingApproval(ids[1])).toBeDefined();
  });

  it("returns a specific 429 without issuing a cookie when every retained thread is paused", async () => {
    for (let i = 0; i < MAX_THREADS; i++) pause(createThread("c-anna"));
    const oldest = listThreads()[0];
    const response = await openThread(new Request("http://demo.local/api/threads", {
      method: "POST", body: JSON.stringify({ customerId: "c-james" }),
    }));
    expect(response.status).toBe(429);
    expect(await response.json()).toMatchObject({ errorType: "ThreadCapacityError", message: expect.stringContaining("waiting for approval") });
    expect(response.headers.has("set-cookie")).toBe(false);
    expect(listThreads()).toHaveLength(MAX_THREADS);
    expect(getThread(oldest.threadId)).toBe(oldest);
    expect(listPendingApprovals()).toHaveLength(MAX_THREADS);
  });
});
