/**
 * Random ids in the browser that work over plain HTTP too.
 *
 * Browsers expose `crypto.randomUUID()` only in a "secure context" (HTTPS or
 * localhost). Served from e.g. http://demo.example it is undefined and the
 * page crashes on load. `crypto.getRandomValues()` is available everywhere, so we
 * build a version-4 UUID from it when `randomUUID` is missing.
 */
export function randomId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
