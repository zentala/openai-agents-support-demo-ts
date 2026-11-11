/**
 * Server-side conversation registry: one `Thread` per chat, held in memory.
 *
 * A thread keeps what must NOT come from the browser: the model history, the context fields code
 * changed, the takeover state and the transcript. The transcript is the customer-visible record
 * (customer, agent, consultant and system lines) that the consultant console reads and rates.
 *
 * SECURITY: the history lives here, keyed by thread id and bound to ONE customer. The browser only
 * sends the new message, so a user cannot forge earlier "assistant" messages to steer the model.
 */
import type { AgentInputItem } from "@openai/agents";
import { redactValue } from "@/lib/security/request-key";
import type { Address, MutableContext, SupportContext } from "@/lib/types";
import { emitAgentEvent } from "./event-bus";
import { initialTakeover, type TakeoverState } from "./takeover-state";
import { clearPendingRunsForThread, hasPendingRun } from "./pending-runs";

export type TranscriptRole = "customer" | "agent" | "consultant" | "system";

export type TranscriptEntry = {
  id: string;
  role: TranscriptRole;
  text: string;
  /** Epoch milliseconds. */
  ts: number;
  /** Consultant name for `consultant` lines. */
  author?: string;
  /** Tools the agent called while producing this answer (for ratings and eval export). */
  tools?: string[];
};

/** Counters the escalation rules judge; they only grow during a conversation. */
export type ThreadSignals = { guardrailTrips: number; toolErrors: number };

/** `memory` = the mutable context fields (active order, handoff reason) that survive between turns. */
export type Thread = {
  threadId: string;
  customerId: string;
  history: AgentInputItem[];
  traceId: string;
  memory: MutableContext;
  transcript: TranscriptEntry[];
  takeover: TakeoverState;
  signals: ThreadSignals;
  /** An address change waiting for the customer's Confirm click. Only the click can apply it. */
  pendingAddress?: { proposalId: string; orderId: string; oldAddress: Address; newAddress: Address };
  /** Guest verification attempts so far (server-side: the model cannot reset it). */
  verification: { attempts: number };
};

const globals = globalThis as unknown as { __nordicThreads?: Map<string, Thread> };
const threads = (globals.__nordicThreads ??= new Map<string, Thread>());

/** Demo-wide cap: evict the oldest thread without a pending approval, including its transcript. */
export const MAX_THREADS = 100;

export class ThreadCapacityError extends Error {
  constructor() {
    super("All conversation slots are waiting for approval. Ask a consultant to decide an approval before starting a new conversation.");
    this.name = "ThreadCapacityError";
  }
}

/** All thread removal paths use this function so the approval registry cannot outlive its conversation. */
export function removeThread(threadId: string): void {
  clearPendingRunsForThread(threadId);
  threads.delete(threadId);
}

function storeThread(thread: Thread): Thread {
  // SECURITY: never orphan an approval or issue a cookie for a conversation immediately evicted.
  while (!threads.has(thread.threadId) && threads.size >= MAX_THREADS) {
    const oldest = [...threads.keys()].find((id) => !hasPendingRun(id));
    if (!oldest) throw new ThreadCapacityError();
    removeThread(oldest);
  }
  threads.set(thread.threadId, thread);
  return thread;
}

export const newTraceId = (): string => `trace_${crypto.randomUUID().replaceAll("-", "")}`;

function blankThread(threadId: string, customerId: string): Thread {
  return {
    threadId,
    customerId,
    history: [],
    traceId: newTraceId(),
    memory: {},
    transcript: [],
    takeover: initialTakeover(),
    signals: { guardrailTrips: 0, toolErrors: 0 },
    verification: { attempts: 0 },
  };
}

/**
 * Creates a thread with a SERVER-made random id (the customer's browser never picks one) and stores it.
 * The caller (POST /api/threads) then issues the matching credential cookie.
 */
export function createThread(customerId: string): Thread {
  const thread = blankThread(crypto.randomUUID(), customerId);
  return storeThread(thread);
}

/**
 * Finds or creates the thread by id. Used by the eval script and tests, which call `handleUserMessage`
 * directly; the HTTP routes only ever use threads made by `createThread`.
 * Returns undefined when the thread id belongs to another customer.
 */
export function threadFor(ctx: Pick<SupportContext, "threadId" | "customerId">): Thread | undefined {
  const existing = threads.get(ctx.threadId);
  // SECURITY: a thread id from another customer's session is refused (no hijacking).
  if (existing && existing.customerId !== ctx.customerId) return undefined;
  const thread = existing ?? blankThread(ctx.threadId, ctx.customerId);
  return storeThread(thread);
}

export const getThread = (threadId: string): Thread | undefined => threads.get(threadId);

export const listThreads = (): Thread[] => [...threads.values()];

export function addTranscript(thread: Thread, entry: Omit<TranscriptEntry, "id" | "ts">): TranscriptEntry {
  const full: TranscriptEntry = { ...redactValue(entry), id: crypto.randomUUID(), ts: Date.now() };
  thread.transcript.push(full);
  return full;
}

/**
 * Writes a line to the transcript AND pushes it to the customer's open chat through the event bus
 * (the per-thread SSE channel forwards it). Used for everything the customer did not just ask for:
 * a consultant reply, a join/leave notice, the answer of a run resumed after an approval.
 */
export function pushToCustomer(thread: Thread, entry: Omit<TranscriptEntry, "id" | "ts"> & { role: "agent" | "consultant" | "system" }): void {
  const saved = addTranscript(thread, entry);
  emitAgentEvent(thread.threadId, {
    kind: "chat_message",
    entryId: saved.id,
    role: entry.role,
    text: entry.text,
    author: entry.author,
  });
}

/** History items so the agent knows what was said while a human was in charge. */
export const userItem = (text: string): AgentInputItem => ({ role: "user", content: text });

export const assistantItem = (text: string): AgentInputItem => ({
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text }],
});
