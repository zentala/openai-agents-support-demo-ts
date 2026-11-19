/**
 * Demo-only protection for the consultant console: HTTP Basic with ONE shared password.
 *
 * If env ADMIN_PASSWORD is set, every /admin request must carry it (any user name). If it is not set,
 * the console is open and shows an "unprotected demo console" banner. The check is a pure function so
 * both directions can be unit-tested; `proxy.ts` calls it for /admin pages and /api/admin routes.
 *
 * SECURITY: a shared password is NOT real access control. Production needs per-person login (SSO),
 * roles (who may approve refunds) and rate limiting. CSRF for the POST actions is handled in csrf.ts.
 */
import { constantTimeEqual } from "@/lib/security/constant-time";

/**
 * Basic credentials are base64 of BYTES. `atob` returns one character per byte (latin1), so a password
 * like "zażółć" would never match. We turn the bytes back into text as UTF-8, which is what browsers send.
 */
function decodeBasicCredentials(encoded: string): string | undefined {
  try {
    const binary = atob(encoded);
    return new TextDecoder("utf-8", { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
  } catch {
    return undefined; // not valid base64, or not valid UTF-8
  }
}

/** True when the request may use the console. `password` unset or empty means "unprotected demo". */
export function isAdminAuthorized(authorization: string | null, password: string | undefined): boolean {
  if (!password) return true;
  if (!authorization?.startsWith("Basic ")) return false;
  const decoded = decodeBasicCredentials(authorization.slice("Basic ".length).trim());
  if (decoded === undefined) return false;
  const separator = decoded.indexOf(":");
  if (separator < 0) return false;
  return constantTimeEqual(decoded.slice(separator + 1), password);
}

export const isAdminProtected = (password: string | undefined = process.env.ADMIN_PASSWORD): boolean => Boolean(password);
