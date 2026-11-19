/** Shared server-side recognition of a missing-delivery dispute in customer-owned thread history. */
import { findOrderForCustomer, listOrdersForCustomer, type Order } from "@/lib/data/store";
import { isDeliveryDisputeReason } from "@/lib/tools/refund-rules";

/** A short unambiguous affirmative can accept the consultant offer in the prior assistant turn. */
export function isShortAffirmative(text: string): boolean {
  if (text.trim().length > 40) return false;
  return /^(?:yes(?:,? please)?|please|sure|okay|ok|ja(?:,? bitte)?|bitte|gerne|tak(?:,? proszę)?|proszę|zgoda)[.!\s]*$/i.test(text.trim());
}

export function disputedDeliveryOrder(customerId: string, activeOrderId: string | undefined, customerMessages: string[]): Order | undefined {
  if (!customerMessages.some(isDeliveryDisputeReason)) return undefined;
  const owned = listOrdersForCustomer(customerId);
  const named = owned.find((order) => customerMessages.some((message) => new RegExp(`(?:^|\\D)#?${order.id}(?:\\D|$)`).test(message)));
  const order = (named ? findOrderForCustomer(customerId, named.id) : undefined) ??
    (activeOrderId ? findOrderForCustomer(customerId, activeOrderId) : undefined);
  return order?.status === "delivered" ? order : undefined;
}
