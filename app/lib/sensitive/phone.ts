/**
 * Phone number validation and detection, pure.
 *
 * Accepted format: an optional "+" or "00" country prefix, then 9-15 digits, with spaces, dashes and
 * parentheses allowed as separators ("+48 600 100 200", "600-100-200", "(22) 123 45 67", "0044 20 7946 0958").
 * It is a format check, not proof that the number rings: real products verify by sending a code.
 */

const MIN_DIGITS = 9;
const MAX_DIGITS = 15;

const digitsOf = (raw: string): string => raw.replace(/\D/g, "");

/** True for a phone number in the accepted format. */
export function isValidPhone(raw: string): boolean {
  const trimmed = raw.trim();
  if (!/^(?:\+|00)?[\d\s()-]+$/.test(trimmed)) return false;
  const digits = digitsOf(trimmed).length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS;
}

export const lastFourDigits = (raw: string): string => digitsOf(raw).slice(-4);

/**
 * A run of digits that could be a phone number inside free text. The dot is NOT a separator on purpose
 * ("12.11.2026" is a date), and ISO dates are excluded by `looksLikeDate`.
 */
export const PHONE_SHAPE = /(?<![\w@.+-])(?:\+|00)?\d(?:[ ()-]?\d){8,14}(?![\w@])/g;

/** Dates and times share the digit-and-dash look of phone numbers; they are not phones. */
export const looksLikeDate = (candidate: string): boolean => /^\d{4}-\d{2}-\d{2}/.test(candidate.trim());

export function isPhoneCandidate(candidate: string): boolean {
  const digits = digitsOf(candidate).length;
  return digits >= MIN_DIGITS && digits <= MAX_DIGITS && !looksLikeDate(candidate);
}
