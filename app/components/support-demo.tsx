"use client";

/**
 * The single page: two columns like the OpenAI demo.
 * Left = Agent View (what happens under the hood), right = Customer View (chat).
 * `useSupportSession` owns the conversation; optional scenario guidance stays local to this view.
 */
import { AgentPanel } from "@/components/agent-panel";
import { CustomerView } from "@/components/customer-view";
import { Workspace } from "@/components/workspace";
import { contextFieldsOf, customerLanguageOf, handlerOf, openTicketOf, resolvedTicketsOf, verifiedCustomerOf } from "@/lib/client/selectors";
import { useSupportSession } from "@/lib/client/use-support-session";
import { useScenarioPlayback } from "@/lib/client/use-scenario-playback";
import { useVisitorKey } from "./visitor-key";

export function SupportDemo({ publicSessionSecret, publicDemo }: { publicSessionSecret: boolean; publicDemo: boolean }) {
  const session = useSupportSession();
  const { headers, key, focusKeyField } = useVisitorKey();
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
      <Workspace events={session.events} threadId={session.threadId} selectedCustomerId={session.customer.id} busy={scenario.busy} publicDemo={publicDemo} onScenario={(next) => void scenario.run(next)}>
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
        resolvedTicketIds={resolvedTicketsOf(session.events)}
        onCustomerChange={(id) => { scenario.clear(); void session.startFresh(id).catch(() => {}); }}
        onReset={() => { scenario.clear(); void session.startFresh(session.customer.id).catch(() => {}); }}
        onSend={(...args: Parameters<typeof session.send>) => { if (publicDemo && !key) focusKeyField(); session.send(...args); }}
        onConcern={async (entryId, kind, reason) => {
          if (!session.threadId) return "Could not submit: no conversation is selected.";
          try {
            const response = await fetch(`/api/threads/${encodeURIComponent(session.threadId)}/messages`, { method: "POST", headers: { "Content-Type": "application/json", ...headers() }, body: JSON.stringify({ entryId, kind, reason }) });
            const result = await response.json();
            const created = kind === "report" ? result.status === "REPORT_CREATED" : result.status === "QUESTION_CREATED";
            return created ? (kind === "report" ? "Report created for staff review." : "Question sent to a person.") : `${result.errorType}: ${result.message}`;
          } catch (error) { return `RequestFailed: ${error instanceof Error ? error.message : String(error)}`; }
        }}
        onBackToAssistant={async () => {
          if (!session.threadId) return "Could not return to the assistant: no conversation is selected.";
          try {
            const response = await fetch(`/api/threads/${encodeURIComponent(session.threadId)}/hand-back`, { method: "POST", headers: headers() });
            const result = await response.json();
            return result.ok ? "The assistant will answer your next message." : `${result.errorType}: ${result.message}`;
          } catch (error) { return `RequestFailed: ${error instanceof Error ? error.message : String(error)}`; }
        }}
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
