/**
 * One conversation for the console (GET): transcript, takeover state, ratings of its answers.
 */
import { buildThreadView } from "@/lib/admin/state";
import { refuseForeignThread } from "@/lib/admin/visitor-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const refused = refuseForeignThread(req, threadId);
  if (refused) return refused;
  const view = buildThreadView(threadId, req);
  if (!view) {
    return Response.json({ errorType: "UnknownThread", message: `No conversation ${threadId} (the server may have restarted)` }, { status: 404 });
  }
  return Response.json(view, { headers: { "Cache-Control": "no-store" } });
}
