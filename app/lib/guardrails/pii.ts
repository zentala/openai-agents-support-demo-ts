/**
 * Card-number detection shared by the input normalizer and the leak guardrail.
 * A digit run only counts as a card when it passes the Luhn checksum, so order
 * numbers and phone numbers are not masked by mistake.
 */

/** 13-19 digits, optionally separated by single spaces or dashes. */
const CARD_CANDIDATE = /\b(?:\d[ -]?){12,18}\d\b/g;

export function luhnValid(digits: string): boolean {
  let sum = 0;
  let double = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (double) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    double = !double;
  }
  return sum % 10 === 0;
}

export function findCardNumbers(text: string): string[] {
  return (text.match(CARD_CANDIDATE) ?? []).filter((candidate) =>
    luhnValid(candidate.replace(/\D/g, "")),
  );
}

export const CARD_MASK = "[card number removed]";

export function maskCardNumbers(text: string): { text: string; count: number } {
  let count = 0;
  const masked = text.replace(CARD_CANDIDATE, (candidate) => {
    if (!luhnValid(candidate.replace(/\D/g, ""))) return candidate;
    count++;
    return CARD_MASK;
  });
  return { text: masked, count };
}
