/** Route explicit current customer actions to existing Orders tools through the same guarded SDK. */
import { claimSchema } from "@/lib/claims/claim-schema";
import { findOrderForCustomer } from "@/lib/data/store";
import { diffContext, pickMutable } from "@/lib/runtime/context-diff";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { SupportContext } from "@/lib/types";
import { applyHandoffInput } from "./handoff-context";
import { ordersAgent, triageAgent } from "./index";

/** Phrases that name the claim or its summary themselves, in English, Polish or German. */
const CLAIM_ACTION = /\b(?:summary is (?:correct|right)|(?:file|submit|send)\s+(?:the\s+|this\s+|my\s+)?(?:damage\s+)?claim|podsumowanie jest poprawne|z[łl]ó[żz]\s+reklamacj|zg[łl]o[śs]\s+(?:szkod|reklamacj)|zusammenfassung stimmt|schadensmeldung\s+(?:einreichen|aufgeben))/iu;
/** A bare "I confirm" says nothing about WHAT is confirmed (an address change, a refund): it counts only next to claim wording. */
const BARE_CONFIRMATION = /\b(?:potwierdzam|ich best[aä]tige|stimmt|I confirm)\b/iu;
const CLAIM_TOPIC = /(?:claim|summary|reklamacj|podsumowani|zg[łl]oszeni|schaden|reklamation|zusammenfassung)/iu;
/** Any negation of the confirmation itself ("No, ...", "stimmt nicht", "nie potwierdzam", "that's not right") means do not force. */
const NEGATION = /(?:^\s*(?:no|nein|nie|nope)\s*[,.!;]|\b(?:not|never|nicht|nie|kein\p{L}*|sp[äa]ter|p[óo][źz]niej|later)\b|n't\b)/iu;
/** A question is not a confirmation: "How do I file the claim?". */
const QUESTION = /(?:\?\s*$|^\s*(?:how|wie|jak)\b)/iu;
const NEGATED_ACTION = /\b(?:do not|don't|never|nie|nicht)\s+(?:cancel|refund|create|file|submit|anuluj|tw[oó]rz|sk[łl]adaj|stornier\p{L}*|erstatte\p{L}*|einreich\p{L}*)\b/iu;
const REFUND_WORD = /\b(?:refund|zwrot|erstattung)\b/iu;

/** SECURITY: SDK tool selection, not execute()/invoke(). The tool still runs its own schema, ownership and window checks. */
const forcing = (action: string) => ordersAgent.clone({ inputGuardrails: triageAgent.inputGuardrails,
  modelSettings: { ...ordersAgent.modelSettings, toolChoice: action }, resetToolChoice: true });

/**
 * A complete claim draft is stored from earlier turns; the customer now confirms it. Code files it, so the
 * claim exists before any refund turn and does not depend on triage or the model remembering to call the tool.
 */
const confirmsStoredClaim = (ctx: SupportContext, text: string): boolean => {
  const names = CLAIM_ACTION.test(text) || (BARE_CONFIRMATION.test(text) && CLAIM_TOPIC.test(text));
  return claimSchema.safeParse(ctx.claimDraft).success && names && !NEGATION.test(text) && !QUESTION.test(text) && !REFUND_WORD.test(text) && !NEGATED_ACTION.test(text);
};

/**
 * An address change is in progress (the stored draft holds an accepted order; a refused order is never stored).
 * The next message usually answers the question the tool asked, and triage has no address tool. So the turn goes
 * to the Orders agent, with the open step in its instructions (see buildInstructions). No tool is forced: the
 * customer can still ask something else, stop, or ask for a person.
 */
const continuesAddressChange = (ctx: SupportContext): boolean => Boolean(ctx.addressDraft?.orderId);
/** Orders agent chosen by code; no tool is forced. */
const routedToOrders = () => ordersAgent.clone({ inputGuardrails: triageAgent.inputGuardrails });

/**
 * The message names an order number that belongs to THIS session's customer (a guest owns none until verified),
 * with or without the word "order": "for 1004?". Triage has no order tools and may answer from thin air, so the
 * Orders agent takes the turn. A foreign and a non-existent number both fail this test, so they take the same
 * path as before: no existence leak. A number followed by a currency is an amount, not an order.
 */
export const ownOrderNamed = (ctx: SupportContext, text: string): string | undefined =>
  [...text.matchAll(/#?\b(\d{3,6})\b(?!\s*(?:PLN|z[łl]|EUR|GBP))/giu)].map(([, id]) => findOrderForCustomer(ctx.customerId, id)?.id).find(Boolean);

export function agentForRequest(ctx: SupportContext) {
  const text = ctx.customerMessage ?? "";
  if (confirmsStoredClaim(ctx, text)) return forcing("submit_claim");
  const named = /(?:order|zam[oó]wieni\p{L}*|bestellung)\s*#?\s*(\d+)/iu.exec(text)?.[1];
  const owned = findOrderForCustomer(ctx.customerId, named ?? ctx.activeOrderId ?? "");
  const toOrders = continuesAddressChange(ctx) || ownOrderNamed(ctx, text) !== undefined;
  if (NEGATED_ACTION.test(text)) return continuesAddressChange(ctx) ? routedToOrders() : triageAgent;
  if (!owned) return toOrders ? routedToOrders() : triageAgent;
  const refund = REFUND_WORD.test(text);
  const cancel = refund && /\b(?:cancel|anuluj|stornier\p{L}*)\b/iu.test(text);
  const confirmed = refund && /\b(?:I confirm|potwierdzam|ich best[aä]tige)\b/i.test(text);
  const action = cancel ? "cancel_refund" : confirmed ? "create_refund" : undefined;
  if (action) return forcing(action);
  return toOrders ? routedToOrders() : triageAgent;
}

/**
 * The agent for a fresh run. When code (not triage) picked a specialist for a named own order, the handoff hook
 * never runs, so code records what the hook would: the validated order and a code-written reason, announced
 * in the panel like any other context change.
 */
export function routeRequest(ctx: SupportContext) {
  const before = pickMutable(ctx);
  const agent = agentForRequest(ctx);
  const orderId = agent === triageAgent ? undefined : ownOrderNamed(ctx, ctx.customerMessage ?? "");
  if (orderId) {
    applyHandoffInput(ctx, { reason: `Customer asked about order #${orderId}; routed to the Orders agent by code`, orderId });
    const changes = diffContext(before, pickMutable(ctx));
    if (changes) emitAgentEvent(ctx.threadId, { kind: "context_update", changes });
  }
  return agent;
}
