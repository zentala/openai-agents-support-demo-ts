import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupportContext } from "@/lib/types";

// A paused run needs a real model call to create. We fake only the SDK's RunState.fromString
// (the external boundary) and keep our own approvals code real.
const fake = vi.hoisted(() => {
  const state = { getInterruptions: () => [] as unknown[], approve: vi.fn(), reject: vi.fn() };
  return { state, fromStringWithContext: vi.fn(async () => state) };
});

vi.mock("@openai/agents", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@openai/agents")>();
  return { ...actual, RunState: Object.assign(class {}, { fromStringWithContext: fake.fromStringWithContext }) };
});

const { recordDecision, savePausedRun } = await import("@/lib/runtime/approvals");

const ctx: SupportContext = { customerId: "c-anna", customerName: "Anna Kowalska", language: "pl", threadId: "thread-approvals" };
const item = {
  rawItem: { callId: "call_1" },
  name: "create_refund",
  arguments: JSON.stringify({ orderId: "1002", amount: 3200, reason: "too big" }),
  agent: { name: "Orders & Refunds Agent" },
};

function pause(): void {
  fake.state.getInterruptions = () => [item];
  savePausedRun(ctx, "trace_1", { toString: () => "{}" } as never, [item as never]);
}

describe("recordDecision", () => {
  beforeEach(() => {
    fake.fromStringWithContext.mockClear();
    fake.state.approve.mockClear();
    fake.state.reject.mockClear();
  });

  it("resumes once: a second Approve fired at the same time finds nothing (status unknown)", async () => {
    pause();
    // Both calls start before the first one finishes its await, like a double click.
    const [first, second] = await Promise.all([
      recordDecision("call_1", "c-anna", true),
      recordDecision("call_1", "c-anna", true),
    ]);
    expect(first.status).toBe("ready");
    expect(second.status).toBe("unknown");
    expect(fake.fromStringWithContext).toHaveBeenCalledTimes(1);
    expect(fake.state.approve).toHaveBeenCalledTimes(1);
  });

  it("a later repeat of the same decision is also unknown", async () => {
    pause();
    expect((await recordDecision("call_1", "c-anna", false)).status).toBe("ready");
    expect(fake.state.reject).toHaveBeenCalledTimes(1);
    expect((await recordDecision("call_1", "c-anna", false)).status).toBe("unknown");
  });

  it("another customer cannot decide, and that attempt does not consume the request", async () => {
    pause();
    expect((await recordDecision("call_1", "c-james", true)).status).toBe("unknown");
    expect((await recordDecision("call_1", "c-anna", true)).status).toBe("ready");
  });
});
