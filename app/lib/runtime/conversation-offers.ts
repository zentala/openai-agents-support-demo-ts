/** Conversation code requests optional help/refund choices from validated state, never from answer prose. */
import { RunContext } from "@openai/agents";
import { findOrderForCustomer, orderTotal, refundedSoFar } from "@/lib/data/store";
import { offerReplyChoices } from "@/lib/tools/reply-choices";
import type { SupportContext } from "@/lib/types";
import { emitAgentEvent } from "./event-bus";
import type { RunObservation } from "./run-observer";
import type { RunOutcome } from "./run-support";
import type { Thread } from "./threads";
import type { ReplyOfferInput } from "./quick-replies";

/** Only customer input is recognized. A bare agreement must refer to the current server-owned offer. */
export function replyDecision(text: string): "yes" | "no" | undefined {
  if (/^(?:no|nie|nein)(?:[,.! ]|$)/i.test(text.trim())) return "no";
  if (/^(?:yes(?:,? please)?|tak(?:,? poprosz[eę])?|ja(?:,? bitte)?)[.!]?(?:\s+I confirm (?:those|these) refund details[.!]?)?\s*$/i.test(text.trim())) return "yes";
}

export function rememberRefundRequest(thread: Thread, text: string): void {
  if (/\b(?:refund|zwrot|refundacj\p{L}*|erstattung)\b/iu.test(text) || /\breturn\b.*\b(?:PLN|zł)\b/i.test(text)) thread.refundRequest = text;
}

function refundOffer(thread: Thread, ctx: SupportContext): ReplyOfferInput | undefined {
  if (!thread.refundRequest) return;
  const named = /(?:order|zam[oó]wieni\p{L}*|bestellung)\s*#?\s*(\d+)/iu.exec(thread.refundRequest)?.[1];
  const order = findOrderForCustomer(ctx.customerId, named ?? ctx.activeOrderId ?? "");
  if (!order) return;
  const amount = /(\d+(?:[.,]\d{1,2})?)\s*(?:PLN|zł|zl)\b/i.exec(thread.refundRequest)?.[1];
  return { kind: "refund", orderId: order.id, amount: amount ? Number(amount.replace(",", ".")) : orderTotal(order) - refundedSoFar(order.id), reason: thread.refundRequest };
}

export async function stageConversationOffer(thread: Thread, ctx: SupportContext, outcome: RunOutcome, observed: RunObservation): Promise<void> {
  if (observed.tools.includes("create_refund")) delete thread.refundRequest;
  if (!outcome.reply || outcome.tripwire || outcome.failed || outcome.approvals.length || thread.takeover.status !== "agent") return;
  const input = !observed.tools.includes("create_refund") ? refundOffer(thread, ctx) : undefined;
  const offer = input ?? (observed.tools.includes("search_kb") && !thread.pendingQuickReply ? { kind: "escalation" as const, orderId: null, amount: null, reason: null } : undefined);
  if (!offer) return;
  // This is a real invocation of the existing action by code, explicitly labelled as such in the inspector.
  emitAgentEvent(thread.threadId, { kind: "tool_call", agent: "Conversation flow (code)", tool: "offer_reply_choices", args: offer });
  const result = await offerReplyChoices.invoke(new RunContext(ctx), JSON.stringify(offer));
  emitAgentEvent(thread.threadId, { kind: "tool_output", agent: "Conversation flow (code)", tool: "offer_reply_choices", result });
  observed.tools.push("offer_reply_choices");
  if (thread.pendingQuickReply) delete thread.refundRequest;
}
