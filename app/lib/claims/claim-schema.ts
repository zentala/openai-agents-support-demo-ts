/**
 * The damage claim: its slots, the zod schema a finished draft must pass, and the business rules.
 *
 * INTERVIEW: "The agent collects the fields, but only this schema decides whether a claim exists.
 * `submit_claim` runs `claimSchema.safeParse` on the server-held draft - a model that thinks it has
 * everything cannot create a half-empty claim."
 *
 * zod is used twice: as the strict gate here, and (in lib/tools/claim.ts) as the JSON schema the model
 * sees for the tool arguments.
 */
import { z } from "zod";
import type { Order } from "@/lib/data/store";
import type { SlotSpec } from "@/lib/slots/slots";

/** The damaged-items article says: report within 7 days of delivery. Enforced in code, not only in the KB. */
export const CLAIM_WINDOW_DAYS = 7;

export const CLAIM_SLOTS: readonly SlotSpec[] = [
  { key: "orderId", label: "Order", question: "Which order is the damaged item from?", required: true },
  { key: "item", label: "Item", question: "Which item of that order is damaged?", required: true },
  { key: "damage", label: "Damage", question: "What exactly is damaged? A short description is enough (at least a sentence).", required: true },
  { key: "noticedAt", label: "Noticed on", question: "On which date did you notice the damage? (YYYY-MM-DD)", required: true },
  { key: "photoId", label: "Photo", question: "Optional photo of the damage.", required: false },
];

/** A claim exists only when this passes. `photoId` is the only optional field. */
export const claimSchema = z.object({
  orderId: z.string().min(1, "order is missing"),
  item: z.string().trim().min(2, "item is missing").max(120),
  damage: z.string().trim().min(10, "describe the damage in at least 10 characters").max(500),
  noticedAt: z.iso.date("noticedAt must be a date like 2026-11-05"),
  photoId: z.string().optional(),
});

export type ValidClaim = z.infer<typeof claimSchema>;

const MS_PER_DAY = 86_400_000;
export const isoDay = (date: Date): string => date.toISOString().slice(0, 10);
const dayNumber = (iso: string): number => Math.floor(Date.parse(iso) / MS_PER_DAY);

export type RuleResult = { ok: true } | { ok: false; code: string; message: string };

/** The order must be delivered, and the claim must come within the window (the KB's 7 days). */
export function checkClaimOrder(order: Order | undefined): RuleResult {
  if (!order) return { ok: false, code: "ORDER_NOT_FOUND", message: "No such order for this customer." };
  if (order.status !== "delivered" || order.deliveredDaysAgo === null) {
    return { ok: false, code: "NOT_DELIVERED", message: "The order has not been delivered yet, so nothing can be damaged. Offer escalation if the customer disagrees." };
  }
  if (order.deliveredDaysAgo > CLAIM_WINDOW_DAYS) {
    return {
      ok: false,
      code: "CLAIM_WINDOW_EXPIRED",
      message: `Delivered ${order.deliveredDaysAgo} days ago; damage must be reported within ${CLAIM_WINDOW_DAYS} days of delivery (damaged-items).`,
    };
  }
  return { ok: true };
}

/** The noticed date cannot be in the future or before the order arrived. */
export function checkNoticedAt(noticedAt: string, order: Order | undefined, today: string): RuleResult {
  if (dayNumber(noticedAt) > dayNumber(today)) return { ok: false, code: "DATE_IN_FUTURE", message: `${noticedAt} is in the future (today is ${today}).` };
  if (order?.deliveredDaysAgo != null && dayNumber(noticedAt) < dayNumber(today) - order.deliveredDaysAgo) {
    return { ok: false, code: "BEFORE_DELIVERY", message: `${noticedAt} is before the order was delivered.` };
  }
  return { ok: true };
}
