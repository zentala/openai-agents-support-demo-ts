/**
 * Server-Sent Events helper shared by the customer channel and the Agent View inspector channel.
 *
 * SSE vs WebSocket: SSE is one-way (server to browser), works over plain HTTP, reconnects by itself.
 * The browser sends through normal POST requests, so one-way is all we need.
 *
 * Replay: a browser opens the stream a moment AFTER the server made the thread, and a fast turn (an
 * escalation rule, a normalization notice) can emit its events before the connection exists. So a new
 * subscriber first receives the thread's earlier events from the bounded event log. The browser removes
 * duplicates by event id, so replay and live delivery can safely overlap.
 *
 * `project` decides what each subscriber may see: the customer channel passes `toCustomerEvent`, the
 * inspector passes everything. Returning `undefined` drops the event for this subscriber.
 */
import type { AgentEvent } from "@/lib/types";
import { readEventLog, subscribeToThread } from "./event-bus";

const HEARTBEAT_MS = 15_000;

export function eventStreamResponse(
  request: Request,
  threadId: string,
  project: (event: AgentEvent) => AgentEvent | undefined,
): Response {
  const encoder = new TextEncoder();
  let cleanup = () => {};
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const send = (text: string) => controller.enqueue(encoder.encode(text));
      const deliver = (event: AgentEvent) => {
        const visible = project(event);
        if (visible) send(`data: ${JSON.stringify(visible)}\n\n`);
      };
      // Replay, then subscribe: both run synchronously, so no event can fall between them.
      for (const logged of readEventLog()) if (logged.threadId === threadId) deliver(logged.event);
      const unsubscribe = subscribeToThread(threadId, deliver);
      // A comment line keeps proxies from closing an idle connection.
      const heartbeat = setInterval(() => send(": keep-alive\n\n"), HEARTBEAT_MS);
      cleanup = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      send(": connected\n\n");
      request.signal.addEventListener("abort", () => {
        cleanup();
        controller.close();
      });
    },
    cancel: () => cleanup(),
  });
  return new Response(body, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}
