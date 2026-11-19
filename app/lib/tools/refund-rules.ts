/**
 * Refund business rules as a PURE function (no I/O, easy to unit-test).
 *
 * Concept (Agents SDK: tools): the model only *asks* for a refund. Whether it
 * is allowed is decided here, in code, so a jailbroken prompt cannot bypass it.
 * SECURITY: ownership, amount cap and return window are enforced in code, not in the prompt.
 */
import { RETURN_WINDOW_DAYS } from "@/lib/config";
import { orderTotal, type Order } from "@/lib/data/store";

export type RefundCheck =
  | { ok: true }
  | { ok: false; code: RefundRefusalCode; message: string; policy?: string };

export type RefundRefusalCode =
  | "ORDER_NOT_FOUND"
  | "NOT_DELIVERED"
  | "WINDOW_EXPIRED"
  | "INVALID_AMOUNT"
  | "AMOUNT_EXCEEDS_ORDER"
  | "BANK_ACCOUNT_REQUIRED";

type RefundCheckInput = {
  /** From the session, never from the model's arguments. */
  customerId: string;
  /** Result of `findOrderForCustomer`; undefined when missing or not owned. */
  order: Order | undefined;
  amount: number;
  /** Money already refunded for this order. */
  alreadyRefunded: number;
};

export function checkRefund({ customerId, order, amount, alreadyRefunded }: RefundCheckInput): RefundCheck {
  // Defense in depth: even if the caller forgot to filter by owner, we check again.
  if (!order || order.customerId !== customerId) {
    return { ok: false, code: "ORDER_NOT_FOUND", message: "No such order for this customer." };
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return { ok: false, code: "INVALID_AMOUNT", message: "Refund amount must be a positive number." };
  }
  if (order.status !== "delivered" || order.deliveredDaysAgo === null) {
    return {
      ok: false,
      code: "NOT_DELIVERED",
      message: "The order has not been delivered yet, so it cannot be returned or refunded.",
      policy: "returns-policy",
    };
  }
  if (order.deliveredDaysAgo > RETURN_WINDOW_DAYS) {
    return {
      ok: false,
      code: "WINDOW_EXPIRED",
      message: `Delivered ${order.deliveredDaysAgo} days ago; the return window is ${RETURN_WINDOW_DAYS} days.`,
      policy: "returns-policy",
    };
  }
  const refundable = orderTotal(order) - alreadyRefunded;
  if (amount > refundable) {
    return {
      ok: false,
      code: "AMOUNT_EXCEEDS_ORDER",
      message: `Amount ${amount} is higher than the refundable value of the order (${refundable}).`,
      policy: "refund-policy",
    };
  }
  return { ok: true };
}

/** True when a human must approve before the refund runs. */
export const needsHumanApproval = (amount: number, threshold: number): boolean => amount > threshold;
