/** Shared product meanings from DESIGN.md. Decorative glyphs never replace the visible action/event label. */
import { Icon } from "./icon";
import type { IconKey } from "@/lib/ui/icons";
import type { AgentEvent } from "@/lib/types";

const ICONS = { agent: "agent", consultant: "consultant", customer: "customer", how: "howItWorks", takeOver: "takeOver", handBack: "handBack", send: "send",
  escalation: "escalation", guardrail: "guardrail", approval: "approval", tool: "tool", handoff: "handoff", kb: "knowledge", error: "error" } satisfies Record<string, IconKey>;
type IconName = keyof typeof ICONS;
const EVENTS: Partial<Record<AgentEvent["kind"], IconName>> = { escalation: "escalation", guardrail: "guardrail",
  approval_request: "approval", approval_decision: "approval", tool_call: "tool", tool_output: "tool",
  handoff: "handoff", kb_hits: "kb", error: "error", agent_active: "agent", chat_message: "send" };

export function ProductIcon({ name, className = "h-4 w-4 shrink-0" }: { name: IconName; className?: string }) {
  return <Icon name={ICONS[name]} className={className} />;
}

export function EventIcon({ kind, className }: { kind: AgentEvent["kind"]; className?: string }) {
  const other: Partial<Record<AgentEvent["kind"], IconKey>> = { normalization: "inputCleanup", takeover: "consultant", context_update: "contextUpdate",
    widget: "widget", address_change: "address", verification: "guest", slots: "dataCollection", sensitive_stored: "secureForm" };
  const name = EVENTS[kind];
  return name ? <ProductIcon name={name} className={className} /> : other[kind] ? <Icon name={other[kind]} className={className} /> : null;
}
