/** Public credential boundaries use real classifiers, paused-state serialization and observable log writes. */
import { RunContext, RunState } from "@openai/agents";
import { Console } from "node:console";
import { Writable } from "node:stream";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { triageAgent } from "@/lib/agents";
import { jailbreakGuardrail, relevanceGuardrail } from "@/lib/guardrails/input-guardrails";
import { describeError } from "@/lib/runtime/errors";
import { resolveApproval } from "@/lib/runtime/approval-flow";
import { getPendingApproval, savePausedRun } from "@/lib/runtime/approvals";
import { pendingRuns } from "@/lib/runtime/pending-runs";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { openTicket } from "@/lib/runtime/tickets";
import { withRequestKey } from "@/lib/security/request-key";
import type { SupportContext } from "@/lib/types";

const marker = "sk-proj-" + "synthetic-boundary-".repeat(3);
const req = (key?: string) => new Request("https://demo.example", { headers: key ? { "x-openai-key": key } : {} });
const owned: string[] = [];
function context(): SupportContext {
  const thread = createThread("c-anna");
  owned.push(thread.threadId);
  return { customerId: "c-anna", customerName: "Anna", threadId: thread.threadId, language: "en" };
}
function pause(ctx: SupportContext, input = "hello") {
  const callId = crypto.randomUUID();
  const item = { rawItem: { callId }, name: "create_refund", agent: { name: "Orders" },
    arguments: JSON.stringify({ orderId: "1002", amount: 600, reason: input }) };
  savePausedRun(ctx, "trace_boundary", new RunState(new RunContext(ctx), input, triageAgent, 10), [item as never]);
  return callId;
}
beforeEach(() => vi.stubEnv("PUBLIC_DEMO", "true"));
afterEach(() => { owned.splice(0).forEach(removeThread); vi.unstubAllEnvs(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

it.each([jailbreakGuardrail, relevanceGuardrail])("classifier $name refuses without a visitor key before HTTP", async (guardrail) => {
  const http = vi.fn();
  vi.stubGlobal("fetch", http);
  const ctx = context();
  await expect(withRequestKey(req(), () => guardrail.execute({ input: "hello", agent: triageAgent,
    context: new RunContext(ctx) }))).rejects.toThrow("Add your OpenAI key");
  expect(http).not.toHaveBeenCalled();
});

it("missing approval-resume key refuses repeatedly without consuming its pending decision", async () => {
  const id = pause(context());
  for (let i = 0; i < 2; i++) {
    const result = await withRequestKey(req(), () => resolveApproval(id, true, "Marta Nowak"));
    expect(result).toMatchObject({ ok: false, errorType: "VisitorKeyRequired" });
    expect(getPendingApproval(id)?.approvalId).toBe(id);
    expect(pendingRuns.get(id)?.decisions.size).toBe(0);
  }
});

it("keeps request secrets out of stored tickets, approval arguments, context and serialized RunState", () => {
  withRequestKey(req(marker), () => {
    const ctx = context();
    const ticket = openTicket({ ...ctx, traceId: "trace_boundary", summary: marker, source: "rule", reason: marker }).ticket;
    const id = pause(ctx, marker);
    const stored = pendingRuns.get(id);
    expect(stored).toBeDefined();
    expect(JSON.stringify([ticket, stored?.ctx, stored?.requests, stored?.stateJson]).includes(marker)).toBe(false);
    expect(stored?.stateJson).toContain("[key removed]");
  });
});

it("writes a non-empty redacted error through Node's real console logging implementation", () => {
  const output: string[] = [];
  // This Console actually formats and writes bytes. An unused mock cannot make the assertion pass.
  const sink = new Writable({ write(chunk, _encoding, done) { output.push(String(chunk)); done(); } });
  const logger = new Console({ stdout: sink, stderr: sink });
  withRequestKey(req(marker), () => logger.error(describeError(new Error(`Provider failure ${marker}`))));
  expect(output.length).toBeGreaterThan(0);
  expect(output.join("")).toContain("Provider failure");
  expect(output.join("").includes(marker)).toBe(false);
});
