/**
 * A model run can end with no text (for example right after a tool call), or with only a promise to look
 * something up ("I will check ... please wait") although no tool ran, so nothing will ever follow. The customer
 * must never see a blank bubble or a dead promise, so code answers with a fixed system line. It names only what THIS turn's tool output created; an
 * older card or proposal is never announced again.
 */
import { addressPolicyRefusal } from "@/lib/address/address-notices";
import { pick } from "@/lib/escalation/notices";
import { automaticStep } from "@/lib/message-kinds";
import type { SupportContext } from "@/lib/types";
import type { RunObservation } from "./run-observer";
import type { RunOutcome } from "./run-support";
import { assistantItem, userItem, type Thread } from "./threads";

const NEUTRAL = {
  pl: "Nie udało się przygotować odpowiedzi. Napisz proszę wiadomość jeszcze raz.",
  en: "I could not prepare an answer. Please send your message again.",
  de: "Es konnte keine Antwort erstellt werden. Bitte sende deine Nachricht noch einmal.",
};
const CONFIRM_CARD = {
  pl: "Sprawdź kartę ze starym i nowym adresem i potwierdź zmianę przyciskiem Potwierdź.",
  en: "Please check the card with the old and new address and confirm the change with the Confirm button.",
  de: "Bitte prüfe die Karte mit alter und neuer Adresse und bestätige die Änderung mit der Schaltfläche Bestätigen.",
};

/**
 * A promise to look something up or a request to wait, in English, Polish or German. Only a dead promise when no tool
 * ran in the turn: after a tool call the same words can be a legitimate step.
 */
const WAIT_PROMISE = /\b(?:(?:I(?:'ll| will| am going to)|let me)\s+(?:check|look|retrieve|verify|find|fetch|get)|(?:wait|hold on|one|just) (?:a )?(?:moment|second|minute)|moment please)\b|sprawdz[ęe]|chwil|einen moment|ich pr[üu]fe|ich werde[^.!?]{0,40}pr[üu]fen/iu;
export const isDeadPromise = (reply: string, observed: RunObservation): boolean =>
  observed.tools.length === 0 && WAIT_PROMISE.test(reply);

/** Fixed text from this turn's observed state, in the customer's language. */
export function emptyReplyText(ctx: SupportContext, observed: RunObservation): string {
  const address = observed.addressResult;
  if (address?.status === "CONFIRMATION_SHOWN") return pick(ctx.language, CONFIRM_CARD);
  if (address?.status === "REFUSED" && address.code) return addressPolicyRefusal(ctx.language, { ok: false, code: address.code, message: address.message ?? "" });
  return pick(ctx.language, NEUTRAL);
}

/** A run that ends with no text or a dead promise (no pause for approval, guardrail stop or crash) gets a system line. */
export function fillEmptyReply(thread: Thread, ctx: SupportContext, customerText: string, outcome: RunOutcome, observed: RunObservation): RunOutcome {
  if (outcome.approvals.length > 0 || outcome.tripwire || outcome.failed) return outcome;
  if (outcome.reply && !isDeadPromise(outcome.reply, observed)) return outcome;
  const reply = emptyReplyText(ctx, observed);
  thread.history.push(userItem(customerText), assistantItem(reply));
  // The run's own history holds the dead promise; the system line replaces it.
  return { ...outcome, reply, history: undefined, sender: automaticStep("Automatic reply") };
}
