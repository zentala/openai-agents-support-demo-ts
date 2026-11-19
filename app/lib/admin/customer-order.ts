/** Trusted customer/profile projection for the existing guarded admin thread read. No model output is read. */
import { currentAddress, findOrderForCustomer, getCustomer } from "@/lib/data/store";
import { CURRENCY } from "@/lib/config";
import { GUEST_ID, type CustomerOrderView } from "@/lib/types";
import type { Thread } from "@/lib/runtime/threads";

export function customerOrderOf(thread: Thread): CustomerOrderView {
  // SECURITY: even forged active-order memory must not disclose data for an unverified guest.
  const customer = thread.customerId === GUEST_ID ? undefined : getCustomer(thread.customerId);
  if (!customer) return { status: "unverified" };
  // SECURITY: recheck ownership at read time. No selected order means no order, never "first order".
  const order = thread.memory.activeOrderId ? findOrderForCustomer(customer.id, thread.memory.activeOrderId) : undefined;
  return {
    status: "verified",
    customer: { name: customer.name, email: customer.email, language: customer.language,
      ...(customer.defaultAddress ? { defaultAddress: { ...customer.defaultAddress } } : {}) },
    order: order ? {
      orderId: order.id, status: order.status, items: order.items.map((item) => ({ ...item })), currency: CURRENCY,
      deliveryAddress: { ...currentAddress(order), country: order.deliveryCountry },
    } : null,
  };
}
