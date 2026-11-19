/**
 * Demo helper: forget all refunds, tickets, audit records, ratings and the metrics log so scenarios
 * can be replayed.
 * SECURITY: wipes data, so it is disabled in production builds unless the
 * operator opts in with ALLOW_DEMO_RESET=true (a local demo server, never a real store).
 */
import { resetDemoData } from "@/lib/data/store";
import { clearEventLog } from "@/lib/runtime/event-bus";
import { isPublicDemo } from "@/lib/security/request-key";
import { isAdminAuthorized } from "@/lib/admin/auth";

export async function POST(req?: Request) {
  if ((isPublicDemo() || process.env.NODE_ENV === "production") && process.env.ALLOW_DEMO_RESET !== "true") {
    return Response.json({ errorType: "NotAvailable", message: "Reset is disabled in production" }, { status: 404 });
  }
  // SECURITY: a global maintenance operation must never become a visitor-scoped console action.
  if (isPublicDemo() && (!process.env.ADMIN_PASSWORD || !isAdminAuthorized(req?.headers.get("authorization") ?? null, process.env.ADMIN_PASSWORD))) {
    return Response.json({ errorType: "AdminPasswordRequired", message: "Global reset requires the operator password." }, { status: 403 });
  }
  resetDemoData();
  clearEventLog();
  return Response.json({ ok: true });
}
