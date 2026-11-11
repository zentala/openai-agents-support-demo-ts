"use client";

/**
 * Queue of escalation tickets: summary, customer, creation time, a link to the conversation
 * transcript (opens it in the right-hand pane) and a link to the OpenAI trace of the conversation.
 */
import { formatTime } from "@/lib/client/format-time";
import { ExternalLink, Ticket } from "lucide-react";
import type { TicketView } from "@/lib/admin/types";
import { PanelSection } from "../panel-section";
import { Badge } from "../ui/badge";
import { Card, CardContent } from "../ui/card";

type Props = { tickets: TicketView[]; selectedThreadId?: string; onOpen: (threadId: string) => void; nested?: boolean };

export function TicketQueue({ tickets, selectedThreadId, onOpen, nested = false }: Props) {
  return (
    <PanelSection nested={nested} title={`Escalation tickets (${tickets.length})`} icon={<Ticket className="h-4 w-4 text-blue-600" />} testId="ticket-queue">
      {tickets.length === 0 && <p className="text-sm text-zinc-600">No tickets yet. Ask the agent for a human in the customer demo.</p>}
      <div className="space-y-2">
        {tickets.map((t) => (
          <Card
            key={t.id}
            data-testid="ticket-row"
            data-ticket-id={t.id}
            data-status={t.status}
            aria-current={t.threadId === selectedThreadId ? "true" : undefined}
            className={t.threadId === selectedThreadId ? "border-blue-500! ring-1 ring-blue-500" : undefined}
          >
            <CardContent className="space-y-1.5 p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-semibold">{t.id}</span>
                <Badge tone={t.status === "open" ? "amber" : "green"}>{t.status}</Badge>
                {t.takeover.status === "human" && <Badge tone="blue">taken by {t.takeover.consultant}</Badge>}
                <span className="ml-auto text-xs text-zinc-600">{formatTime(t.createdAt, nested)}</span>
              </div>
              <p className="text-sm">{t.summary}</p>
              <p className="text-xs text-zinc-600">
                {t.customerName} ({t.customerId}) - {t.source === "rule" ? "escalation rule" : "agent"}: {t.reason}
              </p>
              <div className="flex items-center gap-3 text-xs">
                <a
                  href={`#thread=${encodeURIComponent(t.threadId)}`}
                  data-testid="open-conversation"
                  className="inline-flex min-h-10 items-center rounded-md border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100"
                  onClick={() => onOpen(t.threadId)}
                >
                  Open conversation
                </a>
                <a href={t.traceUrl} target="_blank" rel="noreferrer" data-testid="ticket-trace" className="flex min-h-6 items-center gap-1 text-blue-700 underline">
                  OpenAI trace <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
