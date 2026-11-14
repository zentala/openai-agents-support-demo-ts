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
import { handBack, takeOver } from "@/lib/runtime/takeover";
import { sendStaffReply } from "./staff-reply";
import { isConsultant } from "./consultants";
import { rateAnswer } from "./rate-answer";
import type { ActionResponse } from "./types";

const base = { consultant: z.string().refine(isConsultant, "Unknown consultant") };
const threadId = z.string().min(8).max(100);

export const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("take_over"), ...base, threadId }),
  z.object({ type: z.literal("hand_back"), ...base, threadId, note: z.string().trim().max(MAX_INPUT_LENGTH).optional() }),
  z.object({ type: z.literal("reply"), ...base, threadId, text: z.string().trim().min(1).max(MAX_INPUT_LENGTH), toneAcknowledgement: z.string().uuid().optional() }),
  z.object({ type: z.literal("take_over_and_reply"), ...base, threadId, text: z.string().trim().min(1).max(MAX_INPUT_LENGTH), toneAcknowledgement: z.string().uuid().optional() }),
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
  switch (action.type) {
    case "take_over":
      return takeOver(action.threadId, action.consultant);
    case "hand_back":
      return handBack(action.threadId, action.consultant, action.note);
    case "reply":
    case "take_over_and_reply":
      return sendStaffReply(action);
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
