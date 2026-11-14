/**
 * Builds the JSON the consultant console reads. Server only: it reads the in-memory stores.
 */
import { getCustomer, listAudit, listRatings, listTickets } from "@/lib/data/store";
import { listPendingApprovals } from "@/lib/runtime/approvals";
import { readEventLog } from "@/lib/runtime/event-bus";
import { getThread } from "@/lib/runtime/threads";
import { initialTakeover } from "@/lib/runtime/takeover-state";
import { isAdminProtected } from "./auth";
import { CONSULTANTS } from "./consultants";
import { computeMetrics } from "./metrics";
import type { AdminState, ThreadView } from "./types";
import { canInspectThread } from "./visitor-access";
import { isPublicDemo } from "@/lib/security/request-key";
import { customerOrderOf } from "./customer-order";

export const traceUrlFor = (traceId: string): string =>
  traceId ? `https://platform.openai.com/traces/trace?trace_id=${traceId}` : "https://platform.openai.com/traces";

const nameOf = (customerId: string): string => getCustomer(customerId)?.name ?? customerId;

export function buildAdminState(request?: Request): AdminState {
  const visible = (threadId: string) => canInspectThread(request, threadId);
  const audit = listAudit().filter((record) => visible(record.threadId));
  const approvals = listPendingApprovals().filter((record) => visible(record.threadId));
  return {
    protected: isAdminProtected(),
    visitorScoped: isPublicDemo(),
    consultants: CONSULTANTS,
    // Newest ticket first: the queue a consultant works from the top.
    tickets: listTickets()
      .filter((ticket) => visible(ticket.threadId))
      .map((ticket) => ({
        ...ticket,
        customerName: nameOf(ticket.customerId),
        traceUrl: traceUrlFor(ticket.traceId),
        takeover: getThread(ticket.threadId)?.takeover ?? initialTakeover(),
      }))
      .reverse(),
    approvals,
    audit: [...audit].reverse(),
    metrics: computeMetrics(readEventLog().filter((record) => visible(record.threadId)), {
      pending: approvals.length,
      approved: audit.filter((a) => a.decision === "approved").length,
      rejected: audit.filter((a) => a.decision === "rejected").length,
    }),
    ratingsCount: listRatings().filter((record) => visible(record.threadId)).length,
  };
}

export function buildThreadView(threadId: string, request?: Request): ThreadView | undefined {
  if (!canInspectThread(request, threadId)) return undefined;
  const thread = getThread(threadId);
  if (!thread) return undefined;
  const ratings = Object.fromEntries(
    listRatings()
      .filter((r) => r.threadId === threadId)
      .map((r) => [r.entryId, { rating: r.rating, correction: r.correction, ratedBy: r.ratedBy }]),
  );
  return {
    threadId,
    customerId: thread.customerId,
    customerName: nameOf(thread.customerId),
    traceId: thread.traceId,
    traceUrl: traceUrlFor(thread.traceId),
    takeover: thread.takeover,
    transcript: thread.transcript,
    staffInstruction: thread.staffInstruction,
    customerOrder: customerOrderOf(thread),
    ratings,
  };
}
