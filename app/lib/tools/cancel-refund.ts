/**
 * Agents SDK: cancel an owner's demo refund before payout, without moving money.
 * SECURITY: session identity, order ownership and refund ownership are checked in code.
 * Cancellation is synchronous; repeated calls cannot cancel twice or reverse a paid refund.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { CURRENCY } from "@/lib/config";
import { findOrderForCustomer, listRefunds } from "@/lib/data/store";
import type { SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

const parameters = z.object({
  orderId: z.string().describe("Order number whose refund the customer wants to cancel"),
  refundId: z.string().nullable().describe("Refund ID if known, else null; never guess between multiple refunds"),
});
const REFUSAL_INSTRUCTION = "Explain the refusal and offer escalation to a consultant. Do not promise a reversal.";

export const cancelRefund = tool<typeof parameters, SupportContext>({
  name: "cancel_refund",
  description: "Cancel the current customer's demo refund before payout. Use the order number and a known refund ID, or null when unknown. Paid refunds cannot be reversed. Multiple refund records, including cancelled or paid ones, require an explicit choice.",
  parameters,
  errorFunction: toolErrorHandler("cancel_refund"),
  execute: async (input, runContext) => {
    const session = sessionOf(runContext);
    const unverified = requireVerified(session);
    if (unverified) return unverified;
    const respond = (payload: unknown) => asData("cancel_refund", payload);
    const order = findOrderForCustomer(session.customerId, input.orderId);
    if (!order) return respond({ status: "REFUSED", code: "ORDER_NOT_FOUND", message: "No such order for this customer.", instruction: REFUSAL_INSTRUCTION });
    // SECURITY: checking both owners prevents a forged/misassociated refund from authorizing a change.
    const owned = listRefunds().filter((refund) => refund.customerId === session.customerId && refund.orderId === order.id);
    // SECURITY: history participates in ambiguity; a retry must never advance to another pending refund.
    const candidates = input.refundId ? owned.filter((refund) => refund.id === input.refundId) : owned;
    if (candidates.length === 0) return respond({ status: "REFUSED", code: "REFUND_NOT_FOUND", message: "No such refund for this customer's order.", instruction: REFUSAL_INSTRUCTION });
    if (candidates.length > 1) return respond({ status: "REFUND_SELECTION_REQUIRED",
      refunds: candidates.map(({ id, amount, status }) => ({ refundId: id, amount, status })),
      instruction: "Ask which refund the customer wants to cancel; do not choose one yourself." });
    const refund = candidates[0];
    const details = { refundId: refund.id, orderId: order.id, amount: refund.amount, currency: CURRENCY };
    if (refund.status === "cancelled") return respond({ status: "REFUND_ALREADY_CANCELLED", ...details });
    if (refund.status !== "pending_payout") return respond({ status: "REFUSED", ...details,
      code: refund.status === "paid" ? "REFUND_ALREADY_PAID" : "REFUND_NOT_CANCELLABLE",
      message: refund.status === "paid" ? "This refund has already been paid out and cannot be cancelled." : "This refund is not in a cancellable state.",
      instruction: REFUSAL_INSTRUCTION });
    // No await between the state check and mutation: payout/cancellation cannot interleave here.
    refund.status = "cancelled";
    refund.cancelledAt = new Date().toISOString();
    return respond({ status: "REFUND_CANCELLED", ...details });
  },
});
