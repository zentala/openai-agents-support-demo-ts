/**
 * Agent View inspector channel: EVERY event of one thread (tool calls with order data and e-mail, KB
 * hits, guardrail reasoning, approval requests, errors, trace ids), as Server-Sent Events.
 *
 * SECURITY: this teaching surface shares the consultant console's access rules. In public mode,
 * signed conversation cookies restrict it to this browser's threads. ADMIN_PASSWORD optionally adds
 * Basic authentication without widening that scope. Local mode retains a staff-wide inspector and
 * needs a password before sharing. A production support product would keep its inspector staff-only.
 *
 * In public mode it requires this browser's thread credential before replay or subscription.
 * Local staff mode retains its console-wide view. See admin/visitor-access.ts.
 */
import { eventStreamResponse } from "@/lib/runtime/sse";
import { THREAD_ID_PATTERN } from "@/lib/security/thread-credential";
import { refuseForeignThread } from "@/lib/admin/visitor-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (!THREAD_ID_PATTERN.test(threadId)) {
    return Response.json({ errorType: "InvalidThreadId", message: "Malformed thread id" }, { status: 400 });
  }
  const refused = refuseForeignThread(req, threadId);
  if (refused) return refused;
  return eventStreamResponse(req, threadId, (event) => event);
}
