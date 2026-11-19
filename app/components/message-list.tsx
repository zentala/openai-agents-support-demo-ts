"use client";

/**
 * The chat bubbles. A message can hold several text parts (e.g. "waiting for approval"
 * and, after Approve, the final answer), so we join all text parts of one message.
 * A message can also carry `data-widget` parts (order picker, secure form, photo upload, address card), drawn under the text.
 */
import { displayScenarioLabel, type Scenario } from "@/lib/eval/scenarios";
import { useEffect, useRef } from "react";
import type { AgentEvent, SupportUIMessage } from "@/lib/types";
import { ChatWidget } from "./chat-widget";
import type { WidgetActions } from "./widget-actions";
import { MessageContent } from "./message-content";
import { ChatStart } from "./chat-start";
import type { TicketContext } from "@/lib/client/ticket-status";

type Props = {
  messages: SupportUIMessage[];
  onScenario: (scenario: Scenario) => void;
  scenarioLabel?: string;
  busy: boolean;
  allowQuickReplies?: boolean;
  lastEvent?: AgentEvent;
  /** Order stored in the run context, highlighted in the picker. */
  activeOrderId?: string;
  actions: WidgetActions;
  /** Lets a ticket badge show waiting / taken over / closed. */
  ticket?: TicketContext;
};

const textOf = (message: SupportUIMessage): string =>
  message.parts.flatMap((part) => (part.type === "text" ? [part.text] : [])).join("\n\n");

const senderOf = (message: SupportUIMessage) =>
  message.parts.flatMap((part) => (part.type === "data-sender" ? [part.data] : []))[0];

const widgetsOf = (message: SupportUIMessage) =>
  message.parts.flatMap((part) => (part.type === "data-widget" ? [part.data] : []));

/** One short line describing what the system is doing right now. */
function workingLine(event?: AgentEvent): string {
  if (!event) return "Thinking...";
  if (event.kind === "tool_call") return `${event.agent} is calling ${event.tool}...`;
  if (event.kind === "handoff") return `Handing over to ${event.to}...`;
  return "Thinking...";
}

export function MessageList({ messages, busy, lastEvent, activeOrderId, actions, ticket, onScenario, scenarioLabel, allowQuickReplies = true }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (messages.length) endRef.current?.scrollIntoView({ block: "end" });
    else endRef.current?.parentElement?.scrollTo({ top: 0 });
  }, [messages, busy]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="messages">
      {messages.length === 0 && <ChatStart busy={busy} onScenario={onScenario} />}
      {scenarioLabel && <p data-testid="running-scenario" className="text-center text-xs italic text-zinc-600">Scenario: {displayScenarioLabel(scenarioLabel)}</p>}
      {messages.map((m, index) => <MessageItem key={m.id} m={m} busy={busy} active={!busy && index === messages.length - 1} allowQuickReplies={allowQuickReplies} activeOrderId={activeOrderId} actions={actions} ticket={ticket} />)}
      {busy && <p className="text-xs italic text-zinc-600" data-testid="working">{workingLine(lastEvent)}</p>}
      <div ref={endRef} />
    </div>
  );
}

function MessageItem({ m, busy, active, activeOrderId, actions, allowQuickReplies, ticket }: Pick<Props, "busy" | "activeOrderId" | "actions" | "allowQuickReplies" | "ticket"> & { m: SupportUIMessage; active: boolean }) {
        const sender = senderOf(m);
        const latestOffer = widgetsOf(m).filter((widget) => widget.type === "quick-replies").at(-1);
        const entries = m.parts.flatMap((part) => part.type === "data-messages" ? part.data : []);
        return (
        <div key={m.id} className="flex w-full flex-col items-start gap-3">
          {(entries.length ? entries : [{ text: textOf(m), sender: sender ?? { kind: m.role === "user" ? "human" as const : "ai" as const } }])
            .map((entry, i) => <MessageContent key={i} {...entry} customer={m.role === "user"} ticket={ticket} />)}
          {widgetsOf(m).map((widget, i) => (
            <ChatWidget
              key={i}
              widget={widget}
              selectedOrderId={activeOrderId}
              // Only the newest message's cards are live; older ones are history.
              active={active && (widget.type !== "quick-replies" || (!!allowQuickReplies && widget === latestOffer))}
              idle={!busy}
              actions={actions}
            />
          ))}
        </div>
        );

}
