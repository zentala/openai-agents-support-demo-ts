/**
 * Structured widget clicks: turns an `OrderSelection` from the browser into a context update.
 * The click is data, not a prompt: the server checks it and writes it into the context itself,
 * so the model never has to be trusted with (or asked to repeat) the order id.
 */
import { findOrderForCustomer, orderTotal } from "@/lib/data/store";
import type { MutableContext, OrderSelection } from "@/lib/types";

export type SelectionResult =
  | { ok: true; memory: MutableContext; text: string }
  | { ok: false; message: string };

/**
 * SECURITY: the browser could send any order id, so ownership is checked here with the
 * customer id from the session. "Not yours" and "does not exist" give the same answer.
 */
export function applySelection(customerId: string, memory: MutableContext, selection: OrderSelection): SelectionResult {
  const order = findOrderForCustomer(customerId, selection.orderId);
  if (!order) return { ok: false, message: `No order ${selection.orderId} for this customer` };
  const names = order.items.map((item) => item.name).join(", ");
  return {
    ok: true,
    memory: { ...memory, activeOrderId: order.id },
    text: `I pick order #${order.id} (${names}, ${orderTotal(order)} PLN).`,
  };
}
