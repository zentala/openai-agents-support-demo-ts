/**
 * Builds the typed run context from a stored thread.
 *
 * SECURITY: identity comes from the thread the SERVER created, never from the chat request body.
 * A guest thread has no real customer: the context carries the neutral `guest` id until the
 * verification tool binds the thread to a customer.
 */
import { getCustomer } from "@/lib/data/store";
import { GUEST_ID, type SupportContext } from "@/lib/types";
import type { Thread } from "./threads";

export function sessionContextOf(thread: Thread): SupportContext {
  if (thread.customerId === GUEST_ID) {
    return { customerId: GUEST_ID, customerName: "Guest (not verified)", threadId: thread.threadId };
  }
  const customer = getCustomer(thread.customerId);
  return {
    customerId: thread.customerId,
    customerName: customer?.name ?? thread.customerId,
    language: customer?.language,
    threadId: thread.threadId,
  };
}
