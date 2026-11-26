import { fetchWithRetry } from "./fetch-retry";

/** A 504 can arrive after the origin ran the request; retrying it could create two threads. */
const POST_RETRY_STATUSES = new Set([502, 503]);

/** Creates a server-owned conversation. Retries a sleeping or redeploying server; other HTTP errors stay readable. */
export async function createThread(customerId: string): Promise<string> {
  const response = await fetchWithRetry("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  }, { retryStatuses: POST_RETRY_STATUSES });
  const body = (await response.json().catch(() => ({}))) as { threadId?: string; errorType?: string; message?: string };
  if (!response.ok || !body.threadId) {
    const error = new Error(body.message ?? `HTTP ${response.status}`);
    error.name = body.errorType ?? "ThreadCreateFailed";
    throw error;
  }
  return body.threadId;
}
