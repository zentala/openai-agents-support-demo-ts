/**
 * Turns a server-pushed `chat_message` event into a chat bubble for `useChat`.
 *
 * `useChat` only knows messages that came through its own request stream. A consultant reply or a
 * "colleague joined" notice arrives later through the thread channel, so we build the message by hand
 * and add it with `setMessages`. A `data-sender` part tells the bubble who wrote it.
 */
import type { AgentEvent, SupportUIMessage } from "@/lib/types";

type ChatMessageEvent = Extract<AgentEvent, { kind: "chat_message" }>;

export function toChatMessage(event: ChatMessageEvent): SupportUIMessage {
  const parts: SupportUIMessage["parts"] = [{ type: "text", text: event.text }];
  if (event.role !== "agent") parts.push({ type: "data-sender", data: { kind: event.role, name: event.author } });
  // The transcript entry id doubles as the message id, so a message can never be added twice.
  return { id: event.entryId, role: "assistant", parts };
}
