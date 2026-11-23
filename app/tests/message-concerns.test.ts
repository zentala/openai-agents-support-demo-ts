/** Offline report and ask-a-person behavior: the quote and author come from the server transcript. */
import { afterEach, beforeEach, expect, it } from "vitest";
import { vi } from "vitest";
const { classify } = vi.hoisted(() => ({ classify: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create: classify }; } }));
import { createMessageConcern } from "@/lib/runtime/message-concerns";
import { listMessageReports, listTickets } from "@/lib/data/store";
import { addTranscript, createThread, removeThread } from "@/lib/runtime/threads";
import { sendStaffReply } from "@/lib/admin/staff-reply";

let thread = createThread("c-anna");
beforeEach(() => { vi.stubEnv("PUBLIC_DEMO", "false"); thread = createThread("c-anna"); classify.mockResolvedValue({ output_text: '{"rude":false,"reason":"polite"}' }); });
afterEach(() => { removeThread(thread.threadId); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it("creates a report quoting an AI transcript answer and a staff ticket", () => {
  const answer = addTranscript(thread, { role: "agent", text: "The chair is solid oak." });
  expect(createMessageConcern(thread.threadId, answer.id, "That is not what the product page says.", "report")).toMatchObject({ ok: true, status: "REPORT_CREATED" });
  expect(listMessageReports().at(-1)).toMatchObject({ entryId: answer.id, quote: answer.text, author: "AI assistant", kind: "report" });
  expect(listTickets().find((ticket) => ticket.threadId === thread.threadId)).toMatchObject({ category: "message_report" });
});

it("routes a consultant message report to manager review and rejects forged entry ids", () => {
  const reply = addTranscript(thread, { role: "consultant", author: "Marta Nowak", text: "That was rude." });
  expect(createMessageConcern(thread.threadId, reply.id, "The consultant insulted me.", "report")).toMatchObject({ ok: true });
  expect(listTickets().find((ticket) => ticket.threadId === thread.threadId)).toMatchObject({ category: "manager_review" });
  expect(createMessageConcern(thread.threadId, crypto.randomUUID(), "A false quote", "report")).toMatchObject({ ok: false, errorType: "MessageNotFound" });
});

it("creates a question ticket linked to the exact answer without taking over the AI", () => {
  const answer = addTranscript(thread, { role: "agent", text: "The warranty lasts two years." });
  expect(createMessageConcern(thread.threadId, answer.id, "Is this true for every country?", "question")).toMatchObject({ ok: true, status: "QUESTION_CREATED" });
  expect(thread.takeover.status).toBe("agent");
  expect(listTickets().find((ticket) => ticket.threadId === thread.threadId)?.summary).toContain(answer.text);
});

it("lets a consultant answer an open question with an About quote", async () => {
  const answer = addTranscript(thread, { role: "agent", text: "The warranty lasts two years." });
  createMessageConcern(thread.threadId, answer.id, "Does this apply in Germany?", "question");
  expect(await sendStaffReply({ type: "take_over_and_reply", consultant: "Marta Nowak", threadId: thread.threadId, text: "Yes, it does." })).toEqual({ ok: true });
  expect(thread.transcript.at(-1)?.text).toBe("About: “The warranty lasts two years.”\n\nYes, it does.");
  expect(listMessageReports().find((record) => record.threadId === thread.threadId)?.answeredAt).toBeTruthy();
});
