"use client";

/**
 * Browser side of the two server -> browser channels of a thread (both are Server-Sent Events):
 *
 * - CUSTOMER channel (`/api/threads/<id>/stream`): chat messages, "colleague joined", widgets. Authorized by
 *   the thread's httpOnly cookie, which the browser attaches by itself.
 * - INSPECTOR channel (`/api/admin/inspector/<id>/stream`): everything, for the Agent View. Protected like
 *   the consultant console. If the server refuses (wrong or missing console password) the status becomes
 *   "refused" and the panel says so instead of staying silently empty.
 *
 * `EventSource` is the browser's built-in SSE client: it opens a long GET request, calls `onmessage` for
 * every `data:` line, and reconnects by itself if the connection drops. A refusal (HTTP 401/403) closes it
 * for good (`readyState === CLOSED`), which is how we tell "refused" from "reconnecting".
 */
import { useEffect, useState } from "react";
import type { AgentEvent } from "@/lib/types";

export type ChannelStatus = "connecting" | "open" | "refused";

function useEventChannel(url: string | null, onEvent: (event: AgentEvent) => void): ChannelStatus {
  const [status, setStatus] = useState<ChannelStatus>("connecting");
  useEffect(() => {
    if (!url) return;
    const source = new EventSource(url);
    source.onopen = () => setStatus("open");
    source.onmessage = (message) => onEvent(JSON.parse(message.data) as AgentEvent);
    source.onerror = () => setStatus(source.readyState === EventSource.CLOSED ? "refused" : "connecting");
    // Close on unmount / thread change, otherwise every conversation would leave a connection open.
    return () => source.close();
  }, [url, onEvent]);
  return status;
}

const enc = encodeURIComponent;

export const useCustomerChannel = (threadId: string | null, onEvent: (event: AgentEvent) => void): ChannelStatus =>
  useEventChannel(threadId ? `/api/threads/${enc(threadId)}/stream` : null, onEvent);

export const useInspectorChannel = (threadId: string | null, onEvent: (event: AgentEvent) => void): ChannelStatus =>
  useEventChannel(threadId ? `/api/admin/inspector/${enc(threadId)}/stream` : null, onEvent);
