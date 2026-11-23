/** Offline staff reply moderation: local stems, classifier outcomes, audit and lockout. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const { classify } = vi.hoisted(() => ({ classify: vi.fn() }));
vi.mock("openai", () => ({ default: class { responses = { create: classify }; } }));

import { hasRudeTone, sendStaffReply } from "@/lib/admin/staff-reply";
import { listAudit, listTickets } from "@/lib/data/store";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { takeOver } from "@/lib/runtime/takeover";

let thread: Thread;
const send = (text: string) => sendStaffReply({ type: "take_over_and_reply", consultant: "Marta Nowak", threadId: thread.threadId, text });

beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "false");
  thread = createThread("c-anna");
  classify.mockResolvedValue({ output_text: '{"rude":false,"reason":"polite"}' });
});
afterEach(() => { removeThread(thread.threadId); vi.unstubAllEnvs(); vi.clearAllMocks(); });

it.each([
  "Cześć lamusie", "Jesteś debilem", "To idiotyczna odpowiedź", "Idź się kurwić",
  "You are an idiot", "What an asshole", "Du Arschloch", "Das ist dumm",
])("blocks rude language and inflections without a model call: %s", async (text) => {
  expect(hasRudeTone(text)).toBe(true);
  expect(await send(text)).toMatchObject({ ok: false, errorType: "StaffReplyBlocked" });
  expect(classify).not.toHaveBeenCalled();
  expect(thread.transcript).toEqual([]);
});

it.each(["I can help with delivery.", "Mogę sprawdzić tę dostawę.", "Ich helfe Ihnen gern."]) ("uses the classifier for polite %s", async (text) => {
  expect(await send(text)).toEqual({ ok: true });
  expect(classify).toHaveBeenCalledOnce();
  expect(thread.transcript.at(-1)?.text).toBe(text);
});

it("blocks a classifier refusal with its type and message and never delivers", async () => {
  classify.mockRejectedValueOnce(Object.assign(new Error("rate limited"), { name: "RateLimitError" }));
  expect(await send("I can help with delivery.")).toMatchObject({ ok: false, errorType: "RateLimitError", message: "rate limited" });
  expect(thread.transcript).toEqual([]);
});

it("releases a locked consultant after the third strike and keeps the manager ticket open", async () => {
  takeOver(thread.threadId, "Marta Nowak");
  for (let index = 0; index < 3; index += 1) await send(`You are an idiot ${index + 1}`);
  expect(thread.takeover).toEqual({ status: "agent" });
  expect(listTickets().find((ticket) => ticket.threadId === thread.threadId)).toMatchObject({ category: "manager_review", status: "open" });
});

it("blocks a rude classifier verdict and preserves three staff-only drafts for the manager", async () => {
  classify.mockResolvedValue({ output_text: '{"rude":true,"reason":"unprofessional"}' });
  for (let index = 0; index < 3; index += 1) await send(`A rude draft ${index + 1}`);
  expect(thread.staffLockouts).toEqual(["Marta Nowak"]);
  expect(thread.blockedReplies?.["Marta Nowak"]).toHaveLength(3);
  expect(listTickets().find((ticket) => ticket.threadId === thread.threadId)).toMatchObject({ category: "manager_review" });
  expect(listAudit().filter((record) => record.threadId === thread.threadId && record.decision === "reply_blocked")).toHaveLength(3);
  expect(JSON.stringify(listAudit().filter((record) => record.threadId === thread.threadId))).not.toContain("A rude draft");
});

it("a delivered polite reply resets the consecutive blocked count", async () => {
  await send("You are an idiot");
  expect(thread.blockedReplies?.["Marta Nowak"]).toHaveLength(1);
  await send("I can help with that.");
  expect(thread.blockedReplies?.["Marta Nowak"]).toBeUndefined();
});

it("does not locally block the word dummy", () => {
  expect(hasRudeTone("This is a dummy order reference.")).toBe(false);
});

it("checks a manager's rude draft before changing the active takeover", async () => {
  takeOver(thread.threadId, "Marta Nowak");
  const result = await sendStaffReply({ type: "take_over_and_reply", consultant: "Ewa Zielińska", threadId: thread.threadId, text: "You are an idiot." });
  expect(result).toMatchObject({ ok: false, errorType: "StaffReplyBlocked" });
  expect(thread.takeover).toMatchObject({ status: "human", consultant: "Marta Nowak" });
});

it("checks thread ownership before counting a non-owner's rude draft", async () => {
  takeOver(thread.threadId, "Marta Nowak");
  const result = await sendStaffReply({ type: "take_over_and_reply", consultant: "Tomasz Berg", threadId: thread.threadId, text: "You are an idiot." });
  expect(result).toMatchObject({ ok: false, errorType: "NotYourConversation" });
  expect(thread.staffLockouts).toBeUndefined();
  expect(thread.takeover).toMatchObject({ status: "human", consultant: "Marta Nowak" });
});
