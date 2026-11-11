/**
 * Server-side vault for values that must never pass through the model: a bank account (IBAN) and a
 * callback phone number. They arrive from the secure form route and stay here, keyed by thread.
 *
 * The model only ever receives a STATUS string from `secretStatus`, e.g. "IBAN_PROVIDED (last 4: 1234)".
 * Tools that need the real value (the refund payout) read it with `getSecret`, inside server code.
 *
 * SECURITY: this is in-memory and unencrypted because it is a demo. A real product keeps such values in an
 * encrypted store or, better, never holds them: it passes them to the payment provider and keeps a token.
 * Nothing here is ever logged, put in an event, or returned to the browser except the last four characters.
 */
import { isValidIban, lastFour } from "./iban";
import { lastFourDigits } from "./phone";

export type SecretField = "iban" | "phone";

/** More submissions than this per thread are refused: the form is not a free-text guessing endpoint. */
export const MAX_SUBMISSIONS_PER_THREAD = 6;
/** One entry per conversation (up to two values); refuse new entries instead of losing payout details. */
export const MAX_VAULT_ENTRIES = 100;

const LABEL: Record<SecretField, string> = { iban: "IBAN", phone: "PHONE" };

type Entry = { values: Partial<Record<SecretField, string>>; submissions: number };

const globals = globalThis as unknown as { __nordicVault?: Map<string, Entry> };
const vault = (globals.__nordicVault ??= new Map<string, Entry>());

const lastFourOf = (field: SecretField, value: string): string => (field === "iban" ? lastFour(value) : lastFourDigits(value));

export type StoreResult = { ok: true; status: string } | { ok: false; errorType: "TooManySubmissions" | "VaultFull"; message: string };

export function storeSecret(threadId: string, field: SecretField, value: string): StoreResult {
  if (!vault.has(threadId) && vault.size >= MAX_VAULT_ENTRIES) {
    return { ok: false, errorType: "VaultFull", message: "Demo secure storage is full. Contact a consultant." };
  }
  const entry = vault.get(threadId) ?? { values: {}, submissions: 0 };
  if (entry.submissions >= MAX_SUBMISSIONS_PER_THREAD) {
    return { ok: false, errorType: "TooManySubmissions", message: "Too many submissions in this conversation. Start a new conversation or contact a consultant." };
  }
  entry.submissions++;
  entry.values[field] = value;
  vault.set(threadId, entry);
  return { ok: true, status: secretStatus(threadId, field) };
}

export const getSecret = (threadId: string, field: SecretField): string | undefined => vault.get(threadId)?.values[field];

/** The only description of a secret the model may see. */
export function secretStatus(threadId: string, field: SecretField): string {
  const value = getSecret(threadId, field);
  return value ? `${LABEL[field]}_PROVIDED (last 4: ${lastFourOf(field, value)})` : `${LABEL[field]}_NOT_PROVIDED`;
}

/** True when a valid bank account is on file for the thread (the refund rule for cash-on-delivery orders). */
export const hasValidIban = (threadId: string): boolean => {
  const iban = getSecret(threadId, "iban");
  return iban !== undefined && isValidIban(iban);
};

export const clearVault = (): void => vault.clear();
