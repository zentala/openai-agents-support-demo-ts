/** Real turn/transcript producers feed the shared renderer; no paired producer/renderer mocks or model calls. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { MessageContent } from "@/components/message-content";
import { customerMessages } from "@/lib/runtime/customer-messages";
import { handleUserMessage } from "@/lib/runtime/turn";
import { createThread } from "@/lib/runtime/threads";
import { takeOverAndReply, handBack } from "@/lib/runtime/takeover";
import { readEventLog } from "@/lib/runtime/event-bus";
import { toCustomerEvent } from "@/lib/runtime/event-visibility";
import { toChatMessage } from "@/lib/client/pushed-messages";
import { withRequestKey } from "@/lib/security/request-key";
import { finishTurn } from "@/lib/runtime/turn-finish";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { openTicket } from "@/lib/runtime/tickets";
import { resolvedTicketsOf } from "@/lib/client/selectors";
import type { CustomerMessage } from "@/lib/message-kinds";
import type { TicketContext } from "@/lib/client/ticket-status";

const classifier = vi.hoisted(() => ({ run: vi.fn(async () => []) }));
vi.mock("@/lib/guardrails/action-claims", async () => {
  const actual = await vi.importActual<typeof import("@/lib/guardrails/action-claims")>("@/lib/guardrails/action-claims");
  return { ...actual, classifyActionClaims: classifier.run };
});

const html = (entry: CustomerMessage) => renderToStaticMarkup(createElement(MessageContent, entry));
afterEach(() => vi.unstubAllEnvs());

it("renders actual rule escalation as a ticket receipt in both transport and transcript, never AI speech", async () => {
  const thread = createThread("c-james");
  const result = await handleUserMessage(sessionContextOf(thread), "I would like to talk to a human, please");
  const entry = customerMessages(result)[0];
  expect(entry.sender).toMatchObject({ kind: "system", title: "Passed to a human", ticketId: expect.stringMatching(/^T-/) });
  expect(html(entry)).toContain('data-testid="message-ticket"');
  expect(html(entry)).toContain("Automatic step");
  expect(html(entry)).not.toContain("AI assistant");
  const saved = thread.transcript.at(-1)!;
  expect(html({ text: saved.text, sender: saved.sender! })).toBe(html(entry));
});

it("renders missing-key and stale-card producers as explicit automatic failures", async () => {
  vi.stubEnv("PUBLIC_DEMO", "true");
  const thread = createThread("c-james");
  const result = await withRequestKey(new Request("https://demo.example"), () => handleUserMessage(sessionContextOf(thread), "Where is my order?"));
  expect(html(customerMessages(result)[0])).toContain("VisitorKeyRequired");
  expect(html(customerMessages(result)[0])).not.toContain("AI assistant");
  const stale = await handleUserMessage(sessionContextOf(thread), "Yes", { type: "quick-reply", offerId: crypto.randomUUID(), decision: "yes" });
  expect(html(customerMessages(stale)[0])).toContain("no longer current");
  expect(customerMessages(stale)[0].sender.kind).toBe("system");
});

it("keeps model speech and automatic error-limit escalation separate", async () => {
  const thread = createThread("c-james");
  const result = await finishTurn(thread, sessionContextOf(thread), { reply: "A model answer", approvals: [] }, { tools: [], toolErrors: 3 }, "request");
  const entries = customerMessages(result);
  expect(entries.map((entry) => entry.sender.kind)).toEqual(["ai", "system"]);
  expect(html(entries[0])).toContain("AI assistant");
  expect(html(entries[1])).not.toContain("AI assistant");
});

it("renders the guardrail finish as a safety receipt rather than an AI answer", async () => {
  const thread = createThread("c-james");
  const result = await finishTurn(thread, sessionContextOf(thread), { reply: "Blocked by relevance_guardrail", tripwire: "relevance_guardrail", approvals: [] }, { tools: [], toolErrors: 0 }, "request");
  const entry = customerMessages(result)[0];
  expect(html(entry)).toContain("Blocked by a safety check");
  expect(html(entry)).not.toContain("AI assistant");
  expect(thread.transcript.at(-1)?.sender).toEqual(entry.sender);
});

it("pushes real consultant replies as human and lifecycle notices as thin system lines", () => {
  const thread = createThread("c-james");
  expect(takeOverAndReply(thread.threadId, "Marta Nowak", "I can help.").ok).toBe(true);
  expect(handBack(thread.threadId, "Marta Nowak").ok).toBe(true);
  const saved = thread.transcript.find((entry) => entry.role === "consultant")!;
  expect(html({ text: saved.text, sender: saved.sender! })).toContain("Marta Nowak · human");
  const pushed = readEventLog().map(({ event }) => toCustomerEvent(event)).find((event) => event?.kind === "chat_message" && event.entryId === saved.id)!;
  if (pushed.kind !== "chat_message") throw new Error("Missing pushed message");
  expect(toChatMessage(pushed).parts).toContainEqual({ type: "data-sender", data: saved.sender });
  const notice = thread.transcript.find((entry) => entry.role === "system")!;
  expect(html({ text: notice.text, sender: notice.sender! })).toContain('data-testid="message-system"');
});

it("derives the ticket badge status from the live ticket and handler, not a fixed word", () => {
  const card: CustomerMessage = { text: "A consultant will join.", sender: { kind: "system", title: "Passed to a human", ticketId: "T-2002" } };
  const badge = (ticket?: TicketContext) => renderToStaticMarkup(createElement(MessageContent, { ...card, ticket }));
  expect(badge()).toContain(">waiting<");
  expect(badge({ openTicketId: "T-2002", handler: "agent" })).toContain(">waiting<");
  expect(badge({ openTicketId: "T-2002", handler: "human" })).toContain(">taken over<");
  expect(badge({ openTicketId: "T-2002", handler: "human" })).not.toContain(">waiting<");
  // After a hand-back the conversation drops its ticket, but the ticket is not closed until the server says so.
  expect(badge({ handler: "agent" })).toContain(">in review<");
  expect(badge({ openTicketId: "T-2003", handler: "human" })).toContain(">in review<");
  expect(badge({ handler: "agent", resolvedTicketIds: ["T-2002"] })).toContain(">closed<");
  expect(badge({ openTicketId: "T-2002", handler: "agent", resolvedTicketIds: ["T-2002"] })).toContain(">closed<");
});

it("a hand-back closes a plain ticket for the customer but keeps a review ticket in review", () => {
  const closing = createThread("c-james");
  const plain = openTicket({ customerId: "c-james", threadId: closing.threadId, traceId: "t", summary: "s", source: "rule", reason: "legal_or_gdpr" }).ticket;
  expect(takeOverAndReply(closing.threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(closing.threadId, "Marta Nowak").ok).toBe(true);
  const resolved = () => readEventLog().filter(({ event }) => event.kind === "ticket_status").map(({ event }) => toCustomerEvent(event)).filter((event) => event?.kind === "ticket_status" && event.ticketId === plain.id);
  expect(resolved()).toHaveLength(1);

  const reviewing = createThread("c-james");
  const review = openTicket({ customerId: "c-james", threadId: reviewing.threadId, traceId: "t", summary: "s", source: "rule", reason: "manager_review", category: "manager_review" }).ticket;
  expect(takeOverAndReply(reviewing.threadId, "Marta Nowak", "Hello.").ok).toBe(true);
  expect(handBack(reviewing.threadId, "Marta Nowak").ok).toBe(true);
  const events = readEventLog().map(({ event }) => event);
  expect(events.some((event) => event.kind === "ticket_status" && event.ticketId === review.id)).toBe(false);
  expect(resolvedTicketsOf(events)).not.toContain(review.id);
  expect(resolvedTicketsOf(events)).toContain(plain.id);
});
