/**
 * Tiny publish/subscribe bus: tools and guardrails announce panel events, the
 * chat route, the per-thread SSE channel and the eval script listen per thread.
 *
 * Why a bus and not the run context: the Agents SDK serializes the context when
 * a run pauses for approval. Functions do not survive that, a thread id does.
 *
 * The bus also keeps a bounded in-memory log of every event, which the console's
 * metrics strip is computed from (escalation rate, guardrail trips, tool errors).
 */
import type { AgentEvent, AgentEventBody } from "@/lib/types";
import { redactValue } from "@/lib/security/request-key";

type Listener = (event: AgentEvent) => void;
export type LoggedEvent = { threadId: string; event: AgentEvent };

/** Oldest events are dropped beyond this, so a long-running demo cannot grow without limit. */
const MAX_LOGGED_EVENTS = 5000;

const globals = globalThis as unknown as {
  __nordicListeners?: Map<string, Set<Listener>>;
  __nordicEventLog?: LoggedEvent[];
};
const listeners = (globals.__nordicListeners ??= new Map<string, Set<Listener>>());
const eventLog = (globals.__nordicEventLog ??= []);

export function emitAgentEvent(threadId: string, body: AgentEventBody): void {
  const event = { ...redactValue(body), id: crypto.randomUUID(), ts: Date.now() } as AgentEvent;
  eventLog.push({ threadId, event });
  if (eventLog.length > MAX_LOGGED_EVENTS) eventLog.splice(0, eventLog.length - MAX_LOGGED_EVENTS);
  listeners.get(threadId)?.forEach((listener) => listener(event));
}

/** Returns the unsubscribe function; always call it in a `finally`. */
export function subscribeToThread(threadId: string, listener: Listener): () => void {
  const set = listeners.get(threadId) ?? new Set<Listener>();
  set.add(listener);
  listeners.set(threadId, set);
  return () => {
    set.delete(listener);
    if (set.size === 0) listeners.delete(threadId);
  };
}

export const readEventLog = (): LoggedEvent[] => [...eventLog];

/** Demo reset: forget the logged events (metrics start from zero). */
export const clearEventLog = (): void => {
  eventLog.length = 0;
};
