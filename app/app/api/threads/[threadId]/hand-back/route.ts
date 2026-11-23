/** Let the customer return an active conversation to the assistant using the thread credential. */
import { authorizeThread } from "@/lib/security/thread-access";
import { releaseTakeoverPreservingTickets } from "@/lib/runtime/takeover";

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const access = authorizeThread(request, threadId);
  if (!access.ok) return access.response;
  if (access.thread.takeover.status !== "human" || !access.thread.takeover.consultant) {
    return Response.json({ ok: false, errorType: "NoActiveTakeover", message: "No consultant is handling this conversation." }, { status: 409 });
  }
  releaseTakeoverPreservingTickets(access.thread, access.thread.takeover.consultant);
  return Response.json({ ok: true }, { status: 200 });
}
