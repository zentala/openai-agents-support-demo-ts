"use client";

/**
 * Audit log of human decisions: who decided, when, what, and under which OpenAI trace.
 * Newest first. Records live in server memory (a real product writes them to an append-only store).
 */
import { formatTime } from "@/lib/client/format-time";
import { Icon } from "@/components/icon";
import type { AuditRecord } from "@/lib/data/store";
import { PanelSection } from "../panel-section";
import { Badge } from "../ui/badge";

export function AuditLog({ audit, nested = false }: { audit: AuditRecord[]; nested?: boolean }) {
  return (
    <PanelSection nested={nested} title={`Audit log (${audit.length})`} icon={<Icon name="audit" className="h-4 w-4 text-blue-600" />} testId="audit-log">
      {audit.length === 0 && <p className="text-sm text-zinc-600">No decisions recorded yet.</p>}
      <div className="space-y-2">
        {audit.map((a) => (
          <div key={a.id} data-testid="audit-row" data-decision={a.decision} className="rounded-md border border-gray-200 bg-white p-2 text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Badge icon={a.decision === "approved" ? "passed" : a.decision === "rejected" ? "failed" : "guardrail"} tone={a.decision === "approved" ? "green" : a.decision === "rejected" ? "red" : "amber"}>
                {a.decision === "reply_blocked" ? "Reply blocked" : a.decision}
              </Badge>
              <span className="font-medium">{a.decidedBy}</span>
              <span className="ml-auto text-xs text-zinc-600">{formatTime(a.decidedAt, true)}</span>
            </div>
            <p>{a.summary}</p>
            <a
              href={`https://platform.openai.com/traces/trace?trace_id=${a.traceId}`}
              target="_blank"
              rel="noreferrer"
              className="flex min-h-6 items-center gap-1 font-mono text-xs text-blue-700 underline"
            >
              {a.traceId} <Icon name="external" className="h-3 w-3" />
            </a>
          </div>
        ))}
      </div>
    </PanelSection>
  );
}
