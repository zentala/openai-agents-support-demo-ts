"use client";

/**
 * The single page: two columns like the OpenAI demo.
 * Left = Agent View (what happens under the hood), right = Customer View (chat).
 * `useSupportSession` owns the conversation; optional scenario guidance stays local to this view.
 */
import { AgentPanel } from "@/components/agent-panel";
import { CustomerView } from "@/components/customer-view";
import { Workspace } from "@/components/workspace";
import { contextFieldsOf, customerLanguageOf, handlerOf, openTicketOf, verifiedCustomerOf } from "@/lib/client/selectors";
import { useSupportSession } from "@/lib/client/use-support-session";
import { useScenarioPlayback } from "@/lib/client/use-scenario-playback";

export function SupportDemo({ publicSessionSecret }: { publicSessionSecret: boolean }) {
  const session = useSupportSession();
  const scenario = useScenarioPlayback(session);

  // A guest who passed verification is that customer from then on (the server rebinds the thread).
  const verified = verifiedCustomerOf(session.events);
  const context = {
    customer_id: verified?.customerId ?? session.customer.id,
    customer_name: verified?.customerName ?? session.customer.name,
    language: customerLanguageOf(session.events, session.customers, session.customer.id),
    thread_id: session.threadId?.slice(0, 8),
  };

  return (
    <main className="demo-layout flex min-h-screen flex-col gap-2 p-2 lg:h-screen lg:flex-row">
      <Workspace events={session.events} busy={scenario.busy} onScenario={(next) => void scenario.run(next)}>
        <AgentPanel threadId={session.threadId} events={session.events} context={context} inspector={session.inspector} publicSessionSecret={publicSessionSecret} replySent={!session.busy && session.messages.at(-1)?.role === "assistant"} />
      </Workspace>
      <CustomerView
        customers={session.customers}
        customerId={session.customer.id}
        scenarioLabel={scenario.label}
        draftScope={scenario.scope}
        suggestion={scenario.suggestion}
        messages={session.messages}
        busy={scenario.busy}
        lastEvent={session.events.at(-1)}
        handler={handlerOf(session.events)}
        openTicketId={openTicketOf(session.events)}
        onCustomerChange={(id) => { scenario.clear(); void session.startFresh(id).catch(() => {}); }}
        onReset={() => { scenario.clear(); void session.startFresh(session.customer.id).catch(() => {}); }}
        onSend={session.send}
        activeOrderId={contextFieldsOf(session.events).activeOrderId ?? undefined}
        actions={{
          threadId: session.threadId,
          onPickOrder: (orderId, text) => session.send(text, undefined, { type: "order", orderId }),
          onSend: (text, selection) => session.send(text, undefined, selection),
        }}
        onScenario={(next) => void scenario.run(next)}
      />
    </main>
  );
}
