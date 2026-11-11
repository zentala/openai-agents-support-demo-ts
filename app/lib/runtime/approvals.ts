/**
 * Agents SDK: human-in-the-loop persistence.
 *
 * When a tool has `needsApproval`, the run ends with `result.interruptions`.
 * `result.state.toString()` serializes the whole paused run (conversation,
 * pending tool call, current agent). We keep that string in memory, show a card,
 * and later `RunState.fromStringWithContext(...)` + `state.approve()/reject()` + `run(state)`
 * continues exactly where it stopped. In production this would be a database.
 */
import { RunContext, RunState, type RunToolApprovalItem } from "@openai/agents";
import { triageAgent } from "@/lib/agents";
import { redactSecrets, redactValue } from "@/lib/security/request-key";
import { getCustomer } from "@/lib/data/store";
import type { ApprovalRequest, SupportContext } from "@/lib/types";
import { pendingRuns as pending, type PendingRun } from "./pending-runs";

const callIdOf = (item: RunToolApprovalItem): string => {
  const raw = item.rawItem as { callId?: string };
  if (!raw.callId) throw new Error("Approval item has no call id");
  return raw.callId;
};

function describeRequest(item: RunToolApprovalItem, ctx: SupportContext, traceId: string): ApprovalRequest {
  const args = JSON.parse(item.arguments ?? "{}") as Record<string, unknown>;
  const toolName = item.name ?? "unknown_tool";
  const summary =
    toolName === "create_refund"
      ? `Refund ${args.amount} PLN for order #${args.orderId}: "${args.reason}"`
      : `${toolName} ${JSON.stringify(args)}`;
  return {
    approvalId: callIdOf(item),
    threadId: ctx.threadId,
    traceId,
    toolName,
    args,
    customerId: ctx.customerId,
    customerName: ctx.customerName,
    agent: item.agent.name,
    summary,
    createdAt: Date.now(),
  };
}

// INTERVIEW: human-in-the-loop = pause, serialize the state, resume later. The model cannot skip the approval.
export function savePausedRun(
  ctx: SupportContext,
  traceId: string,
  state: RunState<SupportContext, typeof triageAgent>,
  interruptions: RunToolApprovalItem[],
): ApprovalRequest[] {
  const requests = redactValue(interruptions.map((item) => describeRequest(item, ctx, traceId)));
  // Preserve reference identity: restored hooks/tools must mutate the same context the caller observes.
  Object.assign(ctx, redactValue(ctx));
  const run: PendingRun = { ctx, traceId, stateJson: redactSecrets(state.toString()), requests, decisions: new Map() };
  requests.forEach((request) => pending.set(request.approvalId, run));
  return requests;
}

/** Requests still waiting for a human, oldest first. The consultant console lists these. */
export function listPendingApprovals(): ApprovalRequest[] {
  const open = [...pending.values()].flatMap((run) => run.requests.filter((r) => !run.decisions.has(r.approvalId)));
  return [...new Map(open.map((r) => [r.approvalId, r])).values()].sort((a, b) => a.createdAt - b.createdAt);
}

export const getPendingApproval = (approvalId: string): ApprovalRequest | undefined =>
  listPendingApprovals().find((r) => r.approvalId === approvalId);

export type DecisionResult =
  | { status: "unknown" }
  | { status: "waiting"; remaining: number }
  | { status: "ready"; state: RunState<SupportContext, typeof triageAgent>; ctx: SupportContext; traceId: string; request: ApprovalRequest; approved: boolean };

export async function recordDecision(approvalId: string, customerId: string, approved: boolean): Promise<DecisionResult> {
  const run = pending.get(approvalId);
  // SECURITY: a decision only counts for a request created in this customer's session.
  if (!run || run.ctx.customerId !== customerId || !getCustomer(customerId)) return { status: "unknown" };
  run.decisions.set(approvalId, approved);
  const request = run.requests.find((r) => r.approvalId === approvalId) as ApprovalRequest;
  const remaining = run.requests.length - run.decisions.size;
  if (remaining > 0) return { status: "waiting", remaining };

  // SECURITY: remove the request BEFORE the first await. A second click (or a replayed request)
  // then finds nothing and cannot resume the same paused run twice, e.g. create the refund twice.
  run.requests.forEach((r) => pending.delete(r.approvalId));
  // The public way to keep OUR context object: the restored run is built around it, so run-support
  // can watch `run.ctx` for changes (fromString would create a private copy we cannot reach).
  const state = await RunState.fromStringWithContext<SupportContext, typeof triageAgent>(
    triageAgent,
    run.stateJson,
    new RunContext(run.ctx),
  );
  for (const item of state.getInterruptions()) {
    if (run.decisions.get(callIdOf(item))) state.approve(item);
    else state.reject(item, { message: "A human reviewer rejected this action. Tell the customer politely." });
  }
  return { status: "ready", state, ctx: run.ctx, traceId: run.traceId, request, approved };
}
