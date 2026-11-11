"use client";

/**
 * Pending approvals: paused agent actions (refunds above the limit) waiting for a consultant.
 * The decision is sent with the consultant picked in the header, so the audit log names a person.
 */
import { formatTime } from "@/lib/client/format-time";
import { ExternalLink, ShieldAlert } from "lucide-react";
import type { ApprovalRequest } from "@/lib/types";
import { PanelSection } from "../panel-section";
import { Card, CardContent } from "../ui/card";

type Props = {
  approvals: ApprovalRequest[];
  acting: boolean;
  onDecide: (approvalId: string, approve: boolean) => void;
  onOpen?: (threadId: string) => void;
};

const buttonClass = "min-h-10 rounded-md px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50";

export function ApprovalQueue({ approvals, acting, onDecide, onOpen }: Props) {
  if (approvals.length === 0) return <p data-testid="console-approvals" className="mb-4 text-sm text-zinc-700">Pending approvals: none</p>;
  return (
    <PanelSection title={`Pending approvals (${approvals.length})`} icon={<ShieldAlert className="h-4 w-4 text-blue-600" />} testId="console-approvals">
      <div className="space-y-2">
        {approvals.map((a) => (
          <Card key={a.approvalId} data-testid="console-approval-card" className="border-amber-300">
            <CardContent className="space-y-2 p-3">
              <p className="font-mono text-sm font-semibold"><span className="mr-2 rounded-md bg-amber-100 px-2 text-xs text-amber-900">Approval</span>{a.toolName}</p>
              <p className="text-sm">{a.summary}</p>
              <p className="text-xs text-zinc-600">
                {a.customerName} ({a.customerId}) - requested by {a.agent} at {formatTime(a.createdAt)}
              </p>
              <a
                href={`https://platform.openai.com/traces/trace?trace_id=${a.traceId}`}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-6 items-center gap-1 text-xs text-blue-700 underline"
              >
                OpenAI trace <ExternalLink className="h-3 w-3" />
              </a>
              <div className="flex flex-wrap gap-2">
                {onOpen && <button onClick={() => onOpen(a.threadId)} className="min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium hover:bg-gray-100">Open conversation</button>}
                <button data-testid="console-approve" disabled={acting} className={`${buttonClass} bg-emerald-700 hover:bg-emerald-800`} onClick={() => onDecide(a.approvalId, true)}>
                  Approve
                </button>
                <button data-testid="console-reject" disabled={acting} className={`${buttonClass} bg-red-600 hover:bg-red-700`} onClick={() => onDecide(a.approvalId, false)}>
                  Reject
                </button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
