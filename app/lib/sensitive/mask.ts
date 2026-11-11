/**
 * Masks bank account numbers and phone numbers typed into the chat, BEFORE any model sees the text.
 * Used by `normalizeInput` (input side) and by the leak guardrail (`containsSensitive`, output side).
 *
 * Why: the model is a third party. Everything it reads goes to an AI provider, into traces and into the
 * conversation history. Sensitive values belong in the secure form, which posts straight to our server.
 * Card numbers are handled by lib/guardrails/pii.ts; this file adds IBANs and phones in the same style.
 *
 * Known trade-off: a bare 9-digit number (a tracking code, say) looks like a phone number and is masked
 * too. A false mask costs the customer one retyped message; a leaked account number costs much more.
 */
import { IBAN_SHAPES } from "./iban";
import { isPhoneCandidate, PHONE_SHAPE } from "./phone";

export const IBAN_MASK = "[bank account number removed]";
export const PHONE_MASK = "[phone number removed]";

export type MaskResult = { text: string; count: number };

export function maskIbans(text: string): MaskResult {
  let count = 0;
  let masked = text;
  for (const shape of IBAN_SHAPES) {
    masked = masked.replace(shape, () => {
      count++;
      return IBAN_MASK;
    });
  }
  return { text: masked, count };
}

/** Run AFTER the card-number mask so a 16-digit card is not mistaken for a phone number. */
export function maskPhones(text: string): MaskResult {
  let count = 0;
  const masked = text.replace(PHONE_SHAPE, (candidate) => {
    if (!isPhoneCandidate(candidate)) return candidate;
    count++;
    return PHONE_MASK;
  });
  return { text: masked, count };
}

/** True when the text holds an account number or a phone number (output-side leak check). */
export function containsSensitive(text: string): { iban: boolean; phone: boolean } {
  const ibans = maskIbans(text);
  return { iban: ibans.count > 0, phone: maskPhones(ibans.text).count > 0 };
}
