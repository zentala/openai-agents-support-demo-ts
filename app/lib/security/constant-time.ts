/**
 * Compares two strings without stopping at the first different character, so the time it takes gives no
 * hint about how much of a secret (a password, an e-mail, a postal code) was right.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  let diff = a.length ^ b.length;
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  return diff === 0;
}
