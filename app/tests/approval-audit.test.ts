import { RunContext, RunState } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildAuditRecord } from "@/lib/admin/audit";
import { listAudit, resetDemoData } from "@/lib/data/store";
import type { RunOutcome } from "@/lib/runtime/run-support";
import type { AgentEvent, ApprovalRequest, SupportContext } from "@/lib/types";

// Only the model call is faked. Pending approvals, RunState restore, audit store, threads and the
// event bus are real, so the console path (decide -> audit -> resume -> push to customer) is exercised.
const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));

const { triageAgent } = await import("@/lib/agents");
const { listPendingApprovals, savePausedRun } = await import("@/lib/runtime/approvals");
const { resolveApproval } = await import("@/lib/runtime/approval-flow");
const { subscribeToThread } = await import("@/lib/runtime/event-bus");
const { getThread, threadFor } = await import("@/lib/runtime/threads");

const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "pl", threadId: "thread-audit-0001" };
const item = {
  rawItem: { callId: "call_audit" },
  name: "create_refund",
  arguments: JSON.stringify({ orderId: "1002", amount: 3200, reason: "too big" }),
  agent: { name: "Orders & Refunds Agent" },
};

let pushed: AgentEvent[];

beforeEach(() => {
  resetDemoData();
  model.run.mockReset();
  model.run.mockResolvedValue({ reply: "Your refund was approved.", approvals: [] } satisfies RunOutcome);
  pushed = [];
  subscribeToThread(ctx.threadId, (event) => pushed.push(event));
  threadFor(ctx);
  savePausedRun(ctx, "trace_audit", new RunState(new RunContext(ctx), "hi", triageAgent, 10), [item as never]);
});

describe("buildAuditRecord (pure)", () => {
  const request: ApprovalRequest = {
    approvalId: "a1", threadId: "t", traceId: "trace_x", toolName: "create_refund", args: {},
    customerId: "c-anna", customerName: "Anna", agent: "A", summary: "Refund 3200 PLN", createdAt: 0,
  };

  it("records who decided, when, what and the trace id", () => {
    const record = buildAuditRecord(request, true, "Marta Nowak", new Date("2026-11-09T12:00:00Z"));
    expect(record).toMatchObject({
      approvalId: "a1", traceId: "trace_x", toolName: "create_refund", summary: "Refund 3200 PLN",
      decision: "approved", decidedBy: "Marta Nowak", decidedAt: "2026-11-09T12:00:00.000Z",
    });
  });

  it("maps a rejection to decision=rejected", () => {
    expect(buildAuditRecord(request, false, "Tomasz Berg").decision).toBe("rejected");
  });
});

describe("resolveApproval (console path)", () => {
  it("writes one audit record with the consultant and trace, then pushes the resumed answer to the customer", async () => {
    expect(listPendingApprovals().map((a) => a.approvalId)).toEqual(["call_audit"]);
    const result = await resolveApproval("call_audit", true, "Marta Nowak");
    expect(result.ok).toBe(true);

    const [record, ...rest] = listAudit();
    expect(rest).toHaveLength(0);
    expect(record).toMatchObject({ approvalId: "call_audit", decision: "approved", decidedBy: "Marta Nowak", traceId: "trace_audit", threadId: ctx.threadId });
    expect(Number.isNaN(Date.parse(record.decidedAt))).toBe(false);

    expect(listPendingApprovals()).toHaveLength(0);
    expect(pushed.find((e) => e.kind === "approval_decision")).toMatchObject({ approved: true, decidedBy: "Marta Nowak" });
    expect(pushed.find((e) => e.kind === "chat_message")).toMatchObject({ role: "agent", text: "Your refund was approved." });
    expect(getThread(ctx.threadId)?.transcript.at(-1)).toMatchObject({ role: "agent", text: "Your refund was approved." });
  });

  it("records a rejection too", async () => {
    await resolveApproval("call_audit", false, "Tomasz Berg");
    expect(listAudit()[0]).toMatchObject({ decision: "rejected", decidedBy: "Tomasz Berg" });
  });

  it("a second decision on the same request is refused and adds no audit record", async () => {
    await resolveApproval("call_audit", true, "Marta Nowak");
    const again = await resolveApproval("call_audit", true, "Marta Nowak");
    expect(again).toMatchObject({ ok: false, errorType: "UnknownApproval" });
    expect(listAudit()).toHaveLength(1);
    expect(model.run).toHaveBeenCalledTimes(1);
  });
});
