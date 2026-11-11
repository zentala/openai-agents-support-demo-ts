/** Two visitors sharing a mock customer must still have disjoint console reads, actions and SSE. */
import { RunContext, RunState } from "@openai/agents";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { triageAgent } from "@/lib/agents";
import { proxy } from "@/proxy";
import { GET as stateGet } from "@/app/api/admin/state/route";
import { GET as threadGet } from "@/app/api/admin/threads/[threadId]/route";
import { GET as inspectorGet } from "@/app/api/admin/inspector/[threadId]/stream/route";
import { GET as exportGet } from "@/app/api/admin/ratings/export/route";
import { POST as actionPost } from "@/app/api/admin/actions/route";
import { POST as resetPost } from "@/app/api/reset/route";
import { POST as createThreadPost } from "@/app/api/threads/route";
import { addAudit, addTicket, listAudit, resetDemoData, saveRating } from "@/lib/data/store";
import { savePausedRun, getPendingApproval } from "@/lib/runtime/approvals";
import { clearEventLog, emitAgentEvent } from "@/lib/runtime/event-bus";
import { addTranscript, createThread, removeThread, type Thread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";
import { buildAdminState, buildThreadView } from "@/lib/admin/state";
import type { SupportContext } from "@/lib/types";
import type { RunOutcome } from "@/lib/runtime/run-support";

// Only resumed inference is mocked; HTTP authorization, RunState restore, decisions and audit stay real.
const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));

let own: Thread;
let foreign: Thread;
const cookie = (thread: Thread) => credentialSetCookie(thread.threadId, false).split(";")[0];
const request = (thread?: Thread, body?: object) => new Request("https://demo.example/api/admin/state", {
  method: body ? "POST" : "GET", headers: { ...(thread ? { cookie: cookie(thread) } : {}), "Content-Type": "application/json" },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
const params = (thread: Thread) => ({ params: Promise.resolve({ threadId: thread.threadId }) });

function seed(thread: Thread) {
  const ctx: SupportContext = { customerId: thread.customerId, customerName: "Anna", language: "en", threadId: thread.threadId };
  const common = { customerId: thread.customerId, threadId: thread.threadId, traceId: thread.traceId };
  addTicket({ ...common, summary: thread.threadId, source: "rule", reason: "human_requested" });
  addAudit({ ...common, approvalId: thread.threadId, toolName: "refund", summary: "done", decision: "approved", decidedBy: "Marta Nowak", decidedAt: new Date().toISOString() });
  addTranscript(thread, { role: "agent", text: "Hello" });
  saveRating({ ...common, entryId: "entry", rating: "up", ratedBy: "Marta Nowak", ratedAt: new Date().toISOString(),
    userTurns: [thread.threadId], agentReply: "Hello", tools: [] });
  const item = { rawItem: { callId: thread.threadId }, name: "create_refund", arguments: "{}", agent: { name: "Orders" } };
  savePausedRun(ctx, thread.traceId, new RunState(new RunContext(ctx), "hi", triageAgent, 10), [item as never]);
  emitAgentEvent(thread.threadId, { kind: "trace", traceId: thread.traceId, url: "" });
  emitAgentEvent(thread.threadId, { kind: "guardrail", name: "test", stage: "input", passed: false, reasoning: thread.threadId });
}
beforeEach(() => {
  model.run.mockReset().mockResolvedValue({ reply: "Your synthetic refund was approved.", approvals: [] } satisfies RunOutcome);
  vi.stubEnv("PUBLIC_DEMO", "true"); vi.stubEnv("ADMIN_PASSWORD", "");
  vi.stubEnv("SESSION_SECRET", "synthetic-private-visitor-console-secret");
  resetDemoData(); clearEventLog();
  own = createThread("c-anna"); foreign = createThread("c-anna");
  seed(own); seed(foreign);
});
afterEach(() => { removeThread(own.threadId); removeThread(foreign.threadId); vi.unstubAllEnvs(); });

it("scopes tickets, approvals, audit, ratings and metric inputs to the visitor's signed cookies", async () => {
  const state = await (await stateGet(request(own))).json();
  expect(state.visitorScoped).toBe(true); expect(state.protected).toBe(false);
  for (const collection of [state.tickets, state.approvals, state.audit]) {
    expect(collection).toHaveLength(1); expect(collection[0].threadId).toBe(own.threadId);
  }
  expect(state.ratingsCount).toBe(1);
  expect(state.metrics).toMatchObject({ conversations: 1, guardrailTrips: 1, approvals: { pending: 1, approved: 1, rejected: 0 } });
  expect(JSON.stringify(state).includes(foreign.threadId)).toBe(false);
  const exported = await (await exportGet(request(own))).json();
  expect(exported).toHaveLength(1); expect(exported[0].message).toBe(own.threadId);
});

it("shows own thread and inspector replay but refuses foreign or forged-cookie targets", async () => {
  expect((await threadGet(request(own), params(own))).status).toBe(200);
  expect((await threadGet(request(own), params(foreign))).status).toBe(403);
  expect((await inspectorGet(request(own), params(foreign))).status).toBe(403);
  const stream = await inspectorGet(request(own), params(own));
  expect(stream.status).toBe(200);
  const reader = stream.body!.getReader();
  try {
    expect(new TextDecoder().decode((await reader.read()).value)).toContain(own.traceId);
  } finally { await reader.cancel(); }
  const forged = new Request("https://demo.example", { headers: { cookie: cookie(own).replace(own.threadId, foreign.threadId) } });
  expect((await threadGet(forged, params(foreign))).status).toBe(403);
});

it("refuses every foreign mutation and leaves foreign approvals and takeover untouched", async () => {
  const actions = [{ type: "take_over" }, { type: "hand_back" }, { type: "reply", text: "Hello" },
    { type: "rate", entryId: "entry", rating: "up" }, { type: "decide_approval", approvalId: foreign.threadId, approve: true }];
  for (const action of actions) {
    const response = await actionPost(request(own, { consultant: "Marta Nowak", threadId: foreign.threadId, ...action }));
    expect(response.status).toBe(403);
  }
  expect(foreign.takeover.status).toBe("agent");
  expect(getPendingApproval(foreign.threadId)).toBeDefined();
  expect((await actionPost(request(own, { consultant: "Marta Nowak", threadId: own.threadId, type: "take_over" }))).status).toBe(200);
});

it("lets a public visitor approve their own thread and resolves only that approval", async () => {
  const ownAuditCount = listAudit().filter((record) => record.threadId === own.threadId).length;
  expect(getPendingApproval(own.threadId)).toBeDefined();
  const req = request(own, { type: "decide_approval", consultant: "Marta Nowak", approvalId: own.threadId, approve: true });
  // Synthetic header passes the real request-key gate; no provider is contacted by this test.
  req.headers.set("x-openai-key", "sk-" + "synthetic-own-approval-key");
  const response = await actionPost(req);
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ ok: true });
  expect(getPendingApproval(own.threadId)).toBeUndefined();
  expect(getPendingApproval(foreign.threadId)).toBeDefined();
  const ownAudit = listAudit().filter((record) => record.threadId === own.threadId);
  expect(ownAudit).toHaveLength(ownAuditCount + 1);
  expect(ownAudit.at(-1)).toMatchObject({ approvalId: own.threadId, decision: "approved", decidedBy: "Marta Nowak" });
  expect(own.transcript.at(-1)?.text).toBe("Your synthetic refund was approved.");
  expect(model.run).toHaveBeenCalledExactlyOnceWith(expect.any(RunState), expect.objectContaining({ threadId: own.threadId }), own.traceId);
});

it("fails closed for empty/absent requests and does not widen scope with an admin password", async () => {
  vi.stubEnv("ADMIN_PASSWORD", "synthetic-admin");
  expect(buildAdminState().tickets).toEqual([]);
  expect(buildThreadView(foreign.threadId)).toBeUndefined();
  expect((await (await stateGet(request())).json()).metrics.conversations).toBe(0);
  const authorized = new Request("https://demo.example", { headers: { cookie: cookie(own), authorization: `Basic ${btoa("x:synthetic-admin")}` } });
  expect((await threadGet(authorized, params(foreign))).status).toBe(403);
});

it("retains local staff visibility and public mode still checks cross-site writes", async () => {
  const crossSite = new NextRequest("https://demo.example/api/admin/actions", { method: "POST",
    headers: { host: "demo.example", origin: "https://other.example", cookie: cookie(own) } });
  expect(proxy(crossSite).status).toBe(403);
  vi.stubEnv("PUBLIC_DEMO", "false");
  expect(buildAdminState().tickets).toHaveLength(2);
  expect((await threadGet(request(own), params(foreign))).status).toBe(200);
});

it("cannot reset other visitors' records even if public reset was enabled without an operator password", async () => {
  vi.stubEnv("ALLOW_DEMO_RESET", "true");
  expect((await resetPost(request(own, {}))).status).toBe(403);
  expect(buildAdminState(request(foreign)).tickets).toHaveLength(1);
});

it.each(["", "dev-only-session-secret-change-me-in-production"])("fails closed on the public signing default %s", async (configured) => {
  const validRequest = request(own);
  vi.stubEnv("SESSION_SECRET", configured);
  expect((await threadGet(validRequest, params(own))).status).toBe(403);
  expect(buildAdminState(validRequest).tickets).toEqual([]);
  const create = await createThreadPost(new Request("https://demo.example/api/threads", {
    method: "POST", body: JSON.stringify({ customerId: "c-anna" }), headers: { "Content-Type": "application/json" },
  }));
  expect(create.status).toBe(503);
  expect(create.headers.get("set-cookie")).toBeNull();
  expect(() => credentialSetCookie(foreign.threadId, false)).toThrow("SessionSecretRequired");
});
