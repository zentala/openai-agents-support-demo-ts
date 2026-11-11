"use client";

/**
 * "Approvals" in the Agent View: a READ-ONLY status card. The decision itself is made by a consultant
 * in the console (/admin); this card only shows what is waiting and what was decided, so the
 * single-screen demo still tells the whole story.
 *
 * SECURITY: before, the customer's own browser could press Approve on its own refund. Moving the
 * buttons to the console (behind its own access control) removes that hole; the console also records
 * who decided, and when.
 */
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import type { ApprovalView } from "@/lib/client/selectors";
import { Badge, type BadgeTone } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { PanelSection } from "./panel-section";

const TONE: Record<ApprovalView["status"], BadgeTone> = { pending: "amber", approved: "green", rejected: "red" };

export function Approvals({ approvals }: { approvals: ApprovalView[] }) {
  return (
    <PanelSection title="Approvals" icon={<ShieldAlert className="h-4 w-4 text-blue-600" />} testId="approvals">
      {approvals.length === 0 && <p className="text-sm text-zinc-600">No actions waiting for a human.</p>}
      <div className="space-y-2">
        {approvals.map((a) => (
          <Card key={a.approvalId} data-testid="approval-card" data-status={a.status} className="border-amber-300">
            <CardContent className="space-y-2 p-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-sm font-semibold">{a.toolName}</span>
                <Badge tone={TONE[a.status]}>{a.status}</Badge>
              </div>
              <p className="text-sm">{a.summary}</p>
              <p className="text-xs text-zinc-600">
                customer: {a.customerName} ({a.customerId}) - requested by {a.agent}
              </p>
              <p className="text-xs text-zinc-600" data-testid="approval-note">
                {a.status === "pending" ? (
                  <>
                    Waiting for a consultant.{" "}
                    <Link href={`/?tab=consultant#thread=${encodeURIComponent(a.threadId)}`} onClick={() => { window.location.hash = `thread=${encodeURIComponent(a.threadId)}`; }} className="inline-flex min-h-10 items-center rounded-md border border-blue-300 px-3 text-blue-700 hover:bg-blue-50">Open in Consultant tab</Link>
                  </>
                ) : (
                  <>Decided by {a.decidedBy}.</>
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </PanelSection>
  );
}
