/**
 * What happens when a customer TYPES a bank account or phone number into the chat.
 *
 * normalizeInput has already masked the number before any model saw it. This module does the rest in code,
 * not in the prompt: it shows the matching secure form and adds a fixed sentence telling the customer to use
 * it. The model may also call the form tool itself; then we do not show a second form.
 *
 * INTERVIEW: "I do not rely on the model to notice a leaked IBAN. Code masks it, code shows the form."
 */
import { pick } from "@/lib/escalation/notices";
import { SECURE_FORMS } from "@/lib/tools/secure-forms";
import { GUEST_ID, type SupportContext } from "@/lib/types";
import type { NormalizedInput } from "@/lib/guardrails/normalize-input";
import { emitAgentEvent } from "./event-bus";
import type { RunOutcome } from "./run-support";

const FORM_TOOL: Record<"iban" | "phone", string> = { iban: "request_bank_account", phone: "request_callback_phone" };

const useForm = (language: string | undefined, what: Record<"pl" | "en" | "de", string>) =>
  pick(language, {
    pl: `Dla Twojego bezpieczeństwa usunąłem ${what.pl} z wiadomości, zanim ją zobaczył asystent. Wpisz go w bezpiecznym formularzu poniżej, nie w czacie.`,
    en: `For your safety I removed ${what.en} from your message before the assistant saw it. Please enter it in the secure form below, not in the chat.`,
    de: `Zu Ihrer Sicherheit habe ich ${what.de} aus Ihrer Nachricht entfernt, bevor der Assistent sie sah. Bitte geben Sie sie im sicheren Formular unten ein, nicht im Chat.`,
  });

const verifyFirst = (language: string | undefined) =>
  pick(language, {
    pl: "Najpierw potwierdź swoją tożsamość (numer zamówienia i e-mail); dopiero potem pokażę formularz.",
    en: "Please verify your identity first (order number and e-mail); then I can show the form.",
    de: "Bitte bestätigen Sie zuerst Ihre Identität (Bestellnummer und E-Mail); dann zeige ich das Formular.",
  });

const WHAT = {
  iban: { pl: "numer konta", en: "the bank account number", de: "die Kontonummer" },
  phone: { pl: "numer telefonu", en: "the phone number", de: "die Telefonnummer" },
};

export function withSecureFormNotice(
  ctx: SupportContext,
  outcome: RunOutcome,
  sensitive: NormalizedInput["sensitive"],
  toolsCalled: string[],
): RunOutcome {
  const fields = (["iban", "phone"] as const).filter((field) => sensitive[field] > 0);
  if (fields.length === 0) return outcome;
  const verified = ctx.customerId !== GUEST_ID;
  const notices = fields.map((field) => {
    // SECURITY: the secure form route refuses guests, so a guest gets the instruction to verify instead of a dead form.
    if (!verified) return verifyFirst(ctx.language);
    if (!toolsCalled.includes(FORM_TOOL[field])) {
      emitAgentEvent(ctx.threadId, { kind: "widget", widget: { type: "secure-form", field, ...SECURE_FORMS[field] } });
    }
    return useForm(ctx.language, WHAT[field]);
  });
  const paragraphs = [outcome.reply, ...new Set(notices)].filter(Boolean);
  return { ...outcome, reply: paragraphs.join("\n\n") };
}
