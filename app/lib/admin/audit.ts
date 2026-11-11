/**
 * Audit trail for human decisions on paused agent actions (refund approvals).
 *
 * Every record answers: who decided (consultant), when, what, and under which OpenAI trace.
 * INTERVIEW: "An approval without a name and a timestamp is not an approval you can defend in an audit."
 */
import { addAudit, type AuditRecord } from "@/lib/data/store";
import type { ApprovalRequest } from "@/lib/types";

/** Pure: the record for one decision. `now` is a parameter so tests do not depend on the clock. */
export function buildAuditRecord(
  request: ApprovalRequest,
  approved: boolean,
  decidedBy: string,
  now: Date = new Date(),
): Omit<AuditRecord, "id"> {
  return {
    approvalId: request.approvalId,
    threadId: request.threadId,
    traceId: request.traceId,
    customerId: request.customerId,
    toolName: request.toolName,
    summary: request.summary,
    decision: approved ? "approved" : "rejected",
    decidedBy,
    decidedAt: now.toISOString(),
  };
}

export const recordAudit = (request: ApprovalRequest, approved: boolean, decidedBy: string): AuditRecord =>
  addAudit(buildAuditRecord(request, approved, decidedBy));
