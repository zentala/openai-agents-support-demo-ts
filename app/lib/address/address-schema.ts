/**
 * Delivery address change: the slots to collect, how each field is validated, and which orders may change.
 *
 * The rule that matters (INTERVIEW: "state-changing actions get an explicit confirmation step"): only an order
 * that is still IN TRANSIT can get a new address - a delivered order has nowhere left to go. Enforced in code,
 * at proposal time AND again when the customer confirms.
 */
import { z } from "zod";
import type { Order } from "@/lib/data/store";
import type { SlotSpec } from "@/lib/slots/slots";
import type { Address } from "@/lib/types";

export const ADDRESS_SLOTS: readonly SlotSpec[] = [
  { key: "orderId", label: "Order", question: "Which order should be delivered to a new address?", required: true },
  { key: "street", label: "Street and number", question: "What is the street and house number of the new address?", required: true },
  { key: "city", label: "City", question: "In which city?", required: true },
  { key: "postalCode", label: "Postal code", question: "What is the postal code?", required: true },
];

/** Per-field format rules. The model's guess is checked here, not trusted. */
export const addressFieldSchemas = {
  street: z.string().trim().min(3, "street and number are too short").max(120),
  city: z.string().trim().min(2, "city is too short").max(80),
  postalCode: z.string().trim().regex(/^[A-Za-z0-9][A-Za-z0-9 -]{1,8}[A-Za-z0-9]$/, "postal code looks wrong (3-10 letters, digits, space or dash)"),
} as const;

export const addressSchema = z.object({ ...addressFieldSchemas, country: z.string().trim().toUpperCase().length(2).optional() });

export type OrderRule = { ok: true } | { ok: false; code: string; message: string };

/** Format checks only: these do not establish that a street or postal code exists. */
const POSTAL_FORMATS = {
  PL: /^\d{2}-\d{3}$/,
  GB: /^(?:GIR\s*0AA|[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2})$/i,
  DE: /^\d{5}$/,
};

/** SECURITY: the order supplies the country authority at both proposal and Confirm. */
export function checkAddressCountry(order: Order, address: Partial<Address>): OrderRule {
  const country = order.deliveryCountry;
  if (!Object.hasOwn(POSTAL_FORMATS, country)) {
    return { ok: false, code: "COUNTRY_UNSUPPORTED", message: "The order has no supported delivery country." };
  }
  if (address.country !== undefined && address.country.trim().toUpperCase() !== country) {
    return { ok: false, code: "COUNTRY_CHANGE_NOT_ALLOWED", message: `Delivery must stay in ${country}; changing country is not supported.` };
  }
  if (address.postalCode !== undefined && !POSTAL_FORMATS[country].test(address.postalCode.trim())) {
    return { ok: false, code: "POSTAL_CODE_COUNTRY_MISMATCH", message: `The postal code must match ${country}'s format; delivery cannot move to another country.` };
  }
  return { ok: true };
}

/** Revalidate stored proposals as well as freshly merged fields. */
export function checkProposedAddress(order: Order, address: Address): OrderRule {
  const parsed = addressSchema.safeParse(address);
  if (!parsed.success) return { ok: false, code: "INVALID_ADDRESS", message: "The stored address is invalid." };
  return checkAddressCountry(order, parsed.data);
}

/** Only an order that is still on its way can change address. */
export function checkAddressChangeAllowed(order: Order | undefined): OrderRule {
  if (!order) return { ok: false, code: "ORDER_NOT_FOUND", message: "No such order for this customer." };
  if (order.status !== "in_transit") {
    return { ok: false, code: "ORDER_DELIVERED", message: "This order has already been delivered, so its delivery address can no longer be changed." };
  }
  return { ok: true };
}

export const sameAddress = (a: Address, b: Address): boolean =>
  [a.street, a.city, a.postalCode].every((part, i) => part.trim().toLowerCase() === [b.street, b.city, b.postalCode][i].trim().toLowerCase());
