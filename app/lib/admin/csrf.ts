/**
 * CSRF guard for state-changing requests that are protected by HTTP Basic.
 *
 * The attack: the consultant is signed in to /admin (the browser caches the Basic credentials). A
 * malicious page in another tab submits a POST to /api/admin/actions. The browser attaches the cached
 * credentials by itself, so the server would accept "approve this refund" from a stranger's page.
 *
 * The defense used here is the Origin check: for a cross-site POST the browser ALWAYS sends an
 * `Origin` header naming the attacker's site, and page scripts cannot change it. We refuse a request
 * whose Origin is not our own host. A request with no Origin at all (curl, a script) cannot be a
 * browser CSRF, so it only needs the password.
 *
 * INTERVIEW: "Basic auth has no session token, so CSRF is open by default. I check Origin against Host
 * (and Sec-Fetch-Site as a second signal). A real product would use a session cookie with SameSite plus
 * a CSRF token."
 */

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type CsrfHeaders = {
  method: string;
  origin: string | null;
  host: string | null;
  forwardedHost: string | null;
  fetchSite: string | null;
};

export type CsrfVerdict = { ok: true } | { ok: false; reason: string };

/** Host names this server answers to: the Host header, and the one a reverse proxy (Caddy) forwarded. */
function ownHosts({ host, forwardedHost }: CsrfHeaders): string[] {
  return [host, forwardedHost?.split(",")[0]?.trim()].flatMap((value) => (value ? [value.toLowerCase()] : []));
}

export function checkSameOrigin(headers: CsrfHeaders): CsrfVerdict {
  if (!STATE_CHANGING_METHODS.has(headers.method.toUpperCase())) return { ok: true };

  if (headers.origin !== null) {
    let originHost: string;
    try {
      originHost = new URL(headers.origin).host.toLowerCase();
    } catch {
      // `Origin: null` (sandboxed frame, redirect chain) is not a URL: treat it as foreign.
      return { ok: false, reason: `Origin "${headers.origin}" is not a valid site address` };
    }
    if (!ownHosts(headers).includes(originHost)) {
      return { ok: false, reason: `Cross-site request refused: Origin ${originHost} is not this server` };
    }
    return { ok: true };
  }

  // No Origin: a browser would have sent one for a cross-site POST. Sec-Fetch-Site is the second signal.
  if (headers.fetchSite === "cross-site" || headers.fetchSite === "same-site") {
    return { ok: false, reason: `Cross-site request refused: Sec-Fetch-Site is ${headers.fetchSite}` };
  }
  return { ok: true };
}

/** Reads the relevant headers from a standard `Request` (works for NextRequest too). */
export function csrfHeadersOf(request: Request): CsrfHeaders {
  return {
    method: request.method,
    origin: request.headers.get("origin"),
    host: request.headers.get("host"),
    forwardedHost: request.headers.get("x-forwarded-host"),
    fetchSite: request.headers.get("sec-fetch-site"),
  };
}
