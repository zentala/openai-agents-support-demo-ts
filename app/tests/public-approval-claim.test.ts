/** The public approval route keeps the visitor key in request scope through the pushed reply guard. */
import { RunContext, RunState } from "@openai/agents";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/admin/actions/route";
import { resetDemoData } from "@/lib/data/store";
import { emitAgentEvent, readEventLog } from "@/lib/runtime/event-bus";
import { triageAgent } from "@/lib/agents";
import { savePausedRun } from "@/lib/runtime/approvals";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { credentialSetCookie } from "@/lib/security/thread-credential";

const model = vi.hoisted(() => ({ run: vi.fn(), hadRequestKey: false }));
const classifier = vi.hoisted(() => ({ hadRequestKey: false }));
vi.mock("@/lib/runtime/run-support", async () => {
  const { requestApiKey } = await vi.importActual<typeof import("@/lib/security/request-key")>("@/lib/security/request-key");
  return { executeSupportRun: async (...args: unknown[]) => {
    model.hadRequestKey = Boolean(requestApiKey());
    return model.run(...args);
  } };
});
vi.mock("@/lib/runtime/model-access", async () => {
  const { requestApiKey } = await vi.importActual<typeof import("@/lib/security/request-key")>("@/lib/security/request-key");
  return { createRequestRunner: () => ({ run: async () => {
    classifier.hadRequestKey = Boolean(requestApiKey());
    return { finalOutput: { claims: [{ type: "refund", stance: "done", recipient_named: null }] } };
  } }) };
});

const approvalId = "public-approval-claim-1";
let thread: ReturnType<typeof createThread>;

beforeEach(() => {
  vi.stubEnv("PUBLIC_DEMO", "true");
  vi.stubEnv("SESSION_SECRET", "synthetic-public-approval-secret");
  resetDemoData();
  thread = createThread("c-anna");
  model.hadRequestKey = false;
  classifier.hadRequestKey = false;
  model.run.mockReset().mockImplementation(async (_state, ctx) => {
    emitAgentEvent(ctx.threadId, { kind: "tool_output", agent: "Orders & Refunds Agent", tool: "create_refund", result: { status: "REFUND_CREATED" } });
    return { reply: "Your refund was created.", approvals: [] };
  });
  const ctx = sessionContextOf(thread);
  const item = { rawItem: { callId: approvalId }, name: "create_refund", arguments: "{}", agent: { name: "Orders & Refunds Agent" } };
  savePausedRun(ctx, thread.traceId, new RunState(new RunContext(ctx), "paused", triageAgent, 10), [item as never]);
});

afterEach(() => {
  removeThread(thread.threadId);
  resetDemoData();
  vi.unstubAllEnvs();
});

describe("public approval reply action-claim guard", () => {
  it("uses the request key for the resumed run and its pushed action-claim check", async () => {
    const request = new Request("http://localhost/api/admin/actions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-openai-key": "sk-test-h15-public-key",
        cookie: credentialSetCookie(thread.threadId, false).split(";")[0],
      },
      body: JSON.stringify({ type: "decide_approval", consultant: "Marta Nowak", approvalId, approve: true }),
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    expect(model.hadRequestKey).toBe(true);
    expect(classifier.hadRequestKey).toBe(true);
    expect(readEventLog().some(({ event }) => event.kind === "error" && event.errorType === "ActionClaimClassifierError")).toBe(false);
    expect(readEventLog().some(({ event }) => event.kind === "chat_message" && event.text === "Your refund was created.")).toBe(true);
  });
});
