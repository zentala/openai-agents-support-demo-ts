/** Derive the next optional draft from real customer turns, never agent prose or an automatic send. */
import { fillTemplates, type Scenario } from "@/lib/eval/scenarios";
import type { AgentEvent, SupportUIMessage } from "@/lib/types";

export type ScenarioPlayback = { threadId: string; scenario: Scenario };
export type DraftSuggestion = { key: string; text: string };

/** A decision starts resume; only its correlated pushed agent answer in the chat completes the wait. */
export function awaitingApprovalAnswer(events: AgentEvent[], messages: SupportUIMessage[], threadId: string | null): boolean {
  return events.some((request, requestIndex) => {
    if (request.kind !== "approval_request" || request.approval.threadId !== threadId) return false;
    const decisionIndex = events.findIndex((event, index) => index > requestIndex && event.kind === "approval_decision"
      && event.approvalId === request.approval.approvalId);
    const turnId = request.approval.turnId ?? request.turnId;
    if (decisionIndex < 0 || !turnId) return true;
    return !events.slice(decisionIndex + 1).some((event) => event.kind === "chat_message" && event.role === "agent"
      && event.turnId === turnId && event.text.trim().length > 0
      && messages.some((message) => message.role === "assistant" && message.id === event.entryId));
  });
}

export function scenarioProgress(playback: ScenarioPlayback | undefined, threadId: string | null, messages: SupportUIMessage[], waiting: boolean) {
  if (!playback || playback.threadId !== threadId) return {};
  const { scenario } = playback;
  const turns = messages.filter((message) => message.role === "user");
  const last = messages.filter((message) => !message.parts.some((part) => part.type === "data-sender" && part.data.kind === "system" && part.data.notice)).at(-1);
  const agentAnswer = last?.role === "assistant" && !last.parts.some((part) => part.type === "data-sender" && part.data.kind === "human")
    && last.parts.some((part) => part.type === "text" && part.text.trim());
  const total = 1 + (scenario.followUps?.length ?? 0);
  const next = !waiting && agentAnswer && turns.length > 0 ? scenario.followUps?.[turns.length - 1] : undefined;
  const step = Math.min(total, Math.max(1, turns.length + (next ? 1 : 0)));
  return {
    label: `${scenario.label}${total > 1 ? ` · Step ${step} of ${total}` : ""}`,
    suggestion: next ? { key: `${threadId}:${scenario.id}:${turns.at(-1)!.id}`, text: fillTemplates(next) } : undefined,
  };
}
