/**
 * The claim draft: merging what the model collected, validating each field in code, and reporting the slot
 * state to the Agent View. Pure except `publishClaimSlots`, which writes one panel event.
 *
 * The draft lives in the RUN CONTEXT (`session.claimDraft`), so it survives between turns (the thread keeps
 * it) and the model cannot "remember" a different value than the one the server holds.
 */
import { z } from "zod";
import { findOrderForCustomer, type Order } from "@/lib/data/store";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { slotViews } from "@/lib/slots/slots";
import type { ClaimDraft } from "@/lib/types";
import { CLAIM_SLOTS, checkClaimOrder, checkNoticedAt } from "./claim-schema";

export type FieldProblem = { field: string; code: string; message: string };

/** What the model passes to `update_claim`: `null` means "the customer did not say". */
export type ClaimFields = { orderId: string | null; item: string | null; damage: string | null; noticedAt: string | null };

const MIN_DAMAGE_LENGTH = 10;
const MAX_TEXT = 500;

/** Does the item the customer named belong to the order? Matches names case-insensitively, either way round. */
const itemInOrder = (order: Order, item: string): boolean => {
  const wanted = item.trim().toLowerCase();
  return order.items.some((line) => line.name.toLowerCase().includes(wanted) || wanted.includes(line.name.toLowerCase()));
};

function checkField(customerId: string, draft: ClaimDraft, field: keyof ClaimFields, value: string, today: string): FieldProblem | undefined {
  const problem = (code: string, message: string): FieldProblem => ({ field, code, message });
  const order = findOrderForCustomer(customerId, field === "orderId" ? value : (draft.orderId ?? ""));
  if (field === "orderId") {
    const check = checkClaimOrder(order);
    return check.ok ? undefined : problem(check.code, check.message);
  }
  if (field === "item") {
    if (value.trim().length < 2) return problem("ITEM_TOO_SHORT", "Name the damaged item.");
    if (order && !itemInOrder(order, value)) {
      return problem("ITEM_NOT_IN_ORDER", `That item is not in order #${order.id}. Items: ${order.items.map((line) => line.name).join(", ")}.`);
    }
    return undefined;
  }
  if (field === "damage") {
    return value.trim().length < MIN_DAMAGE_LENGTH ? problem("DAMAGE_TOO_SHORT", "Ask for a slightly longer description of the damage (a full sentence).") : undefined;
  }
  if (!z.iso.date().safeParse(value).success) return problem("INVALID_DATE", "Use the format YYYY-MM-DD, e.g. 2026-11-05.");
  const check = checkNoticedAt(value, order, today);
  return check.ok ? undefined : problem(check.code, check.message);
}

/**
 * Applies the fields the customer just gave. Valid ones go into the draft, invalid ones come back as
 * `rejected` with a reason the agent can explain. The order is checked first so the item can be matched to it.
 */
export function mergeClaimFields(customerId: string, draft: ClaimDraft, incoming: ClaimFields, today: string): { draft: ClaimDraft; rejected: FieldProblem[] } {
  const next: ClaimDraft = { ...draft };
  const rejected: FieldProblem[] = [];
  for (const field of ["orderId", "item", "damage", "noticedAt"] as const) {
    const value = incoming[field]?.trim().slice(0, MAX_TEXT);
    if (!value) continue;
    const problem = checkField(customerId, next, field, value, today);
    if (problem) rejected.push(problem);
    else next[field] = field === "orderId" ? (findOrderForCustomer(customerId, value)?.id ?? value) : value;
  }
  // An order with ONE kind of item needs no "which item?" question: code fills the slot and saves a turn.
  const order = next.orderId ? findOrderForCustomer(customerId, next.orderId) : undefined;
  if (order && !next.item && order.items.length === 1) next.item = order.items[0].name;
  return { draft: next, rejected };
}

/** Shows the slots in the Agent View: filled or missing, with the values collected so far. */
export function publishClaimSlots(threadId: string, draft: ClaimDraft, outcome?: string): void {
  emitAgentEvent(threadId, {
    kind: "slots",
    form: "damage-claim",
    title: "Damage claim",
    slots: slotViews(CLAIM_SLOTS, draft, ["photoId"]),
    outcome,
  });
}
