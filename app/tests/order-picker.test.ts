import { describe, expect, it } from "vitest";
import { evaluate } from "@/lib/eval/checks";
import { listOrdersForCustomer } from "@/lib/data/store";
import { buildOrderPicker } from "@/lib/tools/order-picker";
import type { AgentEvent } from "@/lib/types";

describe("order picker widget data part", () => {
  const anna = listOrdersForCustomer("c-anna");

  it("has the shape the browser renders: one choice per order, with id, summary, status and total", () => {
    const widget = buildOrderPicker(anna, "refund");
    expect(widget.type).toBe("order-picker");
    expect(widget.orders.map((o) => o.orderId)).toEqual(anna.map((o) => o.id));
    expect(widget.orders[0]).toMatchObject({ orderId: "1001", total: 249, currency: "PLN", eligible: true });
    expect(widget.orders[0].summary).toContain("Oslo dining chair");
  });

  it("marks an order outside the return window as not eligible and says why", () => {
    const expired = buildOrderPicker(anna, "refund").orders.find((o) => o.orderId === "1003")!;
    expect(expired.eligible).toBe(false);
    expect(expired.note).toContain("return window");
  });

  it("for a status question every order is selectable and has no refusal note", () => {
    const widget = buildOrderPicker(anna, "status");
    expect(widget.orders.every((o) => o.eligible && !o.note)).toBe(true);
  });

  it("only contains the orders it was given (no other customer's data)", () => {
    expect(JSON.stringify(buildOrderPicker(anna, "refund"))).not.toContain("Aalborg");
  });

  it("eval checks: widgetShown and contextChanged read the events", () => {
    const events = [
      { id: "1", ts: 0, kind: "widget", widget: buildOrderPicker(anna, "refund") },
      { id: "2", ts: 0, kind: "context_update", changes: { activeOrderId: { from: null, to: "1001" } } },
    ] as AgentEvent[];
    expect(evaluate({ widgetShown: true, contextChanged: ["activeOrderId"] }, { reply: "", events })).toEqual([]);
    expect(evaluate({ widgetShown: true, contextChanged: ["handoffReason"] }, { reply: "", events })).toHaveLength(1);
    expect(evaluate({ widgetShown: true }, { reply: "", events: [] })).toHaveLength(1);
  });
});
