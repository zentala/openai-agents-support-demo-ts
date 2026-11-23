/** Customer feedback for one server transcript entry; quote and author are resolved server-side. */
import { z } from "zod";
import { isPublicDemo } from "@/lib/security/request-key";
import { authorizeThread } from "@/lib/security/thread-access";
import { createMessageConcern } from "@/lib/runtime/message-concerns";

const schema = z.object({ entryId: z.string().uuid(), kind: z.enum(["report", "question"]), reason: z.string().trim().min(3).max(300) });

export async function POST(request: Request, { params }: { params: Promise<{ threadId: string }> }) {
  const { threadId } = await params;
  if (isPublicDemo() && !authorizeThread(request, threadId).ok) return Response.json({ ok: false, errorType: "ThreadAccessDenied", message: "This browser cannot access that conversation." }, { status: 403 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ ok: false, errorType: "InvalidRequest", message: "Provide a short reason for this message." }, { status: 400 });
  const result = createMessageConcern(threadId, parsed.data.entryId, parsed.data.reason, parsed.data.kind);
  return Response.json(result, { status: result.ok ? 201 : 404 });
}
