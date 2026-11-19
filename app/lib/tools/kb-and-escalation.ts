/**
 * Agents SDK: `search_kb` (read-only RAG) and `escalate_to_human`.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { searchKb } from "@/lib/kb/search";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { openTicket } from "@/lib/runtime/tickets";
import { findOrderForCustomer, currentAddress } from "@/lib/data/store";
import { escalationNextStep } from "@/lib/escalation/notices";
import { disputedDeliveryOrder } from "@/lib/escalation/delivery-dispute";
import { decideEscalation } from "@/lib/escalation/rules";
import { getThread } from "@/lib/runtime/threads";
import type { SupportContext } from "@/lib/types";
import { asData, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

export const searchKbTool = tool<z.ZodObject<{ query: z.ZodString }>, SupportContext>({
  name: "search_kb",
  description:
    "Search the Nordic Home knowledge base (returns, refunds, delivery, warranty, assembly, " +
    "payments, damaged items). Works in any language. Returns up to 3 articles with ids.",
  parameters: z.object({ query: z.string().describe("The customer's question, in any language") }),
  // An embeddings failure (429, bad key) must reach the Errors panel, not vanish.
  errorFunction: toolErrorHandler("search_kb"),
  execute: async ({ query }, runContext) => {
    const { threadId } = sessionOf(runContext);
    const hits = await searchKb(query);
    // Show the hits in the Agent View panel (the model only sees the text below).
    emitAgentEvent(threadId, { kind: "kb_hits", query, hits });
    if (hits.length === 0) {
      return asData("search_kb", "NO_RELEVANT_ARTICLE. Tell the customer you do not have this information.");
    }
    return hits.map((hit) => asData(`kb:${hit.id} "${hit.title}"`, hit.snippet)).join("\n\n");
  },
});

const escalationParameters = z.object({
  summary: z.string().describe("One or two sentences a human can act on"),
  category: z.enum(["delivery_dispute", "consultant_complaint"]).optional().describe("Use delivery_dispute for a missing delivery or consultant_complaint for a complaint about a consultant."),
});

export const escalateToHuman = tool<typeof escalationParameters, SupportContext>({
  name: "escalate_to_human",
  description:
    "Hand the case to a human colleague. Use when the KB has no answer, a refund is refused " +
    "and the customer disagrees, or the customer is upset after two attempts.",
  parameters: escalationParameters,
  errorFunction: toolErrorHandler("escalate_to_human"),
  execute: async ({ summary, category }, runContext) => {
    // SECURITY: customer, thread and trace come from the session, never from model arguments.
    const session = sessionOf(runContext);
    const { customerId, threadId, traceId } = session;
    const thread = getThread(threadId);
    const customerMessages = thread?.transcript.filter((entry) => entry.role === "customer").map((entry) => entry.text) ?? [session.customerMessage ?? ""];
    const disputeOrder = category !== "consultant_complaint"
      ? disputedDeliveryOrder(customerId, session.activeOrderId, customerMessages) : undefined;
    const customerDecision = decideEscalation({ text: session.customerMessage ?? "", guardrailTrips: 0, toolErrors: 0 });
    const agreement = (customerDecision.escalate && customerDecision.reason === "human_requested") || Boolean(thread?.customerAgreedToConsultant);
    if (disputeOrder && !agreement) return asData("escalate_to_human", {
      status: "CONSULTANT_CONSENT_REQUIRED",
      instruction: "The customer has not agreed to consultant help. Do not open a ticket. Acknowledge the delivery record, ask once whether they are sure, and offer a consultant.",
    });
    const effectiveCategory = disputeOrder ? "delivery_dispute" : category;
    const order = effectiveCategory === "delivery_dispute"
      ? (disputeOrder ?? (session.activeOrderId ? findOrderForCustomer(customerId, session.activeOrderId) : undefined)) : undefined;
    const deliveryContext = order && order.deliveredDaysAgo !== null
      ? `\n\nRecorded order context: #${order.id}; delivered ${new Date(Date.now() - order.deliveredDaysAgo * 86_400_000).toISOString().slice(0, 10)}; address ${Object.values(currentAddress(order)).join(", ")}.`
      : "";
    const { ticket, created } = openTicket({
      customerId,
      threadId,
      traceId: traceId ?? "",
      summary: `${summary}${deliveryContext}`,
      source: "agent",
      reason: effectiveCategory ?? "agent_request",
      category: effectiveCategory,
    });
    return asData("escalate_to_human", {
      status: created ? "TICKET_CREATED" : "TICKET_ALREADY_OPEN", ticketId: ticket.id,
      queueStatus: "waiting_for_consultant",
      // Customer-facing facts live here, not in the prompt: the leak guardrail blocks answers that repeat prompt text.
      queueMeaning: "Opening a ticket puts the case in a queue; it does not mean a consultant has taken over yet.",
      nextStep: escalationNextStep("en"),
      outboundContactScheduled: false, responseTime: null,
    });
  },
});
