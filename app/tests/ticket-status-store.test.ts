/**
 * Ticket status comes from the ticket store, not from the bounded event log: a closed ticket stays
 * closed after its event is evicted, and the console shows every ticket's own status.
 * Real store, real stream, real hand-back; no mocks.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, expect, it } from "vitest";
import { ConversationPane } from "@/components/admin/conversation-pane";
import { buildThreadView } from "@/lib/admin/state";
import { resolvedTicketsOf } from "@/lib/client/selectors";
import { resetDemoData } from "@/lib/data/store";
import { clearEventLog } from "@/lib/runtime/event-bus";
import { toCustomerEvent } from "@/lib/runtime/event-visibility";
import { eventStreamResponse } from "@/lib/runtime/sse";
import { handBack, takeOverAndReply } from "@/lib/runtime/takeover";
import { createThread } from "@/lib/runtime/threads";
import { openTicket } from "@/lib/runtime/tickets";
import type { AgentEvent } from "@/lib/types";

beforeEach(() => {
  resetDemoData();
  clearEventLog();
});

const open = (threadId: string, category?: "manager_review") =>
  openTicket({ customerId: "c-james", threadId, traceId: "t", summary: "s", source: "rule", reason: "legal_or_gdpr", category }).ticket;

/** What a customer browser receives when it opens the stream now. */
async function customerEventsOf(threadId: string, customerChannel = true): Promise<AgentEvent[]> {
  const abort = new AbortController();
  const response = eventStreamResponse(new Request("http://localhost/stream", { signal: abort.signal }), threadId, customerChannel ? toCustomerEvent : (event) => event, customerChannel);
  const reader = response.body!.getReader();
  let text = "";
  while (!text.includes(": connected")) text += new TextDecoder().decode((await reader.read()).value);
  abort.abort();
  return text.split("\n").filter((line) => line.startsWith("data: ")).map((line) => JSON.parse(line.slice(6)) as AgentEvent);
}

it("keeps a closed ticket closed for the customer after the event log forgot the ticket_status event", async () => {
  const { threadId } = createThread("c-james");
  const ticket = open(threadId);
  expect(takeOverAndReply(threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(threadId, "Marta Nowak").ok).toBe(true);
  expect(resolvedTicketsOf(await customerEventsOf(threadId))).toEqual([ticket.id]);

  clearEventLog();
  const afterEviction = await customerEventsOf(threadId);
  expect(afterEviction.map((event) => event.kind)).toEqual(["ticket_status"]);
  expect(resolvedTicketsOf(afterEviction)).toEqual([ticket.id]);
  expect(afterEviction[0]).toMatchObject({ kind: "ticket_status", ticketId: ticket.id, status: "resolved" });
});

it("keeps store-built ticket events off the inspector channel", async () => {
  const { threadId } = createThread("c-james");
  open(threadId);
  expect(takeOverAndReply(threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(threadId, "Marta Nowak").ok).toBe(true);
  clearEventLog();
  expect(resolvedTicketsOf(await customerEventsOf(threadId, false))).toEqual([]);
});

it("does not announce a ticket twice while its event is still in the log, nor a ticket still in review", async () => {
  const { threadId } = createThread("c-james");
  const plain = open(threadId);
  expect(takeOverAndReply(threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(threadId, "Marta Nowak").ok).toBe(true);
  open(threadId, "manager_review");
  expect(resolvedTicketsOf(await customerEventsOf(threadId))).toEqual([plain.id]);
});

it("shows each ticket's own status in the console, not only the newest", () => {
  const first = createThread("c-james");
  const closed = open(first.threadId);
  expect(takeOverAndReply(first.threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(first.threadId, "Marta Nowak").ok).toBe(true);
  const reviewing = open(first.threadId, "manager_review");
  for (const ticket of [closed, reviewing]) {
    first.transcript.push({ id: `card-${ticket.id}`, role: "agent", text: "Passed to a human.", ts: Date.now(), sender: { kind: "system", title: "Passed to a human", ticketId: ticket.id } });
  }
  const view = buildThreadView(first.threadId)!;
  expect(view.tickets).toEqual([{ id: closed.id, status: "resolved" }, { id: reviewing.id, status: "open" }]);
  const html = renderToStaticMarkup(createElement(ConversationPane, {
    thread: view, ticketId: reviewing.id, ticketNumber: reviewing.id, consultant: "Marta Nowak", acting: false,
    onHandBack: async () => true, onReply: async () => ({ ok: true as const }), onRate: () => {},
  }));
  const badgeOf = (id: string) => new RegExp(`${id}</span><span[^>]*>([^<]+)<`).exec(html)?.[1];
  expect(badgeOf(closed.id)).toBe("closed");
  expect(badgeOf(reviewing.id)).toBe("waiting");
});
