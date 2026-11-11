"use client";

/**
 * "Handled by": who answers the customer right now, the AI agent or a human consultant who took the
 * conversation over, plus the escalation ticket when there is one.
 */
import { UserRound } from "lucide-react";
import type { HandlerStatus as Status } from "@/lib/types";
import { PanelSection } from "./panel-section";
import { Badge } from "./ui/badge";
import { handlerDescription } from "@/lib/client/handler-description";

type Props = { status: Status; consultant?: string; ticketId?: string };

export function HandlerStatus({ status, consultant, ticketId }: Props) {
  const human = status === "human";
  return (
    <PanelSection title="Handled by" icon={<UserRound className="h-4 w-4 text-blue-600" />} testId="handler-status">
      <div className="flex flex-wrap items-center gap-2 text-sm" data-status={status} data-testid="handler-status-value">
        <Badge data-testid="handler-badge" tone={human || ticketId ? "amber" : "blue"}>{human ? "Human colleague" : ticketId ? "AI agent · ticket open" : "AI agent"}</Badge>
        <span className="text-zinc-700" data-testid={ticketId ? "handler-ticket" : undefined}>{handlerDescription(status, consultant, ticketId)}</span>
      </div>
    </PanelSection>
  );
}
