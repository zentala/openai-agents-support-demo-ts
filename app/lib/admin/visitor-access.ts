/** Public console access reuses signed per-thread cookies already issued to the visitor's browser. */
import { isPublicDemo } from "@/lib/security/request-key";
import { authorizeThread } from "@/lib/security/thread-access";

/** SECURITY: public mode fails closed without a request. Basic auth never widens visitor scope. */
export function canInspectThread(request: Request | undefined, threadId: string): boolean {
  return !isPublicDemo() || (!!request && authorizeThread(request, threadId).ok);
}

/** Same response for unknown and foreign targets, before reading or changing their records. */
export function refuseForeignThread(request: Request, threadId: string | undefined): Response | undefined {
  if (!isPublicDemo() || (threadId && canInspectThread(request, threadId))) return;
  return Response.json({ ok: false, errorType: "ThreadAccessDenied", message: "This browser cannot access that conversation." },
    { status: 403, headers: { "Cache-Control": "no-store" } });
}
