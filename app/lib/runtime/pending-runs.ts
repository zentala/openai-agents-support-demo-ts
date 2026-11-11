/**
 * Shared paused-run registry, without runtime imports of agents or threads.
 * Keeping lifecycle queries here avoids an agents -> tools -> threads -> approvals import cycle.
 * The approvals module serializes/restores runs; the thread registry only protects or removes them.
 */
import type { ApprovalRequest, SupportContext } from "@/lib/types";

export type PendingRun = {
  ctx: SupportContext;
  traceId: string;
  stateJson: string;
  requests: ApprovalRequest[];
  /** approvalId -> approved? ; the run resumes when every request has an entry. */
  decisions: Map<string, boolean>;
};

const globals = globalThis as unknown as { __nordicPending?: Map<string, PendingRun> };
/** Keyed by approvalId; multiple requests may point to the same paused run. */
export const pendingRuns = (globals.__nordicPending ??= new Map<string, PendingRun>());

/** Partly decided runs remain protected until their last approval has been decided. */
export const hasPendingRun = (threadId: string): boolean =>
  [...pendingRuns.values()].some((run) => run.ctx.threadId === threadId);

/** SECURITY: a removed conversation must not leave an actionable refund approval behind. */
export function clearPendingRunsForThread(threadId: string): void {
  for (const [approvalId, run] of pendingRuns) {
    if (run.ctx.threadId === threadId) pendingRuns.delete(approvalId);
  }
}
