"use client";

/**
 * The chat bubbles. A message can hold several text parts (e.g. "waiting for approval"
 * and, after Approve, the final answer), so we join all text parts of one message.
 * A message can also carry `data-widget` parts (order picker, secure form, photo upload, address card), drawn under the text.
 */
import { displayScenarioLabel, scenarios, type Scenario } from "@/lib/eval/scenarios";
import { useEffect, useRef } from "react";
import type { AgentEvent, SupportUIMessage } from "@/lib/types";
import { ChatWidget } from "./chat-widget";
import type { WidgetActions } from "./widget-actions";

type Props = {
  messages: SupportUIMessage[];
  onScenario: (scenario: Scenario) => void;
  scenarioLabel?: string;
  busy: boolean;
  lastEvent?: AgentEvent;
  /** Order stored in the run context, highlighted in the picker. */
  activeOrderId?: string;
  actions: WidgetActions;
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

export function MessageList({ messages, busy, lastEvent, activeOrderId, actions, onScenario, scenarioLabel }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, busy]);

  return (
    <div className="flex-1 space-y-3 overflow-y-auto p-4" data-testid="messages">
      {messages.length === 0 && <ChatStart busy={busy} onScenario={onScenario} />}
      {scenarioLabel && <p data-testid="running-scenario" className="text-center text-xs italic text-zinc-600">Scenario: {displayScenarioLabel(scenarioLabel)}</p>}
      {messages.map((m, index) => <MessageItem key={m.id} m={m} busy={busy} active={!busy && index === messages.length - 1} activeOrderId={activeOrderId} actions={actions} />)}
      {busy && <p className="text-xs italic text-zinc-600" data-testid="working">{workingLine(lastEvent)}</p>}
      <div ref={endRef} />
    </div>
  );
}

function ChatStart({ busy, onScenario }: Pick<Props, "busy" | "onScenario">) {
  return (
        <div data-testid="chat-start" className="flex min-h-full flex-col items-center justify-center gap-3 text-center">
          <h2 className="text-lg font-semibold">How can we help?</h2>
          <p className="text-sm text-zinc-600">Ask about an order, a return or a policy.</p>
          <div className="flex flex-col gap-2">{["human-request", "iphone-signature", "german-returns"].map((id) => {
            const scenario = scenarios.find((s) => s.id === id)!;
            return <button type="button" key={id} disabled={busy} onClick={() => onScenario(scenario)} className="min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100 disabled:opacity-50">{displayScenarioLabel(scenario.label)}</button>;
          })}</div>
        </div>
  );
}

function MessageItem({ m, busy, active, activeOrderId, actions }: Pick<Props, "busy" | "activeOrderId" | "actions"> & { m: SupportUIMessage; active: boolean }) {
        const sender = senderOf(m);
        // Notices ("a colleague joined") are small centred lines, not bubbles.
        if (sender?.kind === "system") {
          return <p key={m.id} data-testid="message-system" className="text-center text-xs italic text-zinc-600">{textOf(m)}</p>;
        }
        return (
        <div key={m.id} className={m.role === "user" ? "flex justify-end" : "flex flex-col items-start"}>
          {sender?.kind === "consultant" && <span className="mb-0.5 text-xs font-medium text-emerald-700">Human colleague {sender.name}</span>}
          <div
            data-testid={sender?.kind === "consultant" ? "message-consultant" : `message-${m.role}`}
            className={`max-w-[85%] whitespace-pre-wrap text-base ${m.role === "user" ? "rounded-2xl bg-gray-100 px-3 py-2 text-zinc-900" : sender?.kind === "consultant" ? "rounded-2xl bg-emerald-100 px-3 py-2 text-zinc-900" : "py-2 text-zinc-900"}`}
          >
            {textOf(m)}
          </div>
          {widgetsOf(m).map((widget, i) => (
            <ChatWidget
              key={i}
              widget={widget}
              selectedOrderId={activeOrderId}
              // Only the newest message's cards are live; older ones are history.
              active={active}
              idle={!busy}
              actions={actions}
            />
          ))}
        </div>
        );

}
