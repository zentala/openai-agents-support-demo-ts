"use client";

/** Embedded worklist: reuse console cards and actions, stacked to fit the shared workspace. */
import type { AdminConsole } from "@/lib/client/use-admin-console";
import { CONSULTANTS } from "@/lib/admin/consultants";
import { ApprovalQueue } from "./approval-queue";
import { TicketQueue } from "./ticket-queue";
import { AuditLog } from "./audit-log";
import { ConversationPane } from "./conversation-pane";
import { MetricsStrip } from "./metrics-strip";
import { needsHumanCount } from "@/lib/client/consultant-badge";
import { useEffect, useRef } from "react";
import { ChevronDown, ScrollText, ShieldAlert } from "lucide-react";
import { sectionHeadingClass, SectionTitle } from "../panel-section";
import { ticketForThread } from "@/lib/client/selected-ticket";
import { humanQueueLabel } from "@/lib/client/human-queue-label";

function ConsoleNotices({ c }: { c: AdminConsole }) {
  return <>
    {c.state?.protected === false && !c.state.visitorScoped && !c.error?.includes("AdminPasswordRequired") && <div data-testid="unprotected-banner" role="note" className="flex items-start gap-2 rounded-md border border-gray-200 bg-gray-50 p-3 text-zinc-700"><ShieldAlert aria-hidden="true" className="h-5 w-5 shrink-0 text-amber-700" /><p>Unprotected demo console: anyone can approve refunds. Set ADMIN_PASSWORD. Production needs login and roles.</p></div>}
    {c.error && <div role="alert" data-testid="console-error" className="min-h-10 rounded-md border border-red-300 bg-red-50 p-3 text-red-800">
      <p>{c.error.includes("AdminPasswordRequired") ? "The consultant console is password-protected (ADMIN_PASSWORD). Your browser will ask for the password." : c.error}</p>
      <button className="mt-2 min-h-10 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-gray-100" onClick={() => void c.refresh()}>Retry</button>
    </div>}
  </>;
}

async function exportRatings(c: AdminConsole) {
  try {
    const response = await fetch("/api/admin/ratings/export");
    if (response.status === 401) throw new Error("AdminPasswordRequired");
    if (!response.ok) throw new Error(`RatingsExportFailed: HTTP ${response.status}`);
    const url = URL.createObjectURL(await response.blob());
    const link = document.createElement("a");
    link.href = url;
    link.download = "rated-scenarios.json";
    link.click();
    URL.revokeObjectURL(url);
  } catch (error) { c.setError(error instanceof Error ? error.message : String(error)); }
}

function ConsoleHistory({ c }: { c: AdminConsole }) {
  return <details className="group rounded-lg border border-gray-200 bg-white p-3">
    <summary className={`${sectionHeadingClass} cursor-pointer list-none text-base`}><SectionTitle title="History" icon={<ScrollText className="h-4 w-4 text-blue-600" />} /><ChevronDown aria-hidden="true" className="h-4 w-4 -rotate-90 group-open:rotate-0" /></summary>
    <div className="pt-3">
    <AuditLog nested audit={c.state?.audit ?? []} />
    <TicketQueue nested tickets={c.state?.tickets.filter((t) => t.status === "resolved") ?? []} selectedThreadId={c.threadId} onOpen={c.select} />
    <button data-testid="export-ratings" onClick={() => void exportRatings(c)} className="min-h-10 rounded-md border border-gray-300 px-3 hover:bg-gray-100">Export {c.state?.ratingsCount ?? 0} rating(s) as eval scenarios</button>
    </div>
  </details>;
}

export function ConsultantPanel({ c }: { c: AdminConsole }) {
  const { state, threadId } = c;
  return <div className="space-y-4 text-sm" data-testid="consultant-panel">
    <div className="flex flex-wrap items-center gap-2">
      <label className="flex items-center gap-2">Consultant
        <select data-testid="consultant-select" className="h-10 rounded-md border border-gray-300 px-2" value={c.consultant} onChange={(e) => c.setConsultant(e.target.value)}>
          {(state?.consultants ?? CONSULTANTS).map((name) => <option key={name}>{name}</option>)}
        </select>
      </label>
      <span className="text-xs text-zinc-600">{c.error ? "" : state ? state.visitorScoped ? "This browser's conversations" : state.protected ? "Password protected" : "Unprotected demo" : "Checking protection…"}</span>
    </div>
    <ConsoleNotices c={c} />
    <section aria-label="Needs a human">
      <h2 className="mb-3 text-lg font-semibold">{state ? humanQueueLabel(needsHumanCount(state)) : "Needs a human · loading"}</h2>
      <ApprovalQueue approvals={state?.approvals ?? []} acting={c.acting} onOpen={c.select} onDecide={(approvalId, approve) => void c.act({ type: "decide_approval", approvalId, approve })} />
      <TicketQueue tickets={state?.tickets.filter((t) => t.status === "open") ?? []} selectedThreadId={threadId} onOpen={c.select} />
    </section>
    <SelectedConversation c={c} />
    {state && <MetricsStrip metrics={state.metrics} />}
    <ConsoleHistory c={c} />
  </div>;
}

/** Scroll only after the selected transcript arrives; polling the same thread must not steal scroll. */
function SelectedConversation({ c }: { c: AdminConsole }) {
  const pane = useRef<HTMLDivElement>(null);
  const { state, threadId } = c;
  const ticket = ticketForThread(state?.tickets ?? [], threadId);
  const selectedThreadId = c.thread?.threadId;
  useEffect(() => {
    if (selectedThreadId && selectedThreadId === threadId) pane.current?.scrollIntoView({ block: "nearest" });
  }, [selectedThreadId, threadId]);
  return <div ref={pane}>
    <ConversationPane thread={c.thread} ticketId={ticket?.status === "open" ? ticket.id : undefined} ticketNumber={ticket?.id} consultant={c.consultant} acting={c.acting}
      onTakeOver={() => threadId && void c.act({ type: "take_over", threadId })}
      onHandBack={() => threadId && void c.act({ type: "hand_back", threadId })}
      onReply={(text) => threadId ? c.act({ type: "reply", threadId, text }) : Promise.resolve(false)}
      onRate={(entryId, rating, correction) => threadId && void c.act({ type: "rate", threadId, entryId, rating, correction })} />
  </div>;
}
