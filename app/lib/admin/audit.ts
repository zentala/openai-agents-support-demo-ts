/**
 * Audit trail for human decisions on paused agent actions and staff reply tone warnings.
 *
 * Every record answers: who decided (consultant), when, what, and under which OpenAI trace.
 * INTERVIEW: "An approval without a name and a timestamp is not an approval you can defend in an audit."
 */
import { addAudit, type AuditRecord } from "@/lib/data/store";
import type { ApprovalRequest } from "@/lib/types";
import type { Thread } from "@/lib/runtime/threads";

/** Staff tone records reuse the guarded audit stream without storing a second copy of the message. */
export function recordToneAudit(thread: Thread, consultant: string, warningId: string, decision: "tone_warning" | "sent_after_warning"): AuditRecord {
  return addAudit({ threadId: thread.threadId, traceId: thread.traceId, customerId: thread.customerId,
    warningId, toolName: "consultant_reply", decision, decidedBy: consultant, decidedAt: new Date().toISOString(),
    summary: decision === "tone_warning" ? "Reply tone warning shown; no message sent." : "Reply sent after explicit tone acknowledgement." });
}

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
