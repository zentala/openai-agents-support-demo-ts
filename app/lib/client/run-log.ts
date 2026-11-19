/** Group inspector events by server turn correlation. Unknown origins stay in Conversation updates. */
import type { AgentEvent } from "@/lib/types";

export type RunLogGroup = { id: string; turn?: number; customerText?: string; events: AgentEvent[] };

export function runLogGroups(events: AgentEvent[]): RunLogGroup[] {
  const groups: RunLogGroup[] = [];
  const turns = new Map<string, RunLogGroup>();
  let updates: RunLogGroup | undefined;
  let turn = 0;
  for (const event of events) {
    if (event.kind === "trace") {
      const current = { id: event.id, turn: ++turn, events: [] };
      groups.push(current);
      turns.set(event.turnId ?? event.id, current);
      continue;
    }
    if (event.kind === "agent_active") continue;
    const correlated = event.turnId ? turns.get(event.turnId) : undefined;
    if (!correlated && !updates) {
      updates = { id: `updates-${event.id}`, events: [] };
      groups.push(updates);
    }
    const current = correlated ?? updates!;
    current.events.push(event);
    // SECURITY: never derive headers from tool arguments, raw text, transcripts, or a pre-cleanup trace.
    if (correlated && event.kind === "normalization") current.customerText = event.after || "Empty message after cleanup";
    if (correlated && event.kind === "error" && event.errorType === "InvalidSelection") current.customerText = event.where === "quick reply" ? "Reply choices refused" : "Order selection refused";
  }
  return groups;
}
