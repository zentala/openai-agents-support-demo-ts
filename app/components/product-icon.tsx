/** Shared product meanings from DESIGN.md. Decorative glyphs never replace the visible action/event label. */
import { ArrowRightLeft, BookMarked, BookOpen, Bot, Headset, Hourglass, LifeBuoy, SendHorizontal, ShieldAlert, TriangleAlert, Undo2, UserCheck, Wrench } from "lucide-react";
import type { AgentEvent } from "@/lib/types";

const ICONS = { agent: Bot, consultant: Headset, how: BookOpen, takeOver: UserCheck, handBack: Undo2, send: SendHorizontal,
  escalation: LifeBuoy, guardrail: ShieldAlert, approval: Hourglass, tool: Wrench, handoff: ArrowRightLeft, kb: BookMarked, error: TriangleAlert };
type IconName = keyof typeof ICONS;
const EVENTS: Partial<Record<AgentEvent["kind"], IconName>> = { escalation: "escalation", guardrail: "guardrail",
  approval_request: "approval", approval_decision: "approval", tool_call: "tool", tool_output: "tool",
  handoff: "handoff", kb_hits: "kb", error: "error", agent_active: "agent", chat_message: "send" };

export function ProductIcon({ name, className = "h-4 w-4 shrink-0" }: { name: IconName; className?: string }) {
  const Icon = ICONS[name];
  return <Icon aria-hidden="true" className={className} />;
}

export function EventIcon({ kind, className }: { kind: AgentEvent["kind"]; className?: string }) {
  const name = EVENTS[kind];
  return name ? <ProductIcon name={name} className={className} /> : null;
}
