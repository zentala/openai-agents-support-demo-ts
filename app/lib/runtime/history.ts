/**
 * Caps the conversation history sent to the model (cost and attack surface).
 *
 * The history is a list of SDK items: user messages, assistant messages, tool
 * calls and tool results. A tool result without its call (or the reverse) makes
 * the API reject the request. So we never cut at an arbitrary index: we cut only
 * at the start of a user message, which always begins a complete turn.
 */
import type { AgentInputItem } from "@openai/agents";

const isUserMessage = (item: AgentInputItem): boolean => "role" in item && item.role === "user";

export function capHistory(history: AgentInputItem[], maxItems: number): AgentInputItem[] {
  if (history.length <= maxItems) return history;
  const earliestAllowed = history.length - maxItems;
  // First user message inside the allowed window = oldest turn we can keep whole.
  let start = history.findIndex((item, index) => index >= earliestAllowed && isUserMessage(item));
  // The newest turn is larger than the cap: keep it whole rather than cut inside it.
  if (start === -1) start = history.map(isUserMessage).lastIndexOf(true);
  if (start !== -1) return history.slice(start);
  // No user message at all (should not happen): cut at the cap, then drop leading tool calls
  // and tool results until a message or reasoning item, so no call is separated from its output.
  const tail = history.slice(earliestAllowed);
  const firstSafe = tail.findIndex((item) => "role" in item || item.type === "reasoning");
  return firstSafe === -1 ? [] : tail.slice(firstSafe);
}
