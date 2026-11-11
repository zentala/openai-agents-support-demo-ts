"use client";

/**
 * Right column, "Customer View": customer selector (simulated login), the chat
 * and the scenario buttons. The message list and the composer are separate components.
 */
import { RotateCcw, User } from "lucide-react";
import type { Scenario } from "@/lib/eval/scenarios";
import type { AgentEvent, HandlerStatus, SupportUIMessage } from "@/lib/types";
import { Composer } from "./composer";
import { VisitorKeyControl, useVisitorKey } from "./visitor-key";
import { MessageList } from "./message-list";
import { ScenarioBar } from "./scenario-bar";
import type { WidgetActions } from "./widget-actions";

type Customer = { id: string; name: string; language: string };

type Props = {
  customers: Customer[];
  customerId: string;
  messages: SupportUIMessage[];
  busy: boolean;
  scenarioLabel?: string;
  lastEvent?: AgentEvent;
  /** Who answers right now; a human colleague gets a banner above the chat. */
  handler: { status: HandlerStatus; consultant?: string };
  onCustomerChange: (customerId: string) => void;
  onReset: () => void;
  onSend: (text: string) => void;
  activeOrderId?: string;
  actions: WidgetActions;
  onScenario: (scenario: Scenario) => void;
};

export function CustomerView(props: Props) {
  const { publicDemo } = useVisitorKey();
  return (
    <div data-testid="customer-view" className={`order-1 flex h-[60svh] ${publicDemo ? "min-h-[44rem] lg:min-h-0" : "min-h-80"} min-w-0 flex-col rounded-xl bg-white shadow-sm lg:order-2 lg:h-full lg:w-2/5`}>
      <CustomerHeader props={props} />
      <VisitorKeyControl />
      {props.handler.status === "human" && (
        <p data-testid="human-banner" className="bg-green-50 px-4 py-1.5 text-center text-sm text-green-800">
          A human colleague joined{props.handler.consultant ? `: ${props.handler.consultant}` : ""}
        </p>
      )}
      <MessageList messages={props.messages} busy={props.busy} lastEvent={props.lastEvent} activeOrderId={props.activeOrderId} actions={props.actions} onScenario={props.onScenario} scenarioLabel={props.scenarioLabel} />
      <Composer busy={props.busy} onSend={props.onSend} scenarios={<ScenarioBar busy={props.busy} onRun={props.onScenario} />} />
    </div>
  );
}

/** Wrap the customer selector below its title on narrow screens; keep neighboring controls 40px tall. */
function CustomerHeader({ props }: { props: Props }) {
  return <div data-testid="customer-header" className="grid shrink-0 grid-cols-[1fr_auto] items-center gap-2 rounded-t-xl bg-blue-600 px-3 py-1 text-white md:flex">
        <div className="flex min-h-10 min-w-0 items-center gap-2">
        <User className="h-5 w-5 shrink-0" />
        <h1 className="text-lg font-semibold">Customer View</h1>
        </div>
        <select
          aria-label="Logged-in customer"
          data-testid="customer-select"
          value={props.customerId}
          onChange={(e) => props.onCustomerChange(e.target.value)}
          className="order-3 col-span-2 h-10 min-w-0 w-full rounded-md bg-blue-700 px-2 text-sm md:order-2 md:ml-auto md:w-auto md:min-w-[190px] md:max-w-56 md:flex-1"
        >
          {props.customers.map((c) => (
            <option key={c.id} value={c.id}>{c.name} ({c.language})</option>
          ))}
        </select>
        <button aria-label="Reset conversation" title="Reset conversation" onClick={props.onReset} className="order-2 flex h-10 w-10 items-center justify-center rounded-md hover:bg-white/10 md:order-3">
          <RotateCcw className="h-4 w-4" />
        </button>
      </div>;
}
