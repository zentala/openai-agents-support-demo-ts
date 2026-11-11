/**
 * Which panel events a CUSTOMER may receive, and which belong to the "Agent View" inspector only.
 *
 * The event bus carries everything: tool arguments (order data, e-mail), knowledge-base hits, guardrail
 * reasoning, approval requests, trace ids, error details. A customer's browser must see none of that.
 * Only three kinds are customer-visible: chat messages, the "colleague joined/left" state, and widgets.
 *
 * The map is typed as a `Record` over every event kind, so adding a new kind to `AgentEventBody`
 * does not compile until someone decides here whether a customer may see it.
 *
 * SECURITY: the customer chat stream and the customer SSE channel both pass events through
 * `toCustomerEvent`. The inspector channel (protected like /admin) sends events unfiltered.
 */
import type { AgentEvent } from "@/lib/types";

type Audience = "customer" | "inspector";

const AUDIENCE: Record<AgentEvent["kind"], Audience> = {
  agent_active: "inspector",
  handoff: "inspector",
  tool_call: "inspector",
  tool_output: "inspector",
  guardrail: "inspector",
  normalization: "inspector",
  context_update: "inspector",
  kb_hits: "inspector",
  approval_request: "inspector",
  approval_decision: "inspector",
  escalation: "inspector",
  sensitive_stored: "inspector",
  slots: "inspector",
  verification: "inspector",
  address_change: "inspector",
  error: "inspector",
  trace: "inspector",
  widget: "customer",
  takeover: "customer",
  chat_message: "customer",
};

export const CUSTOMER_EVENT_KINDS = (Object.keys(AUDIENCE) as AgentEvent["kind"][]).filter((kind) => AUDIENCE[kind] === "customer");

/** The event as the customer may see it, or `undefined` when it is inspector-only. */
export function toCustomerEvent(event: AgentEvent): AgentEvent | undefined {
  if (AUDIENCE[event.kind] !== "customer") return undefined;
  // The `note` of a takeover event is operator text ("agent did not answer, ticket T-2001"): drop it.
  if (event.kind === "takeover") return { id: event.id, ts: event.ts, kind: "takeover", status: event.status, consultant: event.consultant };
  return event;
}
