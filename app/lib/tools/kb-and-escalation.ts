/**
 * Agents SDK: `search_kb` (read-only RAG) and `escalate_to_human`.
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { searchKb } from "@/lib/kb/search";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { openTicket } from "@/lib/runtime/tickets";
import { escalationNextStep } from "@/lib/escalation/notices";
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

export const escalateToHuman = tool<z.ZodObject<{ summary: z.ZodString }>, SupportContext>({
  name: "escalate_to_human",
  description:
    "Hand the case to a human colleague. Use when the KB has no answer, a refund is refused " +
    "and the customer disagrees, or the customer is upset after two attempts.",
  parameters: z.object({ summary: z.string().describe("One or two sentences a human can act on") }),
  errorFunction: toolErrorHandler("escalate_to_human"),
  execute: async ({ summary }, runContext) => {
    // SECURITY: customer, thread and trace come from the session, never from model arguments.
    const { customerId, threadId, traceId } = sessionOf(runContext);
    const { ticket, created } = openTicket({
      customerId,
      threadId,
      traceId: traceId ?? "",
      summary,
      source: "agent",
      reason: "agent_request",
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
