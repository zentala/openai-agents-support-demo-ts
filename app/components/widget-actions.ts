import type { WidgetSelection } from "@/lib/types";

/** What a chat widget may do: talk to the server about its thread, or send a chat message (with a validated click). */
export type WidgetActions = {
  /** Null until the server has created the conversation. */
  threadId: string | null;
  /** A click on the order picker. */
  onPickOrder: (orderId: string, text: string) => void;
  /** Sends a normal chat message, optionally with a structured selection the server validates. */
  onSend: (text: string, selection?: WidgetSelection) => void;
};
