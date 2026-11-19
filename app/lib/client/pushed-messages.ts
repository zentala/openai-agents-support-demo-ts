/**
 * Turns a server-pushed `chat_message` event into a chat bubble for `useChat`.
 *
 * `useChat` only knows messages that came through its own request stream. A consultant reply or a
 * "colleague joined" notice arrives later through the thread channel, so we build the message by hand
 * and add it with `setMessages`. A `data-sender` part tells the bubble who wrote it.
 */
import type { AgentEvent, SupportUIMessage } from "@/lib/types";
import { senderForRole } from "@/lib/message-kinds";

type ChatMessageEvent = Extract<AgentEvent, { kind: "chat_message" }>;

/** Replace a customer-first copy in authoritative inspector arrival order, retaining one event and bubble. */
export function withInspectorCorrelation(events: AgentEvent[], incoming: AgentEvent): AgentEvent[] {
  if (!incoming.turnId) return events;
  const index = events.findIndex((event) => event.id === incoming.id && event.kind === incoming.kind && !event.turnId);
  if (index < 0) return events;
  // Customer delivery can precede its inspector decision. Preserve the inspector's ordered position,
  // while enriching only correlation; customer-visible fields and serialization remain unchanged.
  const correlated = { ...events[index], turnId: incoming.turnId };
  return [...events.filter((_event, position) => position !== index), correlated];
}

export function toChatMessage(event: ChatMessageEvent): SupportUIMessage {
  const parts: SupportUIMessage["parts"] = [{ type: "text", text: event.text }];
  parts.push({ type: "data-sender", data: event.sender ?? senderForRole(event.role, event.author) });
  if (event.role === "agent" && event.quickReplies) parts.push({ type: "data-widget", data: event.quickReplies });
  // The transcript entry id doubles as the message id, so a message can never be added twice.
  return { id: event.entryId, role: "assistant", parts };
}
