/**
 * Agents SDK: read-only order tools (`get_order`, `list_my_orders`).
 *
 * Concept: `tool({ name, description, parameters (zod), execute })`. The zod
 * schema becomes the JSON schema the model sees AND validates the arguments the
 * model sends, so malformed calls are rejected before `execute` runs.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { CURRENCY } from "@/lib/config";
import { findOrderForCustomer, listOrdersForCustomer, orderTotal, type Order } from "@/lib/data/store";
import type { SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

/** Only fields the agent needs; no internal ids. */
const present = (order: Order) => ({
  orderId: order.id,
  status: order.status,
  deliveredDaysAgo: order.deliveredDaysAgo,
  items: order.items,
  total: orderTotal(order),
  currency: CURRENCY,
  // Free text from a carrier or staff: untrusted. It reaches the model inside the DATA delimiters.
  note: order.note,
});

export const getOrder = tool<z.ZodObject<{ orderId: z.ZodString }>, SupportContext>({
  name: "get_order",
  description: "Look up ONE order of the current customer by its order number.",
  parameters: z.object({ orderId: z.string().describe("Order number, e.g. 1001") }),
  errorFunction: toolErrorHandler("get_order"),
  execute: async ({ orderId }, runContext) => {
    // SECURITY: customerId comes from the session, never from model arguments, so a
    // jailbroken model cannot read another customer's order.
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    const { customerId } = session;
    const order = findOrderForCustomer(customerId, orderId);
    // SECURITY: "not yours" and "does not exist" look identical (no order-id probing).
    if (!order) return asData("get_order", { error: "ORDER_NOT_FOUND", orderId });
    return asData("get_order", present(order));
  },
});

export const listMyOrders = tool<z.ZodObject<Record<string, never>>, SupportContext>({
  name: "list_my_orders",
  description: "List all orders of the current customer.",
  parameters: z.object({}),
  errorFunction: toolErrorHandler("list_my_orders"),
  execute: async (_input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    const { customerId } = session;
    return asData("list_my_orders", listOrdersForCustomer(customerId).map(present));
  },
});
