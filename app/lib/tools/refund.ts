/**
 * Agents SDK: human-in-the-loop (`needsApproval`) on the refund tool.
 *
 * Flow: the model calls `create_refund`. If `needsApproval` returns true the run
 * does NOT execute the tool; it stops and returns `result.interruptions`.
 * Our server saves the run state, a human clicks Approve/Reject, and the run
 * resumes (see lib/runtime/approvals.ts).
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { CURRENCY, REFUND_APPROVAL_THRESHOLD } from "@/lib/config";
import { addRefund, findOrderForCustomer, refundedSoFar } from "@/lib/data/store";
import { secretStatus } from "@/lib/sensitive/vault";
import type { SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { checkPayout } from "./refund-payout";
import { checkRefund, needsHumanApproval } from "./refund-rules";
import { toolErrorHandler } from "./tool-error";

const parameters = z.object({
  orderId: z.string().describe("Order number the refund is for"),
  amount: z.number().describe(`Amount in ${CURRENCY}; at most the order value`),
  reason: z.string().describe("Short reason given by the customer"),
});

function validate({ customerId, threadId }: SupportContext, input: z.infer<typeof parameters>) {
  const order = findOrderForCustomer(customerId, input.orderId);
  const check = checkRefund({
    customerId,
    order,
    amount: input.amount,
    alreadyRefunded: order ? refundedSoFar(order.id) : 0,
  });
  // Money rules first, then where the money goes (cash-on-delivery orders need a bank account on file).
  return check.ok ? checkPayout(order, threadId) : check;
}

// INTERVIEW: the prompt asks nicely, the code enforces - limits, return window and ownership live here, not in the prompt.
export const createRefund = tool<typeof parameters, SupportContext>({
  name: "create_refund",
  description:
    "Create a refund for one order of the current customer. Only call after the customer " +
    "confirmed order, item and amount. The system enforces policy limits itself.",
  parameters,
  errorFunction: toolErrorHandler("create_refund"),
  // Runs BEFORE execute. Returning true pauses the run for a human decision.
  // SECURITY: invalid requests return false here, so a human is never asked to approve
  // something the rules would refuse anyway; execute() then returns the refusal.
  needsApproval: async (runContext, input) => {
    return validate(sessionOf(runContext), input).ok && needsHumanApproval(input.amount, REFUND_APPROVAL_THRESHOLD);
  },
  execute: async (input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    // SECURITY: rules are checked again at execution time (after the human approved) -
    // never trust that an earlier check is still valid.
    const check = validate(session, input);
    if (!check.ok) return asData("create_refund", { status: "REFUSED", ...check });
    const { customerId } = session;
    const order = findOrderForCustomer(customerId, input.orderId);
    // The model sees a STATUS ("IBAN_PROVIDED (last 4: 1234)"), never the number itself.
    const payout = order?.paymentMethod === "cash_on_delivery" ? secretStatus(session.threadId, "iban") : undefined;
    const refund = addRefund({ customerId, orderId: input.orderId, amount: input.amount, reason: input.reason, payout });
    return asData("create_refund", {
      status: "REFUND_CREATED",
      payout,
      refundId: refund.id,
      orderId: refund.orderId,
      amount: refund.amount,
      currency: CURRENCY,
    });
  },
});
