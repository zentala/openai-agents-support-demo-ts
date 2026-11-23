/**
 * The consultant console's write side: one validated entry point for every action.
 *
 * Takeover, reply, approval decision and rating all arrive as ONE tagged union (`type`), are checked
 * with zod at the boundary, and are dispatched to the runtime modules that hold the real rules.
 *
 * SECURITY: `consultant` must be a name from the fixed list. It is still client-supplied in this demo
 * (see consultants.ts); the access control in front of it is proxy.ts.
 */
import { z } from "zod";
import { MAX_INPUT_LENGTH } from "@/lib/config";
import { resolveApproval } from "@/lib/runtime/approval-flow";
import { handBack, managerTakeOver, takeOver } from "@/lib/runtime/takeover";
import { sendStaffReply } from "./staff-reply";
import { isConsultant, isManager } from "./consultants";
import { rateAnswer } from "./rate-answer";
import { openTicket } from "@/lib/runtime/tickets";
import { getThread } from "@/lib/runtime/threads";
import type { ActionResponse } from "./types";

const base = { consultant: z.string().refine(isConsultant, "Unknown consultant") };
const threadId = z.string().min(8).max(100);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("take_over"), ...base, threadId }),
  z.object({ type: z.literal("unlock_staff"), consultant: z.string().refine(isManager, "Only a manager may unlock staff"), threadId, staff: z.string().refine(isConsultant, "Unknown staff member") }),
  z.object({ type: z.literal("escalate_manager"), ...base, threadId, reason: z.string().trim().min(3).max(300) }),
  z.object({ type: z.literal("hand_back"), ...base, threadId, note: z.string().trim().max(MAX_INPUT_LENGTH).optional() }),
  z.object({ type: z.literal("reply"), ...base, threadId, text: z.string().trim().min(1).max(MAX_INPUT_LENGTH) }),
  z.object({ type: z.literal("take_over_and_reply"), ...base, threadId, text: z.string().trim().min(1).max(MAX_INPUT_LENGTH) }),
  z.object({ type: z.literal("decide_approval"), ...base, approvalId: z.string().min(1).max(200), approve: z.boolean() }),
  z.object({
    type: z.literal("rate"),
    ...base,
    threadId,
    entryId: z.string().min(1).max(100),
    rating: z.enum(["up", "down"]),
    correction: z.string().max(MAX_INPUT_LENGTH).optional(),
  }),
]);

export type ValidAction = z.infer<typeof actionSchema>;

export async function runAdminAction(action: ValidAction): Promise<ActionResponse> {
  if (action.type !== "unlock_staff" && action.type !== "decide_approval") {
    const thread = getThread(action.threadId);
    if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${action.threadId}` };
    if (thread.staffLockouts?.includes(action.consultant) && !isManager(action.consultant)) {
      return { ok: false, errorType: "StaffLockedOut", message: "This consultant is locked out of this conversation. A manager must unlock access." };
    }
  }
  switch (action.type) {
    case "take_over":
      return isManager(action.consultant) ? managerTakeOver(action.threadId, action.consultant) : takeOver(action.threadId, action.consultant);
    case "unlock_staff": {
      const thread = getThread(action.threadId);
      if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${action.threadId}` };
      thread.staffLockouts = (thread.staffLockouts ?? []).filter((name) => name !== action.staff);
      delete thread.blockedReplies?.[action.staff];
      return { ok: true };
    }
    case "escalate_manager": {
      const thread = getThread(action.threadId);
      if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${action.threadId}` };
      const summary = `Consultant ${action.consultant} requested manager review: ${action.reason}`;
      const { findOpenTicketForThread } = await import("@/lib/data/store");
      const existing = findOpenTicketForThread(thread.threadId);
      if (existing) { existing.category = "manager_requested"; existing.reason = "manager_requested"; existing.summary += `\n${summary}`; }
      else openTicket({ customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId,
        summary, source: "rule", reason: "manager_requested", category: "manager_requested" });
      return { ok: true };
    }
    case "hand_back":
      return handBack(action.threadId, action.consultant, action.note);
    case "reply":
    case "take_over_and_reply":
      return await sendStaffReply(action);
    case "rate": {
      const rated = rateAnswer({ ...action });
      return rated.ok ? { ok: true } : rated;
    }
    case "decide_approval": {
      const resolved = await resolveApproval(action.approvalId, action.approve, action.consultant);
      return resolved.ok ? { ok: true } : resolved;
    }
  }
}
