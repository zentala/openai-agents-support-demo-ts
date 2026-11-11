/**
 * Guest verification: a visitor who is not logged in proves they own an order by giving the order number
 * plus the E-MAIL stored for it. A postal code may be added as a second factor, but never replaces the
 * e-mail (a postal code is easy to guess and often printed on parcels). Only then does the thread become
 * that customer's.
 *
 * INTERVIEW: "Verification is code, not conversation. The model relays strings to a tool; the tool decides,
 * counts attempts per thread AND per order number, and the answer never says WHICH part was wrong - so the
 * chat cannot be used to learn whether an order number exists or what e-mail belongs to it."
 *
 * SECURITY: two limits. 3 attempts per conversation, and 5 per order number per hour across ALL conversations
 * (lib/guest/order-attempts.ts), so a script that opens many chats cannot guess either. A real product also
 * limits per IP and sends a code to the address on file instead of accepting an address typed by the visitor.
 */
import { customers, normalizeOrderId, orders, type Customer, type Order } from "@/lib/data/store";
import { constantTimeEqual } from "@/lib/security/constant-time";
import { GUEST_ID } from "@/lib/types";
import type { Thread } from "@/lib/runtime/threads";
import { takeOrderAttempt } from "./order-attempts";

export const MAX_VERIFICATION_ATTEMPTS = 3;

export type VerifyResult =
  | { status: "VERIFIED"; customer: Customer }
  | { status: "ALREADY_VERIFIED" }
  | { status: "VERIFICATION_FAILED"; attemptsLeft: number }
  | { status: "LOCKED" };

const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();
const normalizePostal = (raw: string): string => raw.replace(/[\s-]/g, "").toUpperCase();

/**
 * Pure: does the proof match the order's customer? The e-mail must match; a postal code, when given, must
 * match too. Both are compared on every call, without an early exit based on which field matches.
 */
export function proofMatches(order: Order | undefined, customer: Customer | undefined, email: string, postalCode?: string | null): boolean {
  // Unknown orders still run both comparisons against nonmatching placeholders.
  const emailOk = constantTimeEqual(normalizeEmail(email), customer ? normalizeEmail(customer.email) : "-");
  const postalOk = constantTimeEqual(normalizePostal(postalCode ?? ""), customer ? normalizePostal(customer.postalCode) : "-");
  const postalAcceptable = postalCode ? postalOk : true;
  return Boolean(order && customer) && emailOk && postalAcceptable;
}

export function verifyGuest(thread: Thread, rawOrderId: string, email: string, postalCode?: string | null, now: number = Date.now()): VerifyResult {
  if (thread.customerId !== GUEST_ID) return { status: "ALREADY_VERIFIED" };
  // SECURITY: a locked thread refuses even the right answer, otherwise the lock would only slow guessing down.
  if (thread.verification.attempts >= MAX_VERIFICATION_ATTEMPTS) return { status: "LOCKED" };
  thread.verification.attempts++;

  const orderId = normalizeOrderId(rawOrderId);
  // Counted for every order number, real or not: reaching the limit reveals nothing about which orders exist.
  if (!takeOrderAttempt(orderId.toLowerCase(), now)) return { status: "LOCKED" };

  const order = orders.find((o) => o.id === orderId);
  const customer = order ? customers.find((c) => c.id === order.customerId) : undefined;
  const matches = proofMatches(order, customer, email, postalCode);
  if (customer && matches) {
    // SECURITY: from here on the session IS this customer, for this thread only (the cookie is per thread).
    thread.customerId = customer.id;
    return { status: "VERIFIED", customer };
  }
  return { status: "VERIFICATION_FAILED", attemptsLeft: MAX_VERIFICATION_ATTEMPTS - thread.verification.attempts };
}
