/** Explicit Agents SDK tool intent for customer reply chips. This tool never creates money or a ticket. */
import { tool } from "@openai/agents";
import { z } from "zod";
import { MAX_INPUT_LENGTH } from "@/lib/config";
import { offerQuickReplies } from "@/lib/runtime/quick-replies";
import type { SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

const parameters = z.object({ kind: z.enum(["escalation", "refund"]),
  orderId: z.string().max(40).nullable(), amount: z.number().nullable(), reason: z.string().max(MAX_INPUT_LENGTH).nullable() });

function replyChoicesTool(allowRefund: boolean) { return tool<typeof parameters, SupportContext>({
  name: "offer_reply_choices",
  description: "Offer Yes/No reply buttons before offering a human colleague or asking the customer to confirm refund details. For escalation use null refund fields. For a refund supply the owned order, amount and customer reason. Ask the returned prompt and wait; this does not create a ticket or refund.",
  parameters,
  errorFunction: toolErrorHandler("offer_reply_choices"),
  execute: async (input, runContext) => {
    const session = sessionOf(runContext);
    if (input.kind === "refund") {
      if (!allowRefund) return asData("offer_reply_choices", { ok: false, message: "Only the Orders agent may offer refund confirmation." });
      const unverified = requireVerified(session);
      if (unverified) return unverified;
    }
    return asData("offer_reply_choices", offerQuickReplies(session, input));
  },
}); }
export const offerReplyChoices = replyChoicesTool(true);
export const offerEscalationChoices = replyChoicesTool(false);
