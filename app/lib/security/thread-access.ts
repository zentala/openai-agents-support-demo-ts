/**
 * One gate for every customer-side request that names a thread: chat, event stream, photo upload,
 * secure forms. A route calls `authorizeThread` first and returns `access.response` when it is refused.
 *
 * Order of checks matters: a wrong credential is refused BEFORE we say whether the thread exists, so
 * thread ids cannot be probed.
 */
import { getThread, type Thread } from "@/lib/runtime/threads";
import { readCredential, THREAD_ID_PATTERN, verifyCredential } from "./thread-credential";

export type ThreadAccess = { ok: true; thread: Thread } | { ok: false; response: Response };

const refuse = (status: number, errorType: string, message: string): ThreadAccess => ({
  ok: false,
  response: Response.json({ errorType, message }, { status }),
});

export function authorizeThread(request: Request, threadId: string): ThreadAccess {
  if (!THREAD_ID_PATTERN.test(threadId)) return refuse(400, "InvalidThreadId", "Malformed thread id");
  // SECURITY: no valid credential, no access - not even to learn whether the thread exists.
  if (!verifyCredential(threadId, readCredential(request, threadId))) {
    return refuse(403, "ThreadCredentialError", "Missing or invalid conversation credential. Start a new conversation.");
  }
  const thread = getThread(threadId);
  if (!thread) {
    return refuse(404, "UnknownThread", "This conversation no longer exists (the server restarted or the conversation limit was reached). Start a new conversation.");
  }
  return { ok: true, thread };
}
