/** Server-owned reply offers: structured tool intent in, one validated customer choice out. No prose matching. */
import { CURRENCY } from "@/lib/config";
import { findOpenTicketForThread, findOrderForCustomer, refundedSoFar } from "@/lib/data/store";
import { pick } from "@/lib/escalation/notices";
import { normalizeInput } from "@/lib/guardrails/normalize-input";
import { redactSecrets } from "@/lib/security/request-key";
import { checkRefund } from "@/lib/tools/refund-rules";
import type { QuickReplyDecision, QuickReplyWidget, SupportContext } from "@/lib/types";
import { currentTurnId, emitAgentEvent } from "./event-bus";
import { getThread, type Thread } from "./threads";

export type ReplyOfferInput = { kind: "escalation" | "refund"; orderId: string | null; amount: number | null; reason: string | null };
type Refund = { orderId: string; amount: number; reason: string };
export type PendingQuickReply = { id: string; turnId: string; customerId: string; kind: ReplyOfferInput["kind"]; widget: QuickReplyWidget; refund?: Refund };
type Refused = { ok: false; message: string };
const refused = (message: string): Refused => ({ ok: false, message });

function checkedRefund(ctx: SupportContext, input: ReplyOfferInput): Refund | Refused {
  if (!input.orderId || input.amount === null || !input.reason?.trim()) return refused("Order, amount and reason are required for refund confirmation.");
  const order = findOrderForCustomer(ctx.customerId, input.orderId);
  const check = checkRefund({ customerId: ctx.customerId, order, amount: input.amount, alreadyRefunded: order ? refundedSoFar(order.id) : 0 });
  if (!check.ok || !order) return refused(check.ok ? "No such order for this customer." : check.message);
  return { orderId: order.id, amount: input.amount, reason: normalizeInput(redactSecrets(input.reason)).text };
}

export function offerQuickReplies(ctx: SupportContext, input: ReplyOfferInput): { ok: true; prompt: string } | Refused {
  const thread = getThread(ctx.threadId);
  const turnId = currentTurnId(ctx.threadId);
  // SECURITY: an old resumed run cannot replace a newer customer's offer, or offer another thread's data.
  if (!thread || thread.customerId !== ctx.customerId || !turnId || thread.latestTurnId !== turnId || thread.takeover.status !== "agent") return refused("This reply offer is no longer current.");
  if (input.kind === "escalation" && findOpenTicketForThread(thread.threadId)) return refused("A human colleague's ticket is already open for this conversation.");
  const refund = input.kind === "refund" ? checkedRefund(ctx, input) : undefined;
  if (refund && "ok" in refund) return refund;
  const order = refund ? findOrderForCustomer(ctx.customerId, refund.orderId)! : undefined;
  const details = refund ? `${refund.amount} ${CURRENCY} · #${refund.orderId} · ${order!.items.map((item) => item.name).join(", ")}` : "";
  const prompt = refund ? pick(ctx.language, { pl: `Czy potwierdzasz zwrot: ${details}?`, en: `Confirm this refund: ${details}?`, de: `Diese Erstattung bestätigen: ${details}?` })
    : pick(ctx.language, { pl: "Czy chcesz porozmawiać z konsultantem?", en: "Would you like help from a human colleague?", de: "Möchtest du Hilfe von einem Mitarbeiter?" });
  const id = crypto.randomUUID();
  thread.pendingQuickReply = { id, turnId, customerId: ctx.customerId, kind: input.kind, refund,
    widget: { type: "quick-replies", offerId: id, threadId: thread.threadId, prompt,
      yes: pick(ctx.language, { pl: "Tak, poproszę", en: "Yes, please", de: "Ja, bitte" }),
      no: pick(ctx.language, { pl: "Nie, dziękuję", en: "No, thanks", de: "Nein, danke" }) } };
  return { ok: true, prompt };
}

export function consumeQuickReply(thread: Thread, ctx: SupportContext, click: QuickReplyDecision): { ok: true; text: string; reply?: string } | Refused {
  const pending = thread.pendingQuickReply;
  delete thread.pendingQuickReply;
  if (!pending || pending.id !== click.offerId || pending.turnId !== thread.latestTurnId || pending.customerId !== ctx.customerId || thread.takeover.status !== "agent" || (pending.kind === "escalation" && findOpenTicketForThread(thread.threadId))) return refused("These reply choices are no longer current. Use the latest message.");
  if (click.decision === "no") return { ok: true, text: pending.widget.no,
    reply: pick(ctx.language, { pl: "Dobrze, nie będę kontynuować tej prośby.", en: "Okay, I will not continue with that request.", de: "In Ordnung, ich werde diese Anfrage nicht fortsetzen." }) };
  if (pending.kind === "escalation") return { ok: true, text: pick(ctx.language, { pl: "Tak, chcę porozmawiać z konsultantem.", en: "Yes, I would like to talk to a human, please.", de: "Ja, ich möchte mit einem Mitarbeiter sprechen." }) };
  const refund = pending.refund;
  const checked = refund ? checkedRefund(ctx, { kind: "refund", ...refund }) : refused("No refund details are available.");
  if ("ok" in checked) return checked;
  // Customer consent is ordinary input: the agent, tool rules, payout checks and SDK approval still run.
  return { ok: true, text: pick(ctx.language, {
    pl: `Tak, potwierdzam zwrot ${checked.amount} ${CURRENCY} za zamówienie #${checked.orderId}. Powód: ${checked.reason}`,
    en: `Yes, I confirm a refund of ${checked.amount} ${CURRENCY} for order #${checked.orderId}. Reason: ${checked.reason}`,
    de: `Ja, ich bestätige eine Erstattung von ${checked.amount} ${CURRENCY} für Bestellung #${checked.orderId}. Grund: ${checked.reason}` }) };
}

/** Publish only after a successful final answer, never after a tripwire, failure or staff approval pause. */
export function publishQuickReplies(thread: Thread, outcome: { reply: string; failed?: string; tripwire?: string; approvals: unknown[] }, tools: string[], automaticallyEscalated = false): QuickReplyWidget | undefined {
  const pending = thread.pendingQuickReply;
  if (!pending || pending.turnId !== currentTurnId(thread.threadId)) return;
  if (pending.turnId !== thread.latestTurnId || automaticallyEscalated || (pending.kind === "escalation" && findOpenTicketForThread(thread.threadId)) || !outcome.reply || outcome.failed || outcome.tripwire || outcome.approvals.length ||
    (pending.kind === "refund" && tools.includes("create_refund")) || (pending.kind === "escalation" && tools.includes("escalate_to_human"))) {
    delete thread.pendingQuickReply;
    return;
  }
  emitAgentEvent(thread.threadId, { kind: "widget", widget: pending.widget });
  return pending.widget;
}
