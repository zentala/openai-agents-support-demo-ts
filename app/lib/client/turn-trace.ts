/** Latest-turn narrative from inspector events. The full event log remains available below it. */
import type { AgentEvent } from "@/lib/types";

export type TraceStep = { id: string; ts: number; label: string; detail: string; status: "passed" | "failed" | "waiting" | "skipped"; tool?: string };
const short = (value: string): string => value.replace(/\s+/g, " ").slice(0, 180);
const step = (e: AgentEvent, label: string, detail: string, status: TraceStep["status"]): TraceStep =>
  ({ id: e.id, ts: e.ts, label, detail: short(detail), status });

/** Ordinary steps preserve arrival order: input guardrails can run concurrently. */
function eventStep(e: AgentEvent): TraceStep | undefined {
  switch (e.kind) {
    case "normalization": return step(e, "Input cleanup", e.stripped.join("; ") || "Nothing needed masking or stripping", "passed");
    case "guardrail": return step(e, `${e.stage === "input" ? "Input" : "Output"} guardrail · ${e.name}`, e.passed ? "Passed" : e.reasoning, e.passed ? "passed" : "failed");
    case "escalation": return step(e, `Waiting for a human · Ticket ${e.ticketId}`, `${e.reason}${e.source === "rule" ? " · model skipped" : " · agent requested a human"}`, "waiting");
    case "agent_active": return step(e, "Active agent", e.agent, "passed");
    case "handoff": return step(e, "Handoff", `${e.from} → ${e.to}`, "passed");
    case "approval_request": return step(e, "Approval pending", e.approval.summary, "waiting");
    case "approval_decision": return step(e, "Human decision", `${e.approved ? "Approved" : "Rejected"} by ${e.decidedBy}`, e.approved ? "passed" : "failed");
    case "takeover": return step(e, "Handler", e.note ?? (e.status === "human" ? `Human colleague ${e.consultant ?? ""} · model skipped` : "Agent answers again"), e.status === "human" ? "waiting" : "passed");
    case "chat_message": return step(e, "Reply sent", e.role === "consultant" ? `Human colleague ${e.author ?? ""}` : e.role, "passed");
    case "error": return step(e, "Error", `${e.errorType}: ${e.message}`, "failed");
  }
}

function toolStep(rows: TraceStep[], e: AgentEvent): boolean {
  if (e.kind === "tool_call") {
    rows.push({ ...step(e, `Tool · ${e.tool}`, "Running", "waiting"), tool: e.tool });
  } else if (e.kind === "tool_output") {
    const result = e.result as { status?: string; code?: string; error?: unknown } | null;
    const detail = typeof e.result === "string" ? e.result : result?.code ?? result?.status ?? "Completed";
    const failed = /ERROR|NOT_FOUND|REFUSED|FAILED|DENIED/i.test(detail) || Boolean(result?.error);
    // Some SDK output items carry only the generic "tool" name. Match the oldest pending call.
    const row = rows.find((r) => (r.tool === e.tool || e.tool === "tool") && r.status === "waiting");
    const output = step(e, `Tool · ${e.tool}`, detail, failed ? "failed" : "passed");
    if (row) Object.assign(row, { detail: output.detail, status: output.status });
    else rows.push(output);
  } else return false;
  return true;
}

/** `replySent` comes from a completed chat request; output guardrail success alone is not delivery. */
export function turnTrace(events: AgentEvent[], replySent = false): TraceStep[] {
  const start = events.map((e) => e.kind).lastIndexOf("trace");
  const turn = events.slice(Math.max(0, start));
  const rows: TraceStep[] = [];
  for (const e of turn) {
    if (toolStep(rows, e)) continue;
    const row = eventStep(e);
    if (row) rows.push(row);
    if (e.kind === "approval_decision") {
      const request = turn.find((r) => r.kind === "approval_request" && r.approval.approvalId === e.approvalId);
      const waiting = rows.find((r) => r.id === request?.id);
      if (waiting) Object.assign(waiting, { label: "Approval resolved", detail: e.approved ? "Approved" : "Rejected", status: e.approved ? "passed" : "failed" });
    }
  }
  const pending = turn.filter((e) => e.kind === "approval_request")
    .some((e) => e.kind === "approval_request" && !turn.some((d) => d.kind === "approval_decision" && d.approvalId === e.approval.approvalId));
  if (replySent && !pending && !rows.some((r) => r.label === "Error" || r.label === "Reply sent")) {
    const last = turn.at(-1);
    if (last) rows.push({ ...step(last, "Reply sent", "Delivered to the customer chat", "passed"), id: `${last.id}-reply` });
  }
  return rows;
}
