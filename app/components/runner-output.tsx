"use client";

/**
 * "Run log (all turns)": chronological events grouped by the cleaned customer message.
 * Click a row to expand the full arguments / result as JSON.
 */
import { ClipboardList, Eraser, LayoutList, Lock, MapPin, MessageSquareMore, RefreshCw, UserRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import type { AgentEvent } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { Card, CardContent } from "./ui/card";
import { runLogGroups, type RunLogGroup } from "@/lib/client/run-log";
import { EventIcon, ProductIcon } from "./product-icon";

const ICON = "h-4 w-4 text-zinc-600";

type Row = { label: string; icon: ReactNode; summary: string; detail?: unknown; tone?: string };

function toRow(e: AgentEvent): Row {
  switch (e.kind) {
    case "handoff":
      return { label: "Handoff", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.from} -> ${e.to}` };
    case "tool_call":
      return { label: "Tool call", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.tool}(${JSON.stringify(e.args)})`, detail: e.args };
    case "tool_output":
      return { label: "Tool output", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.tool}: ${JSON.stringify(e.result).slice(0, 140)}`, detail: e.result };
    case "guardrail":
      return {
        label: `${e.stage} guardrail`,
        icon: <EventIcon kind={e.kind} className={ICON} />,
        summary: `${e.name}: ${e.passed ? "passed" : "TRIPPED"} - ${e.reasoning}`,
        tone: e.passed ? undefined : "text-red-600",
      };
    case "normalization":
      return { label: "Input cleanup", icon: <Eraser className={ICON} />, summary: e.stripped.length ? `removed ${e.stripped.join(", ")}` : "Nothing needed masking or stripping", detail: { before: e.before, after: e.after } };
    case "context_update": {
      const summary = Object.entries(e.changes).map(([field, c]) => `${field}: ${c.from ?? "null"} -> ${c.to ?? "null"}`).join("; ");
      return { label: "Context update", icon: <RefreshCw className={ICON} />, summary, detail: e.changes };
    }
    case "widget":
      return { label: "Chat widget", icon: <LayoutList className={ICON} />, summary: e.widget.type === "order-picker" ? `${e.widget.type}: ${e.widget.orders.length} orders shown` : e.widget.type, detail: e.widget };
    case "address_change":
      return { label: "Address change", icon: <MapPin aria-hidden="true" className={ICON} />, summary: `order #${e.orderId}: ${e.status}${e.detail ? ` - ${e.detail}` : ""}`, tone: e.status === "applied" ? "text-emerald-700" : undefined };
    case "verification":
      return { label: "Guest verification", icon: <UserRound aria-hidden="true" className={ICON} />, summary: e.outcome === "verified" ? `verified as ${e.customerName}` : e.outcome === "locked" ? "LOCKED: too many failed attempts" : `failed, ${e.attemptsLeft} attempt(s) left`, tone: e.outcome === "verified" ? "text-emerald-700" : "text-amber-700" };
    case "slots":
      return { label: "Form slots", icon: <ClipboardList className={ICON} />, summary: `${e.title}: ${e.slots.filter((s) => s.filled).length}/${e.slots.length} filled${e.outcome ? ` - ${e.outcome}` : ""}`, detail: e.slots };
    case "sensitive_stored":
      return { label: "Secure form", icon: <Lock className={ICON} />, summary: `${e.field} stored server-side: ${e.status} (the model never saw the value)`, tone: "text-emerald-700" };
    case "kb_hits":
      return { label: "KB search", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `"${e.query}" -> ${e.hits.map((h) => h.id).join(", ") || "no hits"}`, detail: e.hits };
    case "approval_request":
      return { label: "Approval needed", icon: <EventIcon kind={e.kind} className={ICON} />, summary: e.approval.summary };
    case "approval_decision":
      return { label: "Human decision", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.toolName}: ${e.approved ? "approved" : "rejected"} by ${e.decidedBy}` };
    case "escalation":
      return { label: "Escalation", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `ticket ${e.ticketId} opened by ${e.source === "rule" ? "escalation rule" : "agent"}: ${e.reason}`, tone: "text-amber-700" };
    case "takeover":
      return { label: "Takeover", icon: <ProductIcon name={e.status === "human" ? "takeOver" : "handBack"} className={ICON} />, summary: e.note ?? (e.status === "human" ? `${e.consultant} took over` : `handed back to the agent by ${e.consultant}`) };
    case "chat_message":
      return { label: "Pushed to chat", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.author ?? e.role}: ${e.text.slice(0, 120)}` };
    case "error":
      return { label: "Error", icon: <EventIcon kind={e.kind} className={ICON} />, summary: `${e.errorType}: ${e.message}`, tone: "text-red-600" };
    default:
      return { label: e.kind, icon: null, summary: "" };
  }
}

const agentOf = (e: AgentEvent): string => ("agent" in e ? e.agent : "system");

function EventRow({ event }: { event: AgentEvent }) {
  const [open, setOpen] = useState(false);
  const row = toRow(event);
  return (
    <div className="flex items-start gap-2" data-testid="runner-event" data-kind={event.kind}>
      <div className="flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600">
        {row.icon}
        <span className="whitespace-nowrap">{row.label}</span>
      </div>
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)} className="min-h-6 min-w-0 flex-1 text-left hover:bg-gray-50">
        <div data-testid="runner-summary" className={`font-mono text-[13px] ${row.tone ?? "text-gray-800"} ${open ? "whitespace-pre-wrap break-words" : "whitespace-normal break-words lg:truncate"}`}>
          {row.summary}
        </div>
        {open && row.detail !== undefined && (
          <pre className="mt-2 whitespace-pre-wrap break-words rounded-md border border-gray-200 bg-gray-100 p-2 font-mono text-xs">
            {JSON.stringify(row.detail, null, 2)}
          </pre>
        )}
      </button>
    </div>
  );
}

export function RunnerOutput({ events }: { events: AgentEvent[] }) {
  const groups = runLogGroups(events);
  return (
    <PanelSection title="Run log (all turns)" icon={<MessageSquareMore className="h-4 w-4 text-blue-600" />} testId="runner-output">
      <p className="mb-3 text-sm text-zinc-700">Each turn starts with the cleaned customer message. Click an event for details.</p>
      <div className="max-h-96 space-y-2.5 overflow-y-auto rounded-md border border-gray-200 bg-gray-100 p-3 shadow-sm">
        {groups.length === 0 && <p className="p-4 text-center text-zinc-600">No run events yet</p>}
        {groups.map((group) => <TurnGroup key={group.id} group={group} />)}
      </div>
    </PanelSection>
  );
}

function TurnGroup({ group }: { group: RunLogGroup }) {
  return <section data-testid="run-log-turn" data-turn={group.turn ?? "updates"} className="space-y-2.5">
    <header className="space-y-1 pt-2 text-sm text-zinc-900">
      <h3 className="font-semibold">{group.turn ? `Turn ${group.turn}` : "Conversation updates"}</h3>
      {group.turn && <p data-testid="run-log-customer" className="whitespace-pre-wrap wrap-anywhere">{group.customerText ?? "Customer message pending"}</p>}
    </header>
    {group.events.map((event) => (
          <Card key={event.id}>
            <CardContent className="space-y-1 p-3">
              <span className="text-xs font-medium text-zinc-600">{agentOf(event)}</span>
              <EventRow event={event} />
            </CardContent>
          </Card>
    ))}
  </section>;
}
