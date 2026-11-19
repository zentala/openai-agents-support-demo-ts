/**
 * Global limit on verification attempts PER ORDER NUMBER, on top of the per-conversation limit.
 *
 * Why: the per-conversation limit (3) stops guessing inside one chat, but a script can open a new
 * conversation for every 3 guesses. This limit counts attempts against the order number itself, across all
 * conversations: at most 5 per order per hour.
 *
 * SECURITY: every order number a visitor types is counted, whether it exists or not, so hitting the limit
 * says nothing about which order numbers are real. In memory only: a restart forgets it (a real product keeps
 * this in a shared store). The table is capped, expired entries go first, then the oldest.
 */

export const MAX_ATTEMPTS_PER_ORDER = 5;
export const ATTEMPT_WINDOW_MS = 60 * 60 * 1000;
/** Upper bound on tracked order numbers, so typing random numbers cannot grow memory without limit. */
export const MAX_TRACKED_ORDERS = 1000;

const globals = globalThis as unknown as { __nordicOrderAttempts?: Map<string, number[]> };
const attempts = (globals.__nordicOrderAttempts ??= new Map<string, number[]>());

function prune(now: number): void {
  for (const [key, times] of attempts) {
    const recent = times.filter((t) => now - t < ATTEMPT_WINDOW_MS);
    if (recent.length === 0) attempts.delete(key);
    else attempts.set(key, recent);
  }
}

/** Records one attempt against the order. Returns false when the order already had its limit in the last hour. */
export function takeOrderAttempt(orderKey: string, now: number = Date.now()): boolean {
  const key = orderKey.slice(0, 40);
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < ATTEMPT_WINDOW_MS);
  const allowed = recent.length < MAX_ATTEMPTS_PER_ORDER;
  attempts.delete(key); // re-insert at the end: the Map keeps insertion order, oldest first
  // Denied requests must not grow a single bucket or extend its lock forever.
  attempts.set(key, allowed ? [...recent, now] : recent);
  if (attempts.size > MAX_TRACKED_ORDERS) {
    prune(now);
    while (attempts.size > MAX_TRACKED_ORDERS) attempts.delete(attempts.keys().next().value as string);
  }
  return allowed;
}

export const clearOrderAttempts = (): void => attempts.clear();
