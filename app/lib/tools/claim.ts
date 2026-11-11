/**
 * Agents SDK: the three damage-claim tools - slot filling with a code-enforced finish.
 *
 * Flow: the customer reports damage -> `update_claim` stores what they said and answers with the ONE next
 * question -> (optional) `request_claim_photo` shows an upload card -> the customer confirms a summary ->
 * `submit_claim` creates the claim, but only if the whole draft passes the zod schema.
 *
 * The draft is `session.claimDraft` in the run context: the model never holds the form, it only relays
 * answers. INTERVIEW: "Slot filling the model cannot get wrong: the tool returns exactly one next question,
 * and the claim is created by a schema check, not by the model deciding it is done."
 */
import { tool } from "@openai/agents";
import { z } from "zod";
import { addClaim, findOrderForCustomer, listPhotos } from "@/lib/data/store";
import { mergeClaimFields, publishClaimSlots } from "@/lib/claims/claim-draft";
import { CLAIM_SLOTS, checkClaimOrder, checkNoticedAt, claimSchema, isoDay } from "@/lib/claims/claim-schema";
import { ACCEPTED_PHOTO_TYPES, MAX_PHOTO_BYTES } from "@/lib/claims/photo-validate";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import { missingRequired, nextSlot } from "@/lib/slots/slots";
import type { ClaimDraft, SupportContext } from "@/lib/types";
import { asData, requireVerified, sessionOf } from "./helpers";
import { toolErrorHandler } from "./tool-error";

const updateParameters = z.object({
  orderId: z.string().nullable().describe("Order number if the customer named it, else null"),
  item: z.string().nullable().describe("The damaged item, named as in the order, else null"),
  damage: z.string().nullable().describe("The customer's own description of the damage, else null"),
  noticedAt: z.string().nullable().describe("Date the customer noticed the damage, as YYYY-MM-DD, else null"),
});

const draftOf = (session: SupportContext): ClaimDraft => session.claimDraft ?? {};

/** The instruction every status result ends with: one question at a time. */
function slotInstruction(draft: ClaimDraft): { status: "IN_PROGRESS" | "COMPLETE"; nextQuestion?: string; instruction: string } {
  const next = nextSlot(CLAIM_SLOTS, draft);
  if (!next) {
    return {
      status: "COMPLETE",
      instruction:
        "All required fields are filled. Offer the optional photo ONCE with request_claim_photo (skip if already attached or declined), " +
        "then summarize the claim in 2-3 lines and ask the customer to confirm. Call submit_claim only after they confirm.",
    };
  }
  return { status: "IN_PROGRESS", nextQuestion: next.question, instruction: `Ask the customer ONLY this one question, nothing else: "${next.question}"` };
}

export const updateClaim = tool<typeof updateParameters, SupportContext>({
  name: "update_claim",
  description:
    "Store what the customer told you about a damaged item (any of: order, item, damage, date noticed; null for the rest). " +
    "Call it every time the customer gives a claim detail. The result names the ONE next question to ask.",
  parameters: updateParameters,
  errorFunction: toolErrorHandler("update_claim"),
  execute: async (input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    // SECURITY: ownership and the claim window are checked here, from the session's customer, not from the model's words.
    const { draft, rejected } = mergeClaimFields(session.customerId, draftOf(session), input, isoDay(new Date()));
    session.claimDraft = draft;
    publishClaimSlots(session.threadId, draft);
    return asData("update_claim", { ...slotInstruction(draft), filled: CLAIM_SLOTS.filter((s) => draft[s.key as keyof ClaimDraft]).map((s) => s.key), rejected });
  },
});

export const requestClaimPhoto = tool<z.ZodObject<Record<string, never>>, SupportContext>({
  name: "request_claim_photo",
  description: "Show the customer an OPTIONAL photo upload card for the damage. Only after the order is known. Never ask for photos in text.",
  parameters: z.object({}),
  errorFunction: toolErrorHandler("request_claim_photo"),
  execute: async (_input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    if (!draftOf(session).orderId) return asData("request_claim_photo", { status: "NO_CLAIM_ORDER", instruction: "Collect the order first with update_claim." });
    emitAgentEvent(session.threadId, {
      kind: "widget",
      widget: { type: "photo-upload", prompt: "Attach a photo of the damage (optional)", maxBytes: MAX_PHOTO_BYTES, acceptedTypes: [...ACCEPTED_PHOTO_TYPES] },
    });
    return asData("request_claim_photo", { status: "UPLOAD_CARD_SHOWN", instruction: "Write one short sentence: the photo is optional, they can attach it or say to continue without. Then stop." });
  },
});

export const submitClaim = tool<z.ZodObject<Record<string, never>>, SupportContext>({
  name: "submit_claim",
  description: "Create the damage claim from the collected details. Call ONLY after the customer confirmed your summary. The system refuses an incomplete claim.",
  parameters: z.object({}),
  errorFunction: toolErrorHandler("submit_claim"),
  execute: async (_input, runContext) => {
    const session = sessionOf(runContext);
    const notVerified = requireVerified(session);
    if (notVerified) return notVerified;
    const draft = draftOf(session);
    // INTERVIEW: code-enforced finish. The claim is created only if the server-held draft passes the schema.
    const parsed = claimSchema.safeParse(draft);
    if (!parsed.success) {
      const missing = missingRequired(CLAIM_SLOTS, draft).map((s) => s.key);
      return asData("submit_claim", { ...slotInstruction(draft), status: "INCOMPLETE", missing, problems: parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`) });
    }
    // Rules again at submit time: the order may have changed since the field was accepted.
    const claim = parsed.data;
    const order = findOrderForCustomer(session.customerId, claim.orderId);
    const orderCheck = checkClaimOrder(order);
    const dateCheck = checkNoticedAt(claim.noticedAt, order, isoDay(new Date()));
    if (!orderCheck.ok || !dateCheck.ok) return asData("submit_claim", { status: "REFUSED", ...(!orderCheck.ok ? orderCheck : dateCheck) });
    // SECURITY: a photo id counts only if THIS conversation uploaded it.
    if (claim.photoId && !listPhotos().some((p) => p.id === claim.photoId && p.threadId === session.threadId)) {
      return asData("submit_claim", { status: "REFUSED", code: "PHOTO_NOT_FOUND", message: "The attached photo is not available." });
    }
    const record = addClaim({ customerId: session.customerId, ...claim });
    session.claimDraft = undefined;
    publishClaimSlots(session.threadId, draft, `Claim ${record.id} created`);
    return asData("submit_claim", { status: "CLAIM_CREATED", claimId: record.id, orderId: record.orderId, photoAttached: Boolean(record.photoId) });
  },
});
