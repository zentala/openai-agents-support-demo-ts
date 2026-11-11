/**
 * Payout rule for refunds, kept apart from the pure rules in refund-rules.ts because it reads the vault.
 *
 * A cash-on-delivery order was paid in cash, so there is no card to refund to: the money goes to a bank
 * account the customer gives us. The account arrives through the secure form (never the chat), so the
 * model cannot be talked into "just using" a number from the conversation.
 */
import type { Order } from "@/lib/data/store";
import { hasValidIban } from "@/lib/sensitive/vault";
import type { RefundCheck } from "./refund-rules";

export function checkPayout(order: Order | undefined, threadId: string): RefundCheck {
  if (order?.paymentMethod !== "cash_on_delivery" || hasValidIban(threadId)) return { ok: true };
  return {
    ok: false,
    code: "BANK_ACCOUNT_REQUIRED",
    message: "This order was paid cash on delivery, so the refund needs a bank account. Call request_bank_account to show the secure form.",
    policy: "refund-policy",
  };
}
