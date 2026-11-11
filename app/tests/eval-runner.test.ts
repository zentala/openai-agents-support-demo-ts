/** Eval CLI regression: a missing model proposal is a row failure, and the next scenario still runs. */
import { expect, it, vi } from "vitest";
import { scenarios } from "@/lib/eval/scenarios";

vi.mock("@/lib/runtime/turn", () => ({
  handleUserMessage: vi.fn(async () => ({ reply: "No proposed address", approvals: [] })),
}));

const { runScenario } = await import("../scripts/eval");

it("records a missing address proposal and continues to the next scenario", async () => {
  const address = scenarios.find((s) => s.id === "address-change-confirm")!;
  const failed = await runScenario(address);
  expect(failed.verdict).toBe("FAIL");
  expect(failed.notes).toContain("no address change proposal is pending");
  const next = await runScenario({ ...address, id: "next-scenario", followUps: [], expect: {} });
  expect(next).toMatchObject({ id: "next-scenario", verdict: "PASS", notes: "" });
});
