/** Offline eval control flow: per-turn approval decisions, fixtures and a failed row do not bypass or stop later turns. */
import { afterEach, expect, it, vi } from "vitest";
import { scenarios } from "@/lib/eval/scenarios";
import { listRefunds, refundedSoFar } from "@/lib/data/store";
import { getThread } from "@/lib/runtime/threads";
import { handleUserMessage } from "@/lib/runtime/turn";
import { resolveApproval } from "@/lib/runtime/approval-flow";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { RunOutcome } from "@/lib/runtime/run-support";
import type { ApprovalRequest } from "@/lib/types";

vi.mock("@/lib/runtime/turn", () => ({
  handleUserMessage: vi.fn(async () => ({ reply: "No proposed address", approvals: [] })),
}));
vi.mock("@/lib/runtime/approval-flow", () => ({ resolveApproval: vi.fn() }));
afterEach(() => { vi.clearAllMocks(); vi.mocked(handleUserMessage).mockImplementation(async () => ({ reply: "No proposed address", approvals: [] })); });

const { runScenario } = await import("../scripts/eval");

it("applies a staff-note fixture through hand-back before the mocked offline turn", async () => {
  const scenario = scenarios.find((item) => item.id === "staff-handback-context")!;
  expect((await runScenario({ ...scenario, expect: {} })).verdict).toBe("PASS");
  const ctx = vi.mocked(handleUserMessage).mock.calls.at(-1)![0];
  expect(ctx.staffInstruction?.text).toBe(scenario.staffNote);
  expect(getThread(ctx.threadId)?.takeover.status).toBe("agent");
});

it("preserves a paid refund fixture through scenario parsing and runner setup, without model calls", async () => {
  const paid = scenarios.find((scenario) => scenario.id === "refund-cancel-paid-refused")!;
  const row = await runScenario({ ...paid, expect: {} });
  expect(row.verdict).toBe("PASS");
  expect(listRefunds()).toMatchObject([{ orderId: "1005", amount: 180, status: "paid" }]);
  expect(refundedSoFar("1005")).toBe(180);
});

it("records a missing address proposal and continues to the next scenario", async () => {
  const address = scenarios.find((s) => s.id === "address-change-confirm")!;
  const failed = await runScenario(address);
  expect(failed.verdict).toBe("FAIL");
  expect(failed.notes).toContain("no address change proposal is pending");
  const next = await runScenario({ ...address, id: "next-scenario", followUps: [], expect: {} });
  expect(next).toMatchObject({ id: "next-scenario", verdict: "PASS", notes: "" });
});

it.each([["refund-over-threshold", true], ["damage-refund-human", true], ["damage-refund-human", false]] as const)("resumes %s at its actual approval turn (approve=%s) before the next customer turn", async (id, approve) => {
  const scenario = scenarios.find((entry) => entry.id === id)!;
  const pauseAt = id === "damage-refund-human" ? 2 : 0;
  const order: string[] = [];
  let threadId = "";
  let turn = 0;
  const decision = approve ? "approve" : "reject";
  const request: ApprovalRequest = { approvalId: "turn-approval", threadId, traceId: "trace_offline", toolName: "create_refund", args: {}, customerId: scenario.customerId, customerName: "Fixture customer", agent: "Orders", summary: "Refund", createdAt: 0 };
  vi.mocked(handleUserMessage).mockImplementation(async (ctx) => {
    threadId = ctx.threadId;
    request.threadId = threadId;
    const index = turn++;
    order.push(`say:${index}`);
    if (index > pauseAt) expect(order).toContain(decision);
    return { reply: index === pauseAt ? "Waiting for approval" : "Answer", approvals: index === pauseAt ? [request] : [] } as RunOutcome;
  });
  vi.mocked(resolveApproval).mockImplementation(async () => {
    order.push(decision);
    emitAgentEvent(threadId, { kind: "tool_output", agent: "Orders", tool: "create_refund", result: { status: approve ? "REFUND_CREATED" : "REFUND_REJECTED" } });
    return { ok: true, request, outcome: { reply: approve ? "Refund created" : "Refund declined", approvals: [] } };
  });
  // Limit this offline mock to runner sequencing; the source fixture retains its full business checks.
  const row = await runScenario({ ...scenario, expect: { resumeApproved: approve, resumeRejected: !approve, refundCreated: approve, refundsCreated: approve ? 1 : 0 } });
  expect(row).toMatchObject({ verdict: "PASS", notes: "" });
  expect(resolveApproval).toHaveBeenCalledExactlyOnceWith("turn-approval", approve, "eval-script");
  expect(order.indexOf(decision)).toBe(order.indexOf(`say:${pauseAt}`) + 1);
});
