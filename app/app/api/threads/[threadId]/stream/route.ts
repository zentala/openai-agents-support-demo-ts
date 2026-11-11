/**
 * Server -> customer channel for ONE thread, as Server-Sent Events (SSE).
 *
 * Why it exists: the chat request stream only lives while the customer's own request runs. A
 * consultant reply, a "colleague joined" notice or the answer after an approval happens LATER,
 * so the browser keeps this long-lived GET open and the server pushes events into it.
 *
 * SECURITY: two gates. 1) The thread's HMAC cookie (lib/security) - a guessable thread or customer id
 * is not enough, and a thread cannot be pre-subscribed because it must already exist. 2) Only
 * customer-visible events pass (lib/runtime/event-visibility.ts): chat messages, takeover state and
 * widgets. Tool calls, order data, KB hits, guardrail reasoning and trace ids stay on the inspector
 * channel (/api/admin/inspector/...). The browser removes duplicates by event id.
 */
import { toCustomerEvent } from "@/lib/runtime/event-visibility";
import { eventStreamResponse } from "@/lib/runtime/sse";
import { authorizeThread } from "@/lib/security/thread-access";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  const access = authorizeThread(req, threadId);
  if (!access.ok) return access.response;
  return eventStreamResponse(req, threadId, toCustomerEvent);
}
