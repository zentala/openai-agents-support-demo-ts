/**
 * Real refund tools enforce owner-only cancellation before payout and preserve paid amounts.
 * These tests check records and remaining limits, not only the model-facing success strings.
 */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it } from "vitest";
import { addRefund, findOrderForCustomer, getCustomer, listRefunds, refundedSoFar, resetDemoData } from "@/lib/data/store";
import { createThread } from "@/lib/runtime/threads";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { cancelRefund } from "@/lib/tools/cancel-refund";
import { createRefund } from "@/lib/tools/refund";
import { unwrapData } from "@/lib/tools/helpers";
import { buildOrderPicker } from "@/lib/tools/order-picker";
import { verifyCustomer } from "@/lib/tools/verify-customer";

const runFor = (customerId: string) => new RunContext(sessionContextOf(createThread(customerId)));
const seed = (status: "pending_payout" | "paid" = "pending_payout", amount = 249) =>
  addRefund({ customerId: "c-anna", orderId: "1001", amount, reason: "chair does not fit", status });
const cancel = async (orderId = "1001", refundId: string | null = null, customerId = "c-anna") =>
  unwrapData(await cancelRefund.invoke(runFor(customerId), JSON.stringify({ orderId, refundId })));
const create = (orderId = "1001", amount = 249) => createRefund.invoke(runFor("c-anna"),
  JSON.stringify({ orderId, amount, reason: "chair does not fit" }));

beforeEach(() => resetDemoData());

describe("cancel_refund lifecycle", () => {
  it("cancels a real created refund, releases the limit and enables returning the order again", async () => {
    expect(unwrapData(await create())).toMatchObject({ status: "REFUND_CREATED", refundStatus: "pending_payout" });
    const record = listRefunds()[0];
    const order = findOrderForCustomer("c-anna", "1001")!;
    expect(refundedSoFar(order.id)).toBe(249);
    expect(buildOrderPicker([order], "refund").orders[0].eligible).toBe(false);
    expect(await cancel()).toMatchObject({ status: "REFUND_CANCELLED", refundId: record.id });
    expect(record.status).toBe("cancelled");
    expect(record.cancelledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(refundedSoFar(order.id)).toBe(0);
    expect(buildOrderPicker([order], "refund").orders[0].eligible).toBe(true);
    expect(unwrapData(await create())).toMatchObject({ status: "REFUND_CREATED" });
    expect(listRefunds()).toHaveLength(2);
    expect(refundedSoFar(order.id)).toBe(249);
  });

  it("repeated cancellation is explicit and does not mutate the cancelled record again", async () => {
    const refund = seed();
    await cancel("1001", refund.id);
    const snapshot = { ...refund };
    expect(await cancel("1001", refund.id)).toMatchObject({ status: "REFUND_ALREADY_CANCELLED" });
    expect(await cancel()).toMatchObject({ status: "REFUND_ALREADY_CANCELLED" });
    expect(refund).toEqual(snapshot);
    expect(refundedSoFar("1001")).toBe(0);
    expect(listRefunds()).toHaveLength(1);
  });

  it("never reverses a paid refund, with or without the refund ID", async () => {
    const refund = seed("paid");
    const snapshot = { ...refund };
    for (const refundId of [null, refund.id]) {
      expect(await cancel("1001", refundId)).toMatchObject({ status: "REFUSED", code: "REFUND_ALREADY_PAID",
        instruction: expect.stringContaining("offer escalation") });
    }
    expect(refund).toEqual(snapshot);
    expect(refundedSoFar("1001")).toBe(249);
    expect(unwrapData(await create())).toMatchObject({ code: "AMOUNT_EXCEEDS_ORDER" });
  });

  it("counts pending and paid amounts but excludes cancelled amounts", async () => {
    seed("paid", 50);
    const cancelled = seed("pending_payout", 60);
    seed("pending_payout", 70);
    await cancel("1001", cancelled.id);
    expect(refundedSoFar("1001")).toBe(120);
    expect(unwrapData(await create("1001", 130))).toMatchObject({ code: "AMOUNT_EXCEEDS_ORDER" });
    expect(unwrapData(await create("1001", 129))).toMatchObject({ status: "REFUND_CREATED" });
  });

  it("refuses unknown stored states instead of assuming they are cancellable", async () => {
    const refund = seed();
    Reflect.set(refund, "status", "unknown");
    expect(await cancel()).toMatchObject({ code: "REFUND_NOT_CANCELLABLE" });
    expect(refund.status).toBe("unknown");
    expect(refundedSoFar("1001")).toBe(249);
  });
});

describe("cancellation ownership and ambiguity", () => {
  it("a retry without an ID never advances to the remaining pending refund", async () => {
    const first = seed("pending_payout", 50);
    const second = seed("pending_payout", 60);
    await cancel("1001", first.id);
    const snapshot = listRefunds().map((refund) => ({ ...refund }));
    expect(await cancel()).toMatchObject({ status: "REFUND_SELECTION_REQUIRED", refunds: [
      { refundId: first.id, status: "cancelled" }, { refundId: second.id, status: "pending_payout" },
    ] });
    expect(listRefunds()).toEqual(snapshot);
    expect(refundedSoFar("1001")).toBe(60);
  });

  it("a retry after cancellation and creation of another refund never cancels the new one", async () => {
    await create("1001", 50);
    const first = listRefunds()[0];
    await cancel("1001", first.id);
    await create("1001", 60);
    const snapshot = listRefunds().map((refund) => ({ ...refund }));
    expect(await cancel()).toMatchObject({ status: "REFUND_SELECTION_REQUIRED" });
    expect(listRefunds()).toEqual(snapshot);
    expect(listRefunds().map((refund) => refund.status)).toEqual(["cancelled", "pending_payout"]);
    expect(refundedSoFar("1001")).toBe(60);
    expect(await cancel("1001", first.id)).toMatchObject({ status: "REFUND_ALREADY_CANCELLED" });
    expect(refundedSoFar("1001")).toBe(60);
  });

  it("a paid historical record also prevents a no-ID request choosing the pending one", async () => {
    const paid = seed("paid", 50);
    const pending = seed("pending_payout", 60);
    expect(await cancel()).toMatchObject({ status: "REFUND_SELECTION_REQUIRED" });
    expect(paid.status).toBe("paid");
    expect(pending.status).toBe("pending_payout");
    expect(refundedSoFar("1001")).toBe(110);
  });

  it("the same guest run can cancel its owner's refund only after real verification", async () => {
    const refund = seed();
    const thread = createThread("guest");
    const ctx = sessionContextOf(thread);
    const run = new RunContext(ctx);
    const args = JSON.stringify({ orderId: "1001", refundId: refund.id });
    expect(await cancelRefund.invoke(run, args)).toContain("NOT_VERIFIED");
    expect(refund.status).toBe("pending_payout");
    expect(await verifyCustomer.invoke(run, JSON.stringify({ orderId: "1001", email: getCustomer("c-anna")!.email, postalCode: null }))).toContain("VERIFIED");
    expect(ctx.customerId).toBe("c-anna");
    expect(thread.customerId).toBe("c-anna");
    expect(unwrapData(await cancelRefund.invoke(run, args))).toMatchObject({ status: "REFUND_CANCELLED", refundId: refund.id });
    expect(refundedSoFar("1001")).toBe(0);
  });

  it("refuses a guest without exposing refund information", async () => {
    const refund = seed();
    expect(await cancel("1001", refund.id, "guest")).toMatchObject({ error: "NOT_VERIFIED" });
    expect(refund.status).toBe("pending_payout");
  });

  it("foreign and nonexistent orders have the same refusal", async () => {
    const refund = seed();
    expect(await cancel("1001", refund.id, "c-james")).toEqual(await cancel("missing", refund.id, "c-james"));
    expect(refund.status).toBe("pending_payout");
  });

  it("checks the refund owner independently of the order owner", async () => {
    const refund = seed();
    refund.customerId = "c-james";
    expect(await cancel("1001", refund.id)).toEqual(await cancel("1001", "missing"));
    expect(refund.status).toBe("pending_payout");
  });

  it("a refund for another order cannot be cancelled through a valid owned order", async () => {
    const refund = seed();
    expect(await cancel("1002", refund.id)).toMatchObject({ code: "REFUND_NOT_FOUND" });
    expect(refund.status).toBe("pending_payout");
  });

  it("does not guess between multiple pending refunds", async () => {
    const first = seed("pending_payout", 50);
    const second = seed("pending_payout", 60);
    expect(await cancel()).toMatchObject({ status: "REFUND_SELECTION_REQUIRED", refunds: [
      { refundId: first.id, amount: 50 }, { refundId: second.id, amount: 60 },
    ] });
    expect(refundedSoFar("1001")).toBe(110);
    expect(await cancel("1001", second.id)).toMatchObject({ status: "REFUND_CANCELLED", refundId: second.id });
    expect(first.status).toBe("pending_payout");
    expect(refundedSoFar("1001")).toBe(50);
  });

  it("uses canonical order IDs for both creation and cancellation", async () => {
    await create("#1001");
    expect(listRefunds()[0].orderId).toBe("1001");
    expect(refundedSoFar("1001")).toBe(249);
    expect(await cancel(" #1001 ")).toMatchObject({ status: "REFUND_CANCELLED", orderId: "1001" });
    expect(refundedSoFar("1001")).toBe(0);
  });
});
