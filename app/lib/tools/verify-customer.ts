/**
 * Agents SDK: `verify_customer`, the only way a guest becomes a customer.
 *
 * The model passes the order number and required e-mail, optionally a postal code. The decision is made
 * by lib/guest/verification.ts. On success this tool also updates the live run context
 * (`customerId`, `customerName`, `language`), so the very next tool call in the same run, e.g. `get_order`,
 * already sees the verified customer. SECURITY: a failure never says which part was wrong.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { verifyGuest } from "@/lib/guest/verification";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { getThread } from "@/lib/runtime/threads";
import type { SupportContext } from "@/lib/types";
import { asData, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

const parameters = z.object({
  orderId: z.string().describe("Order number the visitor gave"),
  email: z.string().describe("Required e-mail address of the order, as the visitor typed it"),
  postalCode: z.string().nullable().describe("Optional extra postal-code check, or null; never a substitute for e-mail"),
});

export const verifyCustomer = tool<typeof parameters, SupportContext>({
  name: "verify_customer",
  description:
    "Verify a visitor who is not logged in: order number plus the required e-mail of that order. " +
    "Until it returns VERIFIED you must share nothing about orders. Never repeat the e-mail or postal code in your answer.",
  parameters,
  errorFunction: toolErrorHandler("verify_customer"),
  execute: async ({ orderId, email, postalCode }, runContext) => {
    const session = sessionOf(runContext);
    const thread = getThread(session.threadId);
    if (!thread) throw new Error(`No conversation ${session.threadId} to verify`);
    const result = verifyGuest(thread, orderId, email, postalCode);

    if (result.status === "VERIFIED") {
      session.customerId = result.customer.id;
      session.customerName = result.customer.name;
      session.language = result.customer.language;
      session.activeOrderId = result.orderId;
      emitAgentEvent(session.threadId, { kind: "verification", outcome: "verified", customerId: result.customer.id, customerName: result.customer.name });
      return asData("verify_customer", { status: "VERIFIED", customerName: result.customer.name, instruction: "Greet the customer by name and continue with their request." });
    }
    if (result.status === "ALREADY_VERIFIED") return asData("verify_customer", { status: "ALREADY_VERIFIED", instruction: "Nothing to do: continue with the request." });
    if (result.status === "LOCKED") {
      emitAgentEvent(session.threadId, { kind: "verification", outcome: "locked" });
      return asData("verify_customer", {
        status: "LOCKED",
        instruction: "Too many verification attempts. Say verification is unavailable, share nothing about orders, and offer escalate_to_human.",
      });
    }
    emitAgentEvent(session.threadId, { kind: "verification", outcome: "failed", attemptsLeft: result.attemptsLeft });
    return asData("verify_customer", {
      status: "VERIFICATION_FAILED",
      attemptsLeft: result.attemptsLeft,
      instruction: "Say the details do not match what we have, WITHOUT saying which detail was wrong or whether the order exists. Invite one more try if attemptsLeft is above 0, otherwise offer escalate_to_human.",
    });
  },
});
