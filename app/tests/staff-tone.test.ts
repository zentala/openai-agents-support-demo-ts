/** Real admin HTTP checks: tone warning has no customer effects until an exact, owner-bound resend. */
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/actions/route";
import { hasRudeTone } from "@/lib/admin/staff-reply";
import { buildAdminState, buildThreadView } from "@/lib/admin/state";
import { listAudit } from "@/lib/data/store";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import { createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { takeOver, handBack } from "@/lib/runtime/takeover";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import type { AgentEvent } from "@/lib/types";

let thread: Thread;
let extra: Thread;
let events: AgentEvent[];
let stop: () => void;
const RUDE = "nie ma opcji idz sie jebac";
const cookie = (owner: Thread) => credentialSetCookie(owner.threadId, false).split(";")[0];
const send = (body: object = {}, owner = thread) => POST(new Request("https://demo.example/api/admin/actions", {
  method: "POST", headers: { "Content-Type": "application/json", cookie: cookie(owner) },
  body: JSON.stringify({ type: "take_over_and_reply", consultant: "Marta Nowak", threadId: thread.threadId, text: RUDE, ...body }),
}));
const audit = () => listAudit().filter((record) => record.threadId === thread.threadId);
async function warning() {
  const response = await send();
  expect(response.status).toBe(409);
  const result = await response.json();
  expect(result).toMatchObject({ ok: false, errorType: "StaffToneWarning", message: "This may sound rude to the customer. Send anyway?" });
  expect(result.warningId).toEqual(expect.any(String));
  return result.warningId as string;
}
beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "false");
  vi.stubEnv("SESSION_SECRET", "synthetic-tone-test-secret");
  clearEventLog();
  thread = createThread("c-anna"); extra = createThread("c-anna"); events = [];
  stop = subscribeToThread(thread.threadId, (event) => events.push(event));
});
afterEach(() => { stop(); removeThread(thread.threadId); removeThread(extra.threadId); vi.unstubAllEnvs(); });

it.each([RUDE, "You are a FUCKING idiot", "Jesteś GŁUPI", "KURWA!", "This is bullshit."])("warns for Polish/English whole words: %s", (text) => {
  expect(hasRudeTone(text)).toBe(true);
});
it.each(["Your shipping assignment is ready", "Shiitake table finish", "Delivery is delayed; I can help."])("allows ordinary vocabulary: %s", (text) => {
  expect(hasRudeTone(text)).toBe(false);
});
it("first warning and repeated ordinary Send never take over, send, or duplicate the audit record", async () => {
  const id = await warning();
  expect(await warning()).toBe(id);
  expect(thread.takeover.status).toBe("agent");
  expect(thread.transcript).toEqual([]); expect(thread.history).toEqual([]); expect(events).toEqual([]);
  expect(audit()).toMatchObject([{ decision: "tone_warning", warningId: id, decidedBy: "Marta Nowak" }]);
  expect(JSON.stringify(audit())).not.toContain(RUDE);
  expect(buildThreadView(thread.threadId)).not.toHaveProperty("pendingReplyWarning");
  const state = buildAdminState();
  expect(state.metrics.approvals.approved).toBe(listAudit().filter((record) => record.decision === "approved").length);
  expect(state.metrics.approvals.rejected).toBe(listAudit().filter((record) => record.decision === "rejected").length);
});
it("only acknowledged resend takes over and delivers once, with a correlated audit decision", async () => {
  const id = await warning();
  expect((await send({ toneAcknowledgement: id })).status).toBe(200);
  expect(thread.takeover).toMatchObject({ status: "human", consultant: "Marta Nowak" });
  expect(thread.transcript.map((entry) => entry.role)).toEqual(["system", "consultant"]);
  expect(thread.transcript.at(-1)?.text).toBe(RUDE);
  expect(events.filter((event) => event.kind === "chat_message")).toHaveLength(2);
  expect(audit().map((record) => [record.decision, record.warningId])).toEqual([["tone_warning", id], ["sent_after_warning", id]]);
  expect((await send({ toneAcknowledgement: id })).status).toBe(409);
  expect(thread.transcript.filter((entry) => entry.role === "consultant")).toHaveLength(1);
});
it.each(["You are an idiot", "I can help with delivery."])("changed text cannot reuse an acknowledgement: %s", async (text) => {
  const id = await warning();
  expect((await send({ text, toneAcknowledgement: id })).status).toBe(409);
  expect(thread.takeover.status).toBe("agent"); expect(thread.transcript).toEqual([]);
});
it("acknowledgement cannot move between threads, consultants or reply actions", async () => {
  const id = await warning();
  expect((await send({ threadId: extra.threadId, toneAcknowledgement: id })).status).toBe(409);
  expect(extra.takeover.status).toBe("agent"); expect(extra.transcript).toEqual([]);
  expect((await send({ consultant: "Tomasz Berg", toneAcknowledgement: id })).status).toBe(409);
  expect(thread.takeover.status).toBe("agent"); expect(thread.transcript).toEqual([]);
  takeOver(thread.threadId, "Marta Nowak");
  const snapshot = structuredClone(thread.transcript);
  expect((await send({ type: "reply", toneAcknowledgement: id })).status).toBe(409);
  expect(thread.transcript).toEqual(snapshot);
});
it("legacy reply warns before delivery and respects another consultant's ownership", async () => {
  takeOver(thread.threadId, "Marta Nowak");
  const snapshot = structuredClone(thread.transcript);
  const response = await send({ type: "reply" });
  expect(response.status).toBe(409);
  const { warningId } = await response.json();
  expect(thread.transcript).toEqual(snapshot);
  expect((await send({ type: "reply", consultant: "Tomasz Berg", toneAcknowledgement: warningId })).status).toBe(409);
  expect(thread.transcript).toEqual(snapshot);
  expect((await send({ type: "take_over_and_reply", toneAcknowledgement: warningId })).status).toBe(409);
  expect(thread.transcript).toEqual(snapshot);
  const refreshed = await send({ type: "reply" });
  const nextWarning = (await refreshed.json()).warningId;
  expect((await send({ type: "reply", toneAcknowledgement: nextWarning })).status).toBe(200);
  expect(thread.transcript.at(-1)?.text).toBe(RUDE);
});
it("a foreign same-customer cookie cannot acknowledge or replace the owner's pending warning", async () => {
  const id = await warning();
  vi.stubEnv("PUBLIC_DEMO", "true");
  expect((await send({ toneAcknowledgement: id }, extra)).status).toBe(403);
  const foreignView = buildAdminState(new Request("https://demo.example", { headers: { cookie: cookie(extra) } }));
  expect(foreignView.audit.some((record) => record.warningId === id)).toBe(false);
  expect(thread.pendingReplyWarning?.id).toBe(id);
  expect(thread.takeover.status).toBe("agent"); expect(thread.transcript).toEqual([]);
  expect((await send({ toneAcknowledgement: id })).status).toBe(200);
});
it("ordinary edited reply sends normally, invalidates the old warning, and hand-back clears pending consent", async () => {
  const id = await warning();
  expect((await send({ text: "I can help with delivery." })).status).toBe(200);
  expect(thread.pendingReplyWarning).toBeUndefined();
  expect((await send({ toneAcknowledgement: id })).status).toBe(409);
  handBack(thread.threadId, "Marta Nowak");
  expect(thread.pendingReplyWarning).toBeUndefined();
  expect(thread.transcript.filter((entry) => entry.role === "consultant").map((entry) => entry.text)).toEqual(["I can help with delivery."]);
});
