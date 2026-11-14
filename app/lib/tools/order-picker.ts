/**
 * Order picker widget: builds the card data and the tool that shows it.
 *
 * Concept: a tool can have a UI side effect. `show_order_picker` does not return the order
 * list for the model to retell; it publishes a *widget* event. The chat route turns that event
 * into a `data-widget` stream part, the browser draws clickable buttons, and a click comes back
 * as a structured selection (see lib/runtime/selection.ts). Our counterpart of the OpenAI demo's seat map.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { CURRENCY } from "@/lib/config";
import { listOrdersForCustomer, orderTotal, refundedSoFar, type Order } from "@/lib/data/store";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { OrderChoice, OrderPickerWidget, SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { checkRefund } from "./refund-rules";
import { toolErrorHandler } from "./tool-error";

const PICKER_PROMPT: Record<"refund" | "status", string> = {
  refund: "Which order would you like to return?",
  status: "Which order do you want to check?",
};

function toChoice(order: Order, purpose: "refund" | "status"): OrderChoice {
  const check = checkRefund({
    customerId: order.customerId,
    order,
    amount: orderTotal(order),
    alreadyRefunded: refundedSoFar(order.id),
  });
  // For a status question every order is selectable; for a return only those the rules would allow.
  const eligible = purpose === "status" || check.ok;
  return {
    orderId: order.id,
    summary: order.items.map((item) => `${item.qty} x ${item.name}`).join(", "),
    productNames: order.items.map((item) => item.name),
    status: order.status === "delivered" ? `delivered ${order.deliveredDaysAgo} days ago` : "in transit",
    total: orderTotal(order),
    currency: CURRENCY,
    eligible,
    note: purpose === "refund" && !check.ok ? check.message : undefined,
  };
}

/** Pure: the widget payload for a customer's orders. Tested without any model. */
export function buildOrderPicker(orders: Order[], purpose: "refund" | "status"): OrderPickerWidget {
  return { type: "order-picker", prompt: PICKER_PROMPT[purpose], orders: orders.map((order) => toChoice(order, purpose)) };
}

export const showOrderPicker = tool<z.ZodObject<{ purpose: z.ZodEnum<{ refund: "refund"; status: "status" }> }>, SupportContext>({
  name: "show_order_picker",
  description:
    "Show the customer a clickable list of THEIR orders in the chat. Use it when the customer wants a return, " +
    "refund or status but did not say which order. Do not retell the list in text.",
  parameters: z.object({ purpose: z.enum(["refund", "status"]).describe("Why the customer must choose an order") }),
  errorFunction: toolErrorHandler("show_order_picker"),
  execute: async ({ purpose }, runContext) => {
    // SECURITY: the list is built from the session's customer id, not from model arguments.
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    const widget = buildOrderPicker(listOrdersForCustomer(session.customerId), purpose);
    emitAgentEvent(session.threadId, { kind: "widget", widget });
    return asData("show_order_picker", {
      shown: true,
      orders: widget.orders.length,
      instruction: "The customer sees the order buttons now. Write one short sentence asking them to pick an order, then stop.",
    });
  },
});
