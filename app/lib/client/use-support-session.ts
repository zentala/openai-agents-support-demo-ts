"use client";

/**
 * Vercel AI SDK (browser side): `useChat` + our own event list + the thread channels.
 *
 * Concepts shown here:
 * - `useChat` manages the messages, the request and the streaming status.
 * - `DefaultChatTransport` says WHERE to post (`/api/chat`).
 * - `onData` receives the custom data parts (`data-agent-event`) the server writes into the same
 *   stream. They carry only CUSTOMER-VISIBLE events (widgets, "colleague joined").
 * - The customer channel (SSE) delivers what happens OUTSIDE a chat request: consultant replies,
 *   takeover notices, the answer after a consultant approved a refund.
 * - The inspector channel (SSE, protected like /admin) feeds the Agent View with the internal events.
 * - The conversation is created by the SERVER (POST /api/threads), which answers with an httpOnly
 *   credential cookie. The browser never picks a thread id and never states who the customer is in a
 *   chat request: the server stored that with the thread.
 */
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useVisitorKey } from "@/components/visitor-key";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import customers from "@/data/customers.json";
import { GUEST_ID, type AgentEvent, type ChatRequestBody, type SupportUIMessage, type WidgetSelection } from "@/lib/types";
import { toChatMessage, withInspectorCorrelation } from "./pushed-messages";
import { randomId } from "./random-id";
import { createThread } from "./create-thread";
import { useCustomerChannel, useInspectorChannel } from "./use-thread-channel";

/** The "not logged in" entry of the customer selector. */
const GUEST_OPTION = { id: GUEST_ID, name: "Not logged in (guest)", language: "" };
const customerOptions = [...customers, GUEST_OPTION];

/** Errors that never reached the server's own error handling (network, HTTP 4xx/5xx). */
function browserError(error: Error, where = "browser / chat request"): AgentEvent {
  let errorType = "ChatRequestFailed";
  let message = error.message;
  if (error.name !== "Error") errorType = error.name;
  try {
    // Our routes answer bad requests with JSON { errorType, message }.
    const parsed = JSON.parse(error.message) as { errorType?: string; message?: string };
    errorType = parsed.errorType ?? errorType;
    message = parsed.message ?? message;
  } catch {
    /* not JSON: keep the raw text */
  }
  return { kind: "error", errorType, message, where, id: randomId(), ts: Date.now() };
}

/**
 * The panel's event list. The same event can arrive on the chat stream AND the two channels, so
 * each id has one event and bubble. A later inspector copy may complete its internal turn correlation.
 */
function useEventFeed() {
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const seenIds = useRef(new Set<string>());
  const addBubbleRef = useRef<(message: SupportUIMessage) => void>(() => {});

  const addEvent = useCallback((event: AgentEvent) => {
    if (seenIds.current.has(event.id)) {
      if (event.turnId) setEvents((prev) => withInspectorCorrelation(prev, event));
      return;
    }
    seenIds.current.add(event.id);
    setEvents((prev) => [...prev, event]);
    if (event.kind === "chat_message") addBubbleRef.current(toChatMessage(event));
  }, []);

  const clear = useCallback(() => {
    seenIds.current = new Set();
    setEvents([]);
  }, []);

  return { events, addEvent, addBubbleRef, clear };
}

/** The conversation itself: which customer, which server-made thread, and how to open a new one. */
function useThreadLifecycle(addEvent: (event: AgentEvent) => void) {
  const [customerId, setCustomerId] = useState(customers[0].id);
  const [threadId, setThreadId] = useState<string | null>(null);
  const opening = useRef(0);

  /** New conversation (optionally as another customer). Returns the new thread id. */
  const openThread = useCallback(
    async (nextCustomerId: string): Promise<string> => {
      const selected = ++opening.current;
      setThreadId(null);
      try {
        const nextThreadId = await createThread(nextCustomerId);
        if (selected === opening.current) { setCustomerId(nextCustomerId); setThreadId(nextThreadId); }
        return nextThreadId;
      } catch (error) {
        if (selected === opening.current) addEvent(browserError(error as Error, "browser / start conversation"));
        throw error;
      }
    },
    [addEvent],
  );

  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    openThread(customers[0].id).catch(() => {});
  }, [openThread]);

  return { customerId, threadId, openThread };
}

export function useSupportSession() {
  const { headers } = useVisitorKey();
  const { events, addEvent, addBubbleRef, clear } = useEventFeed();
  const { customerId, threadId, openThread } = useThreadLifecycle(addEvent);
  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat", headers }), [headers]);

  // INTERVIEW: useChat gives streaming state for free; custom data parts let one stream drive the chat widgets too.
  const chat = useChat<SupportUIMessage>({
    transport,
    onData: (part) => {
      if (part.type === "data-agent-event") addEvent(part.data);
    },
    onError: (error) => {
      const visible = browserError(error);
      addEvent(visible);
      if (visible.kind === "error") addBubbleRef.current({ id: visible.id, role: "assistant", parts: [
        { type: "data-sender", data: { kind: "system", title: "Request failed" } },
        { type: "text", text: `${visible.errorType}: ${visible.message}` },
      ] });
    },
  });
  const { setMessages, sendMessage, stop } = chat;
  useEffect(() => {
    addBubbleRef.current = (message) => setMessages((prev) => [...prev, message]);
  }, [addBubbleRef, setMessages]);
  useCustomerChannel(threadId, addEvent);
  const inspector = useInspectorChannel(threadId, addEvent);

  const send = useCallback(
    (text: string, override?: { threadId: string }, selection?: WidgetSelection) => {
      const target = override?.threadId ?? threadId;
      if (!target) return;
      const body: ChatRequestBody = { threadId: target, selection };
      // `sendMessage` appends the user message and starts the request.
      void sendMessage({ text }, { body });
    },
    [sendMessage, threadId],
  );

  /** New thread = clean chat, clean panel. Returns the new thread id. */
  const startFresh = useCallback(
    async (nextCustomerId: string): Promise<string> => {
      // Stop the previous browser stream before clearing it; server business state stays on its own thread.
      void stop();
      clear();
      setMessages([]);
      return openThread(nextCustomerId);
    },
    [clear, setMessages, openThread, stop],
  );

  const customer = customerOptions.find((c) => c.id === customerId) ?? customerOptions[0];
  const busy = !threadId || chat.status === "submitted" || chat.status === "streaming";
  return { customers: customerOptions, customer, threadId, events, messages: chat.messages, busy, inspector, send, startFresh };
}
