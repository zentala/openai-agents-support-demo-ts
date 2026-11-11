/**
 * A consultant decides a paused action (refund approval) in the console.
 *
 * Flow: look up the pending request -> record the decision -> write the audit record -> resume the
 * saved run -> push the agent's final answer to the customer's chat (nobody is waiting on a request).
 *
 * SECURITY: the decider's identity is recorded, but in this demo it is only a name picked in the
 * console. Production needs the identity from SSO and a rule for who may approve which amount.
 */
import { recordAudit } from "@/lib/admin/audit";
import { requestApiKey } from "@/lib/security/request-key";
import type { ApprovalRequest } from "@/lib/types";
import { emitAgentEvent } from "./event-bus";
import { getPendingApproval, recordDecision } from "./approvals";
import { observeRun } from "./run-observer";
import { executeSupportRun, type RunOutcome } from "./run-support";
import { getThread } from "./threads";
import { finishTurn } from "./turn-finish";

export type ResolveResult =
  | { ok: false; errorType: string; message: string }
  | { ok: true; outcome: RunOutcome; request: ApprovalRequest };

const UNKNOWN: ResolveResult = {
  ok: false,
  errorType: "UnknownApproval",
  message: "That approval request no longer exists (already decided).",
};

export async function resolveApproval(approvalId: string, approved: boolean, decidedBy: string): Promise<ResolveResult> {
  const request = getPendingApproval(approvalId);
  if (!request) return UNKNOWN;
  // SECURITY: refuse before consuming the decision; the consultant supplies their own request key.
  try { requestApiKey(); } catch {
    const message = "Add your OpenAI key to resume this approval";
    emitAgentEvent(request.threadId, { kind: "error", errorType: "VisitorKeyRequired", message, where: "approval resume" });
    return { ok: false, errorType: "VisitorKeyRequired", message };
  }
  const decision = await recordDecision(approvalId, request.customerId, approved);
  if (decision.status === "unknown") return UNKNOWN;

  recordAudit(request, approved, decidedBy);
  emitAgentEvent(request.threadId, { kind: "approval_decision", approvalId, toolName: request.toolName, approved, decidedBy });
  if (decision.status === "waiting") {
    return { ok: true, request, outcome: { reply: `Decision saved. Waiting for ${decision.remaining} more approval(s).`, approvals: [] } };
  }

  const stopObserving = observeRun(request.threadId);
  const outcome = await executeSupportRun(decision.state, decision.ctx, decision.traceId);
  const observed = stopObserving();
  const thread = getThread(request.threadId);
  // Without a thread (server restarted in between) there is no chat to push to; the audit record still exists.
  return { ok: true, request, outcome: thread ? finishTurn(thread, decision.ctx, outcome, observed, "push") : outcome };
}
