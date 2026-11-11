"use client";

/**
 * The single page: two columns like the OpenAI demo.
 * Left = Agent View (what happens under the hood), right = Customer View (chat).
 * All state lives in `useSupportSession`; this file only wires it to the components.
 */
import { AgentPanel } from "@/components/agent-panel";
import { CustomerView } from "@/components/customer-view";
import { Workspace } from "@/components/workspace";
import { contextFieldsOf, handlerOf, verifiedCustomerOf } from "@/lib/client/selectors";
import { useSupportSession } from "@/lib/client/use-support-session";
import { fillTemplates, type Scenario } from "@/lib/eval/scenarios";
import { useState } from "react";

export function SupportDemo({ publicSessionSecret }: { publicSessionSecret: boolean }) {
  const session = useSupportSession();
  const [scenarioLabel, setScenarioLabel] = useState<string>();

  const runScenario = async (scenario: Scenario) => {
    // Every scenario runs in a clean thread as its own customer, so results do not depend on history.
    const threadId = await session.startFresh(scenario.customerId);
    setScenarioLabel(scenario.label);
    session.send(fillTemplates(scenario.message), { threadId });
  };

  // A guest who passed verification is that customer from then on (the server rebinds the thread).
  const verified = verifiedCustomerOf(session.events);
  const context = {
    customer_id: verified?.customerId ?? session.customer.id,
    customer_name: verified?.customerName ?? session.customer.name,
    language: session.customer.language || undefined,
    thread_id: session.threadId?.slice(0, 8),
  };

  return (
    <main className="demo-layout flex min-h-screen flex-col gap-2 p-2 lg:h-screen lg:flex-row">
      <Workspace events={session.events} busy={session.busy} onScenario={(scenario) => void runScenario(scenario)}>
        <AgentPanel events={session.events} context={context} inspector={session.inspector} publicSessionSecret={publicSessionSecret} replySent={!session.busy && session.messages.at(-1)?.role === "assistant"} />
      </Workspace>
      <CustomerView
        customers={session.customers}
        customerId={session.customer.id}
        scenarioLabel={scenarioLabel}
        messages={session.messages}
        busy={session.busy}
        lastEvent={session.events.at(-1)}
        handler={handlerOf(session.events)}
        onCustomerChange={(id) => { setScenarioLabel(undefined); void session.startFresh(id); }}
        onReset={() => { setScenarioLabel(undefined); void session.startFresh(session.customer.id); }}
        onSend={session.send}
        activeOrderId={contextFieldsOf(session.events).activeOrderId ?? undefined}
        actions={{
          threadId: session.threadId,
          onPickOrder: (orderId, text) => session.send(text, undefined, { type: "order", orderId }),
          onSend: (text, selection) => session.send(text, undefined, selection),
        }}
        onScenario={(scenario) => void runScenario(scenario)}
      />
    </main>
  );
}
