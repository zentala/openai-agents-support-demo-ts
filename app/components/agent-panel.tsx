"use client";

/**
 * Left column, "Agent View": everything that happens under the hood, assembled
 * from the single list of events via the selectors.
 */

import {
  approvalsOf,
  contextFieldsOf,
  currentAgent,
  openTicketOf,
  handlerOf,
  lastChangedFields,
  slotFormsOf,
  staffInstructionOf,
  errorsOf,
  kbHitGroups,
  latestGuardrails,

  timelineOf,
} from "@/lib/client/selectors";
import type { ChannelStatus } from "@/lib/client/use-thread-channel";
import type { AgentEvent } from "@/lib/types";
import { AgentsList } from "./agents-list";
import { Approvals } from "./approvals";
import { ConversationContext } from "./conversation-context";
import { ErrorsSection } from "./errors-section";
import { Guardrails } from "./guardrails";
import { HandlerStatus } from "./handler-status";
import { InspectorNotice } from "./inspector-notice";
import { KnowledgeHits } from "./knowledge-hits";
import { RunnerOutput } from "./runner-output";
import { SlotsSection } from "./slots-section";
import { SessionSecretNotice } from "./session-secret-notice";
import { TurnTrace } from "./turn-trace";
import { StaffInstructionNote } from "./staff-instruction-note";
import { CustomerOrder } from "./customer-order";
import { customerOrderRevision } from "@/lib/client/use-customer-order";

type Props = {
  threadId: string | null;
  events: AgentEvent[];
  context: Record<string, string | undefined>;
  /** State of the inspector channel; "refused" means the console password is missing. */
  inspector: ChannelStatus;
  publicSessionSecret: boolean;
  replySent: boolean;
};

/** Context field names as the panel shows them (snake_case, like the OpenAI demo). */
const FIELD_LABEL: Record<string, string> = { activeOrderId: "active_order_id", handoffReason: "handoff_reason" };

export function AgentPanel({ threadId, events, context, inspector, publicSessionSecret, replySent }: Props) {

  const fields = contextFieldsOf(events);
  const handler = handlerOf(events);
  return (
    <div data-testid="agent-panel" className="flex min-h-0 flex-1 flex-col">
      <div className="workspace-content flex-1 overflow-y-auto bg-gray-50/50">
        <TurnTrace events={events} replySent={replySent} />
        {publicSessionSecret && <SessionSecretNotice />}
        {inspector === "refused" && <InspectorNotice />}
        {errorsOf(events).length > 0 && <ErrorsSection errors={errorsOf(events)} />}
        <AgentsList active={currentAgent(events)} />
        <HandlerStatus status={handler.status} consultant={handler.consultant} ticketId={openTicketOf(events)} />
        <Guardrails results={latestGuardrails(events)} />
        <ConversationContext
          context={{
            ...context,
            active_agent: currentAgent(events),
            active_order_id: fields.activeOrderId ?? undefined,
            handoff_reason: fields.handoffReason ?? undefined,
          }}
          changed={lastChangedFields(events).map((f) => FIELD_LABEL[f] ?? f)}
        />
        <CustomerOrder key={threadId} threadId={threadId} revision={customerOrderRevision(events, replySent)} />
        <SlotsSection forms={slotFormsOf(events)} />
        {staffInstructionOf(events) && <div className="mb-5"><StaffInstructionNote instruction={staffInstructionOf(events)} /></div>}
        <KnowledgeHits groups={kbHitGroups(events)} />
        <Approvals approvals={approvalsOf(events)} />
        <RunnerOutput events={timelineOf(events)} />
      </div>
    </div>
  );
}

