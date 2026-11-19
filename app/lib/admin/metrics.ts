/**
 * Console metrics strip, computed from the in-memory event log. Pure: events in, numbers out.
 *
 * "Conversation" = a thread with at least one accepted turn (or an escalation).
 * A trace starts before selection/empty-input validation, so those rejected turns do not count.
 */
import type { LoggedEvent } from "@/lib/runtime/event-bus";

export type Metrics = {
  conversations: number;
  escalatedConversations: number;
  /** escalatedConversations / conversations, 0..1 (0 when there are no conversations). */
  escalationRate: number;
  guardrailTrips: number;
  toolErrors: number;
  approvals: { pending: number; approved: number; rejected: number };
};

export function computeMetrics(
  log: LoggedEvent[],
  approvals: { pending: number; approved: number; rejected: number },
): Metrics {
  const started = new Set<string>();
  const turns = new Map<string, boolean>();
  const escalated = new Set<string>();
  let guardrailTrips = 0;
  let toolErrors = 0;
  for (const { threadId, event } of log) {
    if (event.kind === "trace") {
      if (turns.get(threadId) === true) started.add(threadId);
      turns.set(threadId, true);
    }
    if (event.kind === "error" && ["InvalidSelection", "EmptyMessage"].includes(event.errorType)) turns.set(threadId, false);
    if (event.kind === "escalation") escalated.add(threadId);
    if (event.kind === "guardrail" && !event.passed) guardrailTrips++;
    if (event.kind === "error" && event.where.startsWith("tool ")) toolErrors++;
  }
  for (const [threadId, accepted] of turns) if (accepted) started.add(threadId);
  // A rule can escalate before any run started (keyword hit), so escalated threads count as conversations too.
  const conversations = new Set([...started, ...escalated]).size;
  return {
    conversations,
    escalatedConversations: escalated.size,
    escalationRate: conversations === 0 ? 0 : escalated.size / conversations,
    guardrailTrips,
    toolErrors,
    approvals,
  };
}
