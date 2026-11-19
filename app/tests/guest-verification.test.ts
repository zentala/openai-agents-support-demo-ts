/** Guest identity, cross-conversation throttling and tool access regression tests. */
import { RunContext } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as comparison from "@/lib/security/constant-time";
import { customers, listRefunds, orders, resetDemoData } from "@/lib/data/store";
import { MAX_VERIFICATION_ATTEMPTS, proofMatches, verifyGuest } from "@/lib/guest/verification";
import { ATTEMPT_WINDOW_MS, MAX_ATTEMPTS_PER_ORDER, clearOrderAttempts } from "@/lib/guest/order-attempts";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, threadFor } from "@/lib/runtime/threads";
import { getOrder, listMyOrders } from "@/lib/tools/orders";
import { showOrderPicker } from "@/lib/tools/order-picker";
import { createRefund } from "@/lib/tools/refund";
import { verifyCustomer } from "@/lib/tools/verify-customer";
import { buildInstructions, TRIAGE_ROLE } from "@/lib/agents/prompts";
import type { AgentEvent, SupportContext } from "@/lib/types";

const james = customers.find((c) => c.id === "c-james")!;
const order1004 = orders.find((o) => o.id === "1004")!;

/** A fresh guest conversation, created the way POST /api/threads does it. */
function guestSession(): { ctx: SupportContext; events: AgentEvent[] } {
  const thread = createThread("guest");
  const events: AgentEvent[] = [];
  subscribeToThread(thread.threadId, (e) => events.push(e));
  return { ctx: sessionContextOf(thread), events };
}

const verify = (ctx: SupportContext, orderId: string, proof: string) =>
  verifyCustomer.invoke(new RunContext(ctx), JSON.stringify({ orderId, email: proof, postalCode: null }));

beforeEach(() => {
  resetDemoData();
  clearEventLog();
  clearOrderAttempts();
});

describe("proofMatches (pure)", () => {
  it.each(["1004", "9999"])("runs both proof comparisons even when order %s is unknown", (orderId) => {
    const equal = vi.spyOn(comparison, "constantTimeEqual");
    try {
      const result = verifyGuest(createThread("guest"), orderId, "wrong@example.com", "wrong");
      expect(result.status).toBe("VERIFICATION_FAILED");
      expect(equal).toHaveBeenCalledTimes(2);
      expect(equal).toHaveBeenNthCalledWith(1, "wrong@example.com", orderId === "1004" ? james.email : "-");
      expect(equal).toHaveBeenNthCalledWith(2, "WRONG", orderId === "1004" ? "SW1A1AA" : "-");
    } finally {
      equal.mockRestore();
    }
  });

  it("requires e-mail, with an optional additional postal-code check", () => {
    expect(proofMatches(order1004, james, "James.Carter@Example.com ")).toBe(true);
    expect(proofMatches(order1004, james, "sw1a1aa")).toBe(false);
    expect(proofMatches(order1004, james, "SW1A 1AA")).toBe(false);
    expect(proofMatches(order1004, james, james.email, "sw1a1aa")).toBe(true);
    expect(proofMatches(order1004, james, james.email, "wrong")).toBe(false);
  });

  it("refuses a wrong proof, an empty proof and a missing order", () => {
    expect(proofMatches(order1004, james, "other@example.com")).toBe(false);
    expect(proofMatches(order1004, james, "")).toBe(false);
    expect(proofMatches(undefined, undefined, "james.carter@example.com")).toBe(false);
  });
});

describe("verifyGuest: attempts are limited per thread", () => {
  it("success binds the thread to the order's customer", () => {
    const thread = createThread("guest");
    const result = verifyGuest(thread, "#1004", "james.carter@example.com");
    expect(result.status).toBe("VERIFIED");
    expect(thread.customerId).toBe("c-james");
    expect(sessionContextOf(thread)).toMatchObject({ customerId: "c-james", customerName: "James Carter", language: "en" });
  });

  it("counts failures, then LOCKS - and a locked thread refuses even the right answer", () => {
    const thread = createThread("guest");
    const lefts = Array.from({ length: MAX_VERIFICATION_ATTEMPTS }, () => verifyGuest(thread, "1004", "wrong@example.com"));
    expect(lefts.map((r) => r.status === "VERIFICATION_FAILED" && r.attemptsLeft)).toEqual([2, 1, 0]);
    expect(verifyGuest(thread, "1004", "james.carter@example.com")).toEqual({ status: "LOCKED" });
    expect(thread.customerId).toBe("guest");
  });

  it("a failure looks the same whether the order exists or not (nothing to probe)", () => {
    const a = verifyGuest(createThread("guest"), "1004", "wrong@example.com");
    const b = verifyGuest(createThread("guest"), "9999", "james.carter@example.com");
    expect(a).toEqual(b);
  });

  it("a logged-in customer cannot re-verify as someone else", () => {
    expect(verifyGuest(createThread("c-anna"), "1004", "james.carter@example.com")).toEqual({ status: "ALREADY_VERIFIED" });
  });
});

describe("a guest sees no order data until verification succeeds", () => {
  it("get_order, list_my_orders, show_order_picker and create_refund all answer NOT_VERIFIED", async () => {
    const { ctx, events } = guestSession();
    const run = new RunContext(ctx);
    expect(await getOrder.invoke(run, JSON.stringify({ orderId: "1004" }))).toContain("NOT_VERIFIED");
    expect(await listMyOrders.invoke(run, "{}")).toContain("NOT_VERIFIED");
    expect(await showOrderPicker.invoke(run, JSON.stringify({ purpose: "status" }))).toContain("NOT_VERIFIED");
    expect(await createRefund.invoke(run, JSON.stringify({ orderId: "1005", amount: 10, reason: "x" }))).toContain("NOT_VERIFIED");
    expect(listRefunds()).toHaveLength(0);
    expect(events.some((e) => e.kind === "widget")).toBe(false);
  });

  it("verify_customer succeeds, and the SAME run context then reads the customer's order", async () => {
    const { ctx, events } = guestSession();
    const out = await verify(ctx, "1004", "james.carter@example.com");
    expect(out).toContain("VERIFIED");
    expect(ctx).toMatchObject({ customerId: "c-james", customerName: "James Carter" });
    expect(await getOrder.invoke(new RunContext(ctx), JSON.stringify({ orderId: "1004" }))).toContain("Oak coffee table");
    expect(events.find((e) => e.kind === "verification")).toMatchObject({ outcome: "verified", customerId: "c-james" });
  });

  it("verified as James, the thread still cannot read Anna's order", async () => {
    const { ctx } = guestSession();
    await verify(ctx, "1004", james.email);
    expect(await getOrder.invoke(new RunContext(ctx), JSON.stringify({ orderId: "1001" }))).toContain("ORDER_NOT_FOUND");
  });

  it("failures never say which part was wrong; the third failure shows 0 attempts left; then LOCKED", async () => {
    const { ctx, events } = guestSession();
    const wrongProof = await verify(ctx, "1004", "wrong@example.com");
    const { ctx: other } = guestSession();
    const noOrder = await verify(other, "9999", "james.carter@example.com");
    expect(wrongProof).toBe(noOrder);
    expect(wrongProof).toContain("VERIFICATION_FAILED");
    expect(wrongProof).not.toMatch(/e-mail (is|was) wrong|postal code (is|was) wrong|order (does not|doesn't) exist/i);

    await verify(ctx, "1004", "wrong2@example.com");
    await verify(ctx, "1004", "wrong3@example.com");
    const locked = await verify(ctx, "1004", "james.carter@example.com");
    expect(locked).toContain("LOCKED");
    expect(ctx.customerId).toBe("guest");
    expect(await getOrder.invoke(new RunContext(ctx), JSON.stringify({ orderId: "1004" }))).toContain("NOT_VERIFIED");
    expect(events.filter((e) => e.kind === "verification").map((e) => e.kind === "verification" && e.outcome)).toEqual(["failed", "failed", "failed", "locked"]);
  });
});

describe("session wiring", () => {
  it("the prompt tells the model a guest is not verified, and a customer's name once logged in", () => {
    const guest = guestSession().ctx;
    expect(buildInstructions(TRIAGE_ROLE, guest)).toContain("NOT logged in and NOT verified");
    expect(buildInstructions(TRIAGE_ROLE, { ...guest, customerId: "c-james", customerName: "James Carter", language: "en" })).toContain("Customer: James Carter");
  });

  it("a rebuilt context after verification matches the thread, so later requests are not refused as another customer", async () => {
    const thread = createThread("guest");
    verifyGuest(thread, "1004", "james.carter@example.com");
    expect(threadFor(sessionContextOf(thread))).toBe(thread);
  });
});


describe("per-order limit across fresh conversations", () => {
  it.each(["1004", "9999"])("locks known and unknown order %s equally and expires after one hour", (id) => {
    const now = 1_000_000;
    for (let i = 0; i < MAX_ATTEMPTS_PER_ORDER; i++) {
      expect(verifyGuest(createThread("guest"), `#${id}`, "wrong@example.com", null, now).status).toBe("VERIFICATION_FAILED");
    }
    expect(verifyGuest(createThread("guest"), id, james.email, null, now + 1).status).toBe("LOCKED");
    const expired = verifyGuest(createThread("guest"), id, james.email, null, now + ATTEMPT_WINDOW_MS);
    expect(expired.status).toBe(id === "1004" ? "VERIFIED" : "VERIFICATION_FAILED");
  });

  it("postal code alone cannot verify through the actual tool", async () => {
    const { ctx } = guestSession();
    expect(await verify(ctx, "1004", "SW1A 1AA")).toContain("VERIFICATION_FAILED");
    expect(ctx.customerId).toBe("guest");
  });
});
