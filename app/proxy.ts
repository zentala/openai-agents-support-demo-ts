/**
 * Next.js proxy (called "middleware" before Next 16): runs before a request reaches a page or route.
 * Here it guards the consultant console and the demo reset. See lib/admin/auth.ts and lib/admin/csrf.ts.
 *
 * `config.matcher` restricts it to /admin pages, /api/admin routes and /api/reset, so the customer
 * chat stays open. The Agent View inspector channel lives under /api/admin on purpose: it shows tool
 * arguments, order data and guardrail reasoning, so it is protected like the console.
 *
 * SECURITY: two checks, in this order. 1) Basic password (when ADMIN_PASSWORD is set). 2) Origin check on
 * state-changing methods, because cached Basic credentials are sent by the browser on cross-site POSTs.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isAdminAuthorized } from "@/lib/admin/auth";
import { checkSameOrigin, csrfHeadersOf } from "@/lib/admin/csrf";

export function proxy(request: NextRequest) {
  if (!isAdminAuthorized(request.headers.get("authorization"), process.env.ADMIN_PASSWORD)) {
    // 401 + WWW-Authenticate makes the browser show its own password dialog.
    return new NextResponse("Authentication required: this is the Nordic Home consultant console.", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Nordic Home consultant console"' },
    });
  }
  const csrf = checkSameOrigin(csrfHeadersOf(request));
  if (!csrf.ok) {
    return NextResponse.json({ ok: false, errorType: "CrossSiteRequest", message: csrf.reason }, { status: 403 });
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin/:path*", "/api/admin/:path*", "/api/reset"] };
