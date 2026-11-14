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
import type { CustomerMessage } from "@/lib/message-kinds";
import type { TicketContext } from "@/lib/client/ticket-status";

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

it("keeps model speech and automatic error-limit escalation separate", () => {
  const thread = createThread("c-james");
  const result = finishTurn(thread, sessionContextOf(thread), { reply: "A model answer", approvals: [] }, { tools: [], toolErrors: 3 }, "request");
  const entries = customerMessages(result);
  expect(entries.map((entry) => entry.sender.kind)).toEqual(["ai", "system"]);
  expect(html(entries[0])).toContain("AI assistant");
  expect(html(entries[1])).not.toContain("AI assistant");
});

it("renders the guardrail finish as a safety receipt rather than an AI answer", () => {
  const thread = createThread("c-james");
  const result = finishTurn(thread, sessionContextOf(thread), { reply: "Blocked by relevance_guardrail", tripwire: "relevance_guardrail", approvals: [] }, { tools: [], toolErrors: 0 }, "request");
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
  expect(badge({ handler: "agent" })).toContain(">closed<");
  expect(badge({ openTicketId: "T-2003", handler: "human" })).toContain(">closed<");
});
