/** Creates a server-owned conversation. Keep HTTP errors readable to both the chat and inspector. */
export async function createThread(customerId: string): Promise<string> {
  const response = await fetch("/api/threads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ customerId }),
  });
  const body = (await response.json().catch(() => ({}))) as { threadId?: string; errorType?: string; message?: string };
  if (!response.ok || !body.threadId) {
    const error = new Error(body.message ?? `HTTP ${response.status}`);
    error.name = body.errorType ?? "ThreadCreateFailed";
    throw error;
  }
  return body.threadId;
}
