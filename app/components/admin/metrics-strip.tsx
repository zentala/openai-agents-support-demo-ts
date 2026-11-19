"use client";

/**
 * Metrics strip at the top of the console: escalation rate, guardrail trips, approvals, tool errors.
 * All numbers come from the in-memory event log (lib/admin/metrics.ts) and reset with the demo data.
 */
import type { Metrics } from "@/lib/admin/metrics";
import { Card, CardContent } from "../ui/card";
import { Icon } from "../icon";
import type { IconKey } from "@/lib/ui/icons";

type Tile = { id: string; label: string; icon: IconKey; value: string; hint?: string };

function tilesOf(m: Metrics): Tile[] {
  return [
    {
      id: "escalation-rate",
      label: "Escalation rate",
      icon: "ticket",
      value: `${Math.round(m.escalationRate * 100)}%`,
      hint: `${m.escalatedConversations} of ${m.conversations} conversations`,
    },
    { id: "guardrail-trips", label: "Guardrail trips", icon: "guardrail", value: String(m.guardrailTrips) },
    {
      id: "approvals",
      label: "Approvals",
      icon: "approval",
      value: `${m.approvals.pending} / ${m.approvals.approved} / ${m.approvals.rejected}`,
      hint: "pending / approved / rejected",
    },
    { id: "tool-errors", label: "Tool errors", icon: "error", value: String(m.toolErrors) },
  ];
}

export function MetricsStrip({ metrics }: { metrics: Metrics }) {
  return (
    <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4" data-testid="metrics-strip">
      {tilesOf(metrics).map((tile) => (
        <Card key={tile.id} data-testid={`metric-${tile.id}`}>
          <CardContent className="p-3">
            <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-zinc-600"><Icon name={tile.icon} size={14} />{tile.label}</p>
            <p className="text-2xl font-semibold text-zinc-900" data-testid={`metric-${tile.id}-value`}>{tile.value}</p>
            {tile.hint && <p className="text-xs text-zinc-600">{tile.hint}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
