/**
 * The address change, effectful half: collecting the draft, proposing the change with a confirmation card,
 * and applying it ONLY when the customer's click arrives.
 *
 * Why the model cannot apply it: `update_address_change` only ever creates a PROPOSAL (kept on the thread)
 * and shows the card. The change is written by `decideAddressChange`, which runs when the Confirm button's
 * structured click reaches the server - typing "yes" in the chat does nothing.
 *
 * SECURITY: the click is checked again against the stored proposal (it must exist, match the order, belong to
 * this customer, and the order must still be in transit), so a replayed or forged click changes nothing.
 */
import { currentAddress, findOrderForCustomer, setDeliveryAddress } from "@/lib/data/store";
import { pick } from "@/lib/escalation/notices";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { Thread } from "@/lib/runtime/threads";
import { slotViews } from "@/lib/slots/slots";
import type { Address, AddressDecision, AddressDraft } from "@/lib/types";
import { ADDRESS_SLOTS, addressFieldSchemas, checkAddressChangeAllowed } from "./address-schema";

export type AddressFields = { orderId: string | null; street: string | null; city: string | null; postalCode: string | null };
export type FieldProblem = { field: string; code: string; message: string };

const oneLine = (a: Address) => `${a.street}, ${a.postalCode} ${a.city}`;

/** Merges what the customer just said into the draft; a bad value comes back as `rejected` with the reason. */
export function mergeAddressFields(customerId: string, draft: AddressDraft, incoming: AddressFields): { draft: AddressDraft; rejected: FieldProblem[] } {
  const next: AddressDraft = { ...draft };
  const rejected: FieldProblem[] = [];
  if (incoming.orderId?.trim()) {
    const order = findOrderForCustomer(customerId, incoming.orderId);
    const allowed = checkAddressChangeAllowed(order);
    if (allowed.ok && order) next.orderId = order.id;
    else if (!allowed.ok) rejected.push({ field: "orderId", code: allowed.code, message: allowed.message });
  }
  for (const field of ["street", "city", "postalCode"] as const) {
    const value = incoming[field]?.trim();
    if (!value) continue;
    const parsed = addressFieldSchemas[field].safeParse(value);
    if (parsed.success) next[field] = parsed.data;
    else rejected.push({ field, code: "INVALID_VALUE", message: parsed.error.issues[0].message });
  }
  return { draft: next, rejected };
}

export function publishAddressSlots(threadId: string, draft: AddressDraft, outcome?: string): void {
  emitAgentEvent(threadId, { kind: "slots", form: "address-change", title: "Delivery address change", slots: slotViews(ADDRESS_SLOTS, draft), outcome });
}

/** All slots filled: store the proposal on the thread and show the old-vs-new card. Nothing is changed yet. */
export function proposeAddressChange(thread: Thread, draft: Required<AddressDraft>): void {
  const order = findOrderForCustomer(thread.customerId, draft.orderId);
  if (!order) return;
  const newAddress: Address = { street: draft.street, city: draft.city, postalCode: draft.postalCode };
  const proposalId = crypto.randomUUID();
  thread.pendingAddress = { proposalId, orderId: order.id, oldAddress: currentAddress(order), newAddress };
  emitAgentEvent(thread.threadId, {
    kind: "widget",
    widget: { type: "address-confirm", proposalId, orderId: order.id, prompt: `Change the delivery address of order #${order.id}?`, oldAddress: thread.pendingAddress.oldAddress, newAddress },
  });
  emitAgentEvent(thread.threadId, { kind: "address_change", orderId: order.id, status: "proposed", detail: `${oneLine(thread.pendingAddress.oldAddress)} -> ${oneLine(newAddress)}` });
}

const TEXT = {
  applied: (language: string | undefined, orderId: string, to: string) =>
    pick(language, {
      pl: `Gotowe: zamówienie #${orderId} zostanie dostarczone na adres ${to}.`,
      en: `Done: order #${orderId} will now be delivered to ${to}.`,
      de: `Erledigt: Bestellung #${orderId} wird jetzt an ${to} geliefert.`,
    }),
  cancelled: (language: string | undefined) =>
    pick(language, { pl: "Dobrze, zostawiam dotychczasowy adres dostawy.", en: "Okay, I kept the current delivery address.", de: "In Ordnung, die bisherige Lieferadresse bleibt." }),
  refused: (language: string | undefined, reason: string) =>
    pick(language, { pl: `Nie mogłem zmienić adresu: ${reason}`, en: `I could not change the address: ${reason}`, de: `Die Adresse konnte nicht geändert werden: ${reason}` }),
};

/** The customer clicked Confirm or Cancel on the card. Returns the fixed sentence to show (no model involved). */
export function decideAddressChange(thread: Thread, language: string | undefined, decision: AddressDecision): string {
  const pending = thread.pendingAddress;
  const refuse = (reason: string): string => {
    emitAgentEvent(thread.threadId, { kind: "address_change", orderId: decision.orderId, status: "refused", detail: reason });
    return TEXT.refused(language, reason);
  };
  // SECURITY: the click must match the proposal this thread stored; the proposal is consumed on first use.
  if (!pending || pending.orderId !== decision.orderId) return refuse("there is no pending address change for this order.");
  // SECURITY: an old card must not confirm OR cancel a newer proposal for the same order.
  if (!decision.proposalId || pending.proposalId !== decision.proposalId) return refuse("this address card is stale. Use the latest confirmation card.");
  thread.pendingAddress = undefined;
  if (decision.decision === "cancel") {
    emitAgentEvent(thread.threadId, { kind: "address_change", orderId: pending.orderId, status: "cancelled" });
    return TEXT.cancelled(language);
  }
  const order = findOrderForCustomer(thread.customerId, pending.orderId);
  const allowed = checkAddressChangeAllowed(order);
  if (!allowed.ok) return refuse(allowed.message);
  setDeliveryAddress(pending.orderId, pending.newAddress);
  emitAgentEvent(thread.threadId, { kind: "address_change", orderId: pending.orderId, status: "applied", detail: oneLine(pending.newAddress) });
  publishAddressSlots(thread.threadId, {}, `Order #${pending.orderId} address changed`);
  return TEXT.applied(language, pending.orderId, oneLine(pending.newAddress));
}
