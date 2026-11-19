/** Staff-only diagnostics export with the same access policy as the inspector event stream. */
import { AGENT_MODEL, GUARDRAIL_MODEL } from "@/lib/config";
import { listAudit, listClaims, listRefunds, listTickets } from "@/lib/data/store";
import { listPendingApprovals } from "@/lib/runtime/approvals";
import { readEventLog } from "@/lib/runtime/event-bus";
import { sanitizeDiagnostics } from "@/lib/runtime/diagnostics-export";
import { getThread } from "@/lib/runtime/threads";
import { THREAD_ID_PATTERN } from "@/lib/security/thread-credential";
import { refuseForeignThread } from "@/lib/admin/visitor-access";
import { isPublicDemo } from "@/lib/security/request-key";

export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (!THREAD_ID_PATTERN.test(threadId)) return Response.json({ errorType: "InvalidThreadId", message: "Malformed thread id" }, { status: 400 });
  const refused = refuseForeignThread(request, threadId);
  if (refused) return refused;
  const thread = getThread(threadId);
  if (!thread) return Response.json({ errorType: "UnknownThread", message: "This conversation no longer exists." }, { status: 404 });

  const events = readEventLog().filter((row) => row.threadId === threadId).map((row) => row.event);
  const snapshot = sanitizeDiagnostics({
    app: { version: process.env.npm_package_version ?? "1.0.0", commit: process.env.GIT_COMMIT ?? process.env.COMMIT_SHA ?? "unknown" },
    models: { agent: AGENT_MODEL, guardrail: GUARDRAIL_MODEL },
    publicDemo: isPublicDemo(),
    thread: { threadId, traceId: thread.traceId, messages: thread.transcript },
    events,
    tickets: listTickets().filter((ticket) => ticket.threadId === threadId),
    approvals: {
      pending: listPendingApprovals().filter((approval) => approval.threadId === threadId),
      audit: listAudit().filter((record) => record.threadId === threadId),
    },
    refunds: listRefunds().filter((refund) => refund.threadId === threadId),
    claims: listClaims().filter((claim) => claim.threadId === threadId),
  });
  const stamp = new Date().toISOString().replaceAll(":", "-").replaceAll(".", "-");
  return Response.json(snapshot, { headers: {
    "Cache-Control": "no-store",
    "Content-Disposition": `attachment; filename="nordic-home-${threadId}-${stamp}.json"`,
  } });
}
