/**
 * Handoff hook logic: what deterministic code does the moment Triage hands the
 * conversation to a specialist.
 *
 * Agents SDK concept: `handoff(agent, { inputType, onHandoff })`. The model fills the
 * `inputType` arguments when it calls `transfer_to_<agent>`; `onHandoff` then runs OUR code
 * with the live run context, which it may mutate. Tools and later turns see the change.
 */
import { z } from "zod";
import { findOrderForCustomer } from "@/lib/data/store";
import type { SupportContext } from "@/lib/types";

/** Longest handoff reason kept in the context (it is shown in the panel). */
export const MAX_HANDOFF_REASON = 160;

/** Arguments the model supplies when handing off to the Orders agent. Nullable, not optional: OpenAI strict schemas need every key. */
export const ordersHandoffInput = z.object({
  reason: z.string().describe("Why the customer needs this specialist, in one short sentence"),
  orderId: z.string().nullable().describe("Order number the customer named, or null if none"),
});

/** Arguments for the FAQ handoff: only a reason. */
export const faqHandoffInput = z.object({
  reason: z.string().describe("Which policy topic the customer asks about, in one short sentence"),
});

export type HandoffInput = { reason?: string; orderId?: string | null };

/**
 * Writes `handoffReason` and, when the model named an order, `activeOrderId` into the context.
 * SECURITY: the order id comes from the MODEL, which read the customer's text. It is only kept
 * after an ownership check, so a hijacked Triage cannot point the specialist at someone else's order.
 * The reason is model-written text: it is displayed in the panel but never put into a prompt.
 */
export function applyHandoffInput(context: SupportContext, input: HandoffInput | undefined): void {
  const reason = input?.reason?.replace(/\s+/g, " ").trim().slice(0, MAX_HANDOFF_REASON);
  if (reason) context.handoffReason = reason;
  if (input?.orderId) {
    const order = findOrderForCustomer(context.customerId, input.orderId);
    if (order) context.activeOrderId = order.id;
  }
}
