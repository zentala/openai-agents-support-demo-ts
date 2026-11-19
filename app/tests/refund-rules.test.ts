import { describe, expect, it } from "vitest";
import { findOrderForCustomer, orderTotal } from "@/lib/data/store";
import { checkRefund, deliveryDisputeRefusal, isDeliveryDisputeReason, needsHumanApproval } from "@/lib/tools/refund-rules";

const refund = (customerId: string, orderId: string, amount: number, alreadyRefunded = 0) =>
  checkRefund({ customerId, order: findOrderForCustomer(customerId, orderId), amount, alreadyRefunded });

describe("ownership", () => {
  it("returns the order for its owner, with or without #", () => {
    expect(findOrderForCustomer("c-anna", "#1001")?.id).toBe("1001");
  });

  it("returns undefined for another customer's order (same as not existing)", () => {
    expect(findOrderForCustomer("c-anna", "2002")).toBeUndefined();
    expect(findOrderForCustomer("c-anna", "9999")).toBeUndefined();
  });
});

describe("checkRefund", () => {
  it("allows a refund inside the window up to the order value", () => {
    expect(refund("c-anna", "1001", 249).ok).toBe(true);
  });

  it("refuses another customer's order as not found", () => {
    const result = checkRefund({ customerId: "c-anna", order: findOrderForCustomer("c-lena", "2002"), amount: 10, alreadyRefunded: 0 });
    expect(result).toMatchObject({ ok: false, code: "ORDER_NOT_FOUND" });
  });

  it("refuses an order delivered 60 days ago and names the policy", () => {
    expect(refund("c-anna", "1003", 100)).toMatchObject({ ok: false, code: "WINDOW_EXPIRED", policy: "returns-policy" });
  });

  it("refuses an order that is still in transit", () => {
    expect(refund("c-james", "1004", 100)).toMatchObject({ ok: false, code: "NOT_DELIVERED" });
  });

  it("refuses more than the order value and counts earlier refunds", () => {
    expect(refund("c-anna", "1001", 250)).toMatchObject({ ok: false, code: "AMOUNT_EXCEEDS_ORDER" });
    expect(refund("c-anna", "1001", 100, 200)).toMatchObject({ ok: false, code: "AMOUNT_EXCEEDS_ORDER" });
  });

  it("refuses zero, negative and NaN amounts", () => {
    for (const amount of [0, -5, Number.NaN]) expect(refund("c-anna", "1001", amount)).toMatchObject({ code: "INVALID_AMOUNT" });
  });
});

describe("approval threshold", () => {
  it("requires approval only above the threshold", () => {
    expect(needsHumanApproval(500, 500)).toBe(false);
    expect(needsHumanApproval(500.01, 500)).toBe(true);
    expect(orderTotal(findOrderForCustomer("c-anna", "1002")!)).toBe(3200);
  });
});

describe("delivery dispute classification", () => {
  it.each([
    "The order was delivered but I never received it.",
    "Nie otrzymałem przesyłki, mimo że jest oznaczona jako dostarczona.",
    "Die Lieferung ist als zugestellt markiert, aber ich habe sie nicht erhalten.",
  ])("recognizes a customer who disputes delivery: %s", (reason) => expect(isDeliveryDisputeReason(reason)).toBe(true));

  it("does not classify an ordinary return reason as a dispute", () => expect(isDeliveryDisputeReason("The chair does not fit")).toBe(false));
  it("returns a refusal without a refund outcome", () => expect(deliveryDisputeRefusal()).toMatchObject({ ok: false, code: "DELIVERY_DISPUTE_NEEDS_HUMAN" }));
});
