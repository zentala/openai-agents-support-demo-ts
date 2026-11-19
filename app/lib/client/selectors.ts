/**
 * Pure functions that turn the raw event list into what each panel section shows.
 * The browser keeps ONE list of events; every section is a view of it.
 */
import type { AgentEvent, ApprovalRequest, HandlerStatus, KbHit } from "@/lib/types";

type Of<K extends AgentEvent["kind"]> = Extract<AgentEvent, { kind: K }>;

/** The latest staff update may explicitly clear prior guidance. */
export const staffInstructionOf = (events: AgentEvent[]) =>
  events.filter((event) => event.kind === "staff_instruction").at(-1)?.instruction;

const ofKind = <K extends AgentEvent["kind"]>(events: AgentEvent[], kind: K): Of<K>[] =>
  events.filter((e): e is Of<K> => e.kind === kind);

/** The agent that is working now: the latest handoff target or activation. */
export function currentAgent(events: AgentEvent[]): string {
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind === "agent_active") return e.agent;
    if (e.kind === "handoff") return e.to;
  }
  return "";
}

/** Latest result per guardrail for the LAST user turn (turn starts at a trace event). */
export function latestGuardrails(events: AgentEvent[]): Of<"guardrail">[] {
  const lastTurnStart = events.map((e) => e.kind).lastIndexOf("trace");
  const latest = new Map<string, Of<"guardrail">>();
  for (const e of ofKind(events.slice(Math.max(lastTurnStart, 0)), "guardrail")) latest.set(e.name, e);
  return [...latest.values()];
}

/** Current value of every mutable context field: the newest `context_update` that touched it wins. */
export function contextFieldsOf(events: AgentEvent[]): Record<string, string | null> {
  const fields: Record<string, string | null> = {};
  for (const e of ofKind(events, "context_update")) {
    for (const [field, change] of Object.entries(e.changes)) fields[field] = change.to;
  }
  return fields;
}

/** Fields changed by the most recent `context_update`: the panel highlights these. */
export const lastChangedFields = (events: AgentEvent[]): string[] =>
  Object.keys(ofKind(events, "context_update").at(-1)?.changes ?? {});

export const kbHitGroups = (events: AgentEvent[]): { query: string; hits: KbHit[] }[] =>
  ofKind(events, "kb_hits").map(({ query, hits }) => ({ query, hits }));

export const errorsOf = (events: AgentEvent[]) => ofKind(events, "error");

export const latestTrace = (events: AgentEvent[]) => {
  const trace = ofKind(events, "trace").at(-1);
  return trace?.url ? trace : undefined;
};

export type ApprovalView = ApprovalRequest & { status: "pending" | "approved" | "rejected"; decidedBy?: string };

export function approvalsOf(events: AgentEvent[]): ApprovalView[] {
  const decisions = new Map(ofKind(events, "approval_decision").map((d) => [d.approvalId, d]));
  return ofKind(events, "approval_request").map(({ approval }) => {
    const decision = decisions.get(approval.approvalId);
    return {
      ...approval,
      status: !decision ? "pending" : decision.approved ? "approved" : "rejected",
      decidedBy: decision?.decidedBy,
    };
  });
}

/** Who handles the conversation now: the newest `takeover` event wins, default is the agent. */
export function handlerOf(events: AgentEvent[]): { status: HandlerStatus; consultant?: string } {
  const latest = ofKind(events, "takeover").at(-1);
  return latest ? { status: latest.status, consultant: latest.consultant } : { status: "agent" };
}

/** The newest `slots` event of each form (damage claim, address change), oldest form first. */
export function slotFormsOf(events: AgentEvent[]): Of<"slots">[] {
  const latest = new Map<string, Of<"slots">>();
  for (const e of ofKind(events, "slots")) latest.set(e.form, e);
  return [...latest.values()];
}

/** The customer a guest was verified as in this conversation, if any. */
export function verifiedCustomerOf(events: AgentEvent[]): { customerId: string; customerName: string } | undefined {
  const done = ofKind(events, "verification").find((e) => e.outcome === "verified");
  return done?.customerId && done.customerName ? { customerId: done.customerId, customerName: done.customerName } : undefined;
}

/** Display language comes from public option metadata, selected by the trusted verification event when present. */
export function customerLanguageOf(events: AgentEvent[], options: { id: string; language: string }[], selectedId: string): string | undefined {
  const customerId = verifiedCustomerOf(events)?.customerId ?? selectedId;
  return options.find((customer) => customer.id === customerId)?.language || undefined;
}

/** The ticket the conversation is escalated under, if any. */
export const escalationOf = (events: AgentEvent[]) => ofKind(events, "escalation").at(-1);

/** Hand-back resolves the preceding ticket; a later escalation can open a new one. */
export function openTicketOf(events: AgentEvent[]): string | undefined {
  const start = events.map((e) => e.kind).lastIndexOf("escalation");
  if (start < 0) return undefined;
  if (events.slice(start).some((e) => e.kind === "takeover" && e.status === "agent")) return undefined;
  const event = events[start];
  return event.kind === "escalation" ? event.ticketId : undefined;
}

/** Run log events retain trace boundaries for grouping; activation-only bookkeeping stays hidden. */
export const timelineOf = (events: AgentEvent[]): AgentEvent[] =>
  events.filter((e) => e.kind !== "agent_active");
