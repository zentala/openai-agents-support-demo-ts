/**
 * Agents SDK: `update_address_change` - slot filling for a delivery address change.
 *
 * The tool collects the order and the new address one field at a time (same pattern as the damage claim).
 * When everything is filled it does NOT change anything: it stores a proposal and shows a confirmation card
 * with the old and the new address. The address changes only when the customer clicks Confirm (see
 * lib/address/address-flow.ts). INTERVIEW: "The agent proposes, the customer's click disposes."
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { mergeAddressFields, proposeAddressChange, publishAddressSlots } from "@/lib/address/address-flow";
import { ADDRESS_SLOTS } from "@/lib/address/address-schema";
import { getThread } from "@/lib/runtime/threads";
import { nextSlot } from "@/lib/slots/slots";
import type { Address, SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

const parameters = z.object({
  orderId: z.string().nullable().describe("Order number if the customer named it, else null"),
  street: z.string().nullable().describe("Street and house number of the NEW address, else null"),
  city: z.string().nullable().describe("City of the NEW address, else null"),
  postalCode: z.string().nullable().describe("Postal code of the NEW address, else null"),
  country: z.string().nullable().describe("ISO country code explicitly named by the customer, else null. It is not a missing slot: code retains the order's trusted country. Never guess from language or city."),
});

export const updateAddressChange = tool<typeof parameters, SupportContext>({
  name: "update_address_change",
  description:
    "Collect a delivery address change for an order that is still in transit. Call it every time the customer gives " +
    "the order or a part of the new address (null for the rest). The result names the ONE next question. " +
    "When all fields are filled it shows a confirmation card; the change is applied only by the customer's click.",
  parameters,
  errorFunction: toolErrorHandler("update_address_change"),
  execute: async (input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    const thread = getThread(session.threadId);
    if (!thread) throw new Error(`No conversation ${session.threadId}`);

    // SECURITY: ownership and "still in transit" are checked here from the session, not from the model's words.
    const pending = thread.pendingAddress;
    const prior = pending && (!input.orderId || input.orderId.replace(/^#/, "").trim() === pending.orderId)
      ? { orderId: pending.orderId, ...pending.newAddress } : {};
    const { draft, rejected } = mergeAddressFields(session.customerId, session.addressDraft ?? prior, input);
    session.addressDraft = draft;
    if (rejected.length) {
      delete thread.pendingAddress;
      session.addressDraft = undefined;
      return asData("update_address_change", { status: "REFUSED", rejected, instruction: "Explain the rejection reason. Offer escalation for a country or postal-code policy refusal. Do not claim a change or confirmation card." });
    }
    const next = nextSlot(ADDRESS_SLOTS, draft);
    if (next) {
      delete thread.pendingAddress;
      session.addressDraft = draft;
      publishAddressSlots(session.threadId, draft);
      return asData("update_address_change", { status: "IN_PROGRESS", nextQuestion: next.question, rejected, instruction: `Ask the customer ONLY this one question, nothing else: "${next.question}"` });
    }
    const proposal = proposeAddressChange(thread, draft as Address & { orderId: string });
    if (!proposal.ok) session.addressDraft = undefined;
    if (!proposal.ok) return asData("update_address_change", { status: "REFUSED", code: proposal.code, reason: proposal.message, instruction: "Explain the rejection reason and offer escalation to a consultant. Do not claim an address change." });
    session.addressDraft = undefined;
    publishAddressSlots(session.threadId, draft, "Waiting for the customer's confirmation");
    return asData("update_address_change", {
      status: "CONFIRMATION_SHOWN",
      rejected,
      instruction: "A card with the old and new address is shown. Write ONE short sentence asking the customer to confirm with the Confirm button. Do NOT say the address was changed.",
    });
  },
});
