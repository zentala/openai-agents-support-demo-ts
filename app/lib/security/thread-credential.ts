/**
 * Server-issued credential for ONE conversation thread: an HMAC-signed, httpOnly cookie.
 *
 * Why it exists: a thread id alone is not a secret (it is in URLs and logs), and before this file the
 * customer id in a query string was the only thing guarding the thread's event stream. Now the server
 * creates the thread (POST /api/threads) and hands the browser `HMAC(secret, threadId)` in a cookie that
 * page scripts cannot read (`HttpOnly`) and other sites cannot send (`SameSite=Strict`). Every chat,
 * stream, upload and form request for the thread must carry it.
 *
 * SECURITY: the cookie proves "this browser created this thread". It is NOT a login: in this demo the
 * customer is still picked in a dropdown (README, "Limits"). A real product binds the thread to an
 * authenticated user session on the server.
 * SECURITY: SESSION_SECRET signs the cookies. The built-in default below is public (it is in the repo), so
 * anyone can forge credentials for a server that still uses it. Set SESSION_SECRET in production.
 *
 * Node's `crypto.createHmac` makes the signature; `timingSafeEqual` compares without a timing hint.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { isPublicDemo } from "./request-key";

/** DEV DEFAULT ONLY. Public on purpose: it keeps `just dev` working with zero setup. */
const DEV_DEFAULT_SECRET = "dev-only-session-secret-change-me-in-production";

/** Thread ids are server-made UUIDs; this pattern is also what makes them safe inside a cookie NAME. */
export const THREAD_ID_PATTERN = /^[A-Za-z0-9_-]{8,100}$/;

const COOKIE_PREFIX = "nh_thread_";
const COOKIE_MAX_AGE_SECONDS = 24 * 60 * 60;

let warned = false;

/** Only a boolean may cross to the browser; never expose the configured secret. */
export function usesPublicSessionSecret(): boolean {
  return !process.env.SESSION_SECRET || process.env.SESSION_SECRET === DEV_DEFAULT_SECRET;
}

function sessionSecret(): string {
  // SECURITY: a public signing default would let any visitor forge another conversation's cookie.
  if (isPublicDemo() && usesPublicSessionSecret()) throw new Error("SessionSecretRequired: configure a private SESSION_SECRET for public mode.");
  const quietMode = process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test";
  if (usesPublicSessionSecret() && !quietMode && !warned) {
    warned = true;
    console.warn("SESSION_SECRET uses the PUBLIC dev default: anyone can forge thread cookies. Set a private secret before real use.");
  }
  return process.env.SESSION_SECRET || DEV_DEFAULT_SECRET;
}

const sign = (threadId: string): string => createHmac("sha256", sessionSecret()).update(`thread:${threadId}`).digest("base64url");

export const credentialCookieName = (threadId: string): string => `${COOKIE_PREFIX}${threadId}`;

/** True when `presented` is the valid signature for this thread. */
export function verifyCredential(threadId: string, presented: string | undefined): boolean {
  if (isPublicDemo() && usesPublicSessionSecret()) return false;
  if (!presented || !THREAD_ID_PATTERN.test(threadId)) return false;
  const expected = Buffer.from(sign(threadId));
  const actual = Buffer.from(presented);
  // timingSafeEqual throws on different lengths, so compare lengths first.
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** The `Set-Cookie` header value that gives the browser the credential for a new thread. */
export function credentialSetCookie(threadId: string, secure: boolean): string {
  const parts = [`${credentialCookieName(threadId)}=${sign(threadId)}`, "Path=/", "HttpOnly", "SameSite=Strict", `Max-Age=${COOKIE_MAX_AGE_SECONDS}`];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

/** Reads this thread's credential from the request's Cookie header. */
export function readCredential(request: Request, threadId: string): string | undefined {
  const name = credentialCookieName(threadId);
  for (const pair of (request.headers.get("cookie") ?? "").split(";")) {
    const separator = pair.indexOf("=");
    if (separator > 0 && pair.slice(0, separator).trim() === name) return pair.slice(separator + 1).trim();
  }
  return undefined;
}
