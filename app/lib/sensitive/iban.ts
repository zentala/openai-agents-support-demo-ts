/**
 * IBAN (bank account number) validation, pure and library-free.
 *
 * Two jobs: the secure form route calls `isValidIban` to refuse a mistyped number, and the input
 * guardrails use `IBAN_SHAPES` to spot an account number typed into the chat. The checksum is the ISO 13616
 * "mod 97" test: move the first four characters to the end, turn letters into numbers (A=10 ... Z=35),
 * and the whole number must leave remainder 1 when divided by 97.
 *
 * Why not a library: this is 15 lines of arithmetic, and a teaching repo should show it.
 */

/** Exact IBAN length per country, for the countries this demo sells to. Others are checked by shape only. */
const IBAN_LENGTH: Record<string, number> = { PL: 28, DE: 22, GB: 22, FR: 27, ES: 24, IT: 27, NL: 18, SE: 24, DK: 18, NO: 15, CZ: 24 };

/** Strips spaces and dashes and upper-cases: "pl61 1090-1014" -> "PL611090 1014" -> compact form. */
export const compactIban = (raw: string): string => raw.replace(/[\s-]/g, "").toUpperCase();

export function isValidIban(raw: string): boolean {
  const iban = compactIban(raw);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  const expectedLength = IBAN_LENGTH[iban.slice(0, 2)];
  if (expectedLength !== undefined && iban.length !== expectedLength) return false;
  const rearranged = iban.slice(4) + iban.slice(0, 4);
  let remainder = 0;
  for (const char of rearranged) {
    const value = char >= "A" ? char.charCodeAt(0) - 55 : Number(char);
    // Feed the digits in one value at a time so the number never exceeds what a JS number holds exactly.
    remainder = Number(`${remainder}${value}`) % 97;
  }
  return remainder === 1;
}

export const lastFour = (raw: string): string => compactIban(raw).slice(-4);

/**
 * Groups may be separated by a space, a dash, a dot or a slash ("PL61.1090.1014...", "PL61/1090/..."), or not at all.
 * What an account number typed into a message looks like. Matched by SHAPE, not by checksum: a number with
 * a typo is still a bank account number and must not reach the model.
 * 1) country letters + 2 check digits + one 4-character bank code (may hold letters, like GB's "NWBK") + digit
 *    groups, 2) a bare 26-digit Polish account. After the bank code only DIGITS are accepted, so ordinary words
 *    written after the number ("... 2874 thanks") are not swallowed by the mask.
 */
const SEPARATOR = String.raw`[\s.\/-]?`;
export const IBAN_SHAPES: RegExp[] = [
  new RegExp(String.raw`\b[A-Za-z]{2}\d{2}${SEPARATOR}[A-Za-z0-9]{4}(?:${SEPARATOR}\d{4}){2,6}(?:${SEPARATOR}\d{1,4})?\b`, "g"),
  new RegExp(String.raw`\b\d{2}(?:${SEPARATOR}\d{4}){6}\b`, "g"),
];
