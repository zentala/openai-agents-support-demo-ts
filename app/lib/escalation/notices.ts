/**
 * Fixed customer-facing sentences for events that code (not the model) announces:
 * an automatic escalation, a consultant joining, a consultant handing back.
 *
 * They are templates, not model output, so they are predictable and reviewable. The language is the
 * customer's profile language; unknown languages fall back to English.
 */
type Language = "pl" | "en" | "de";

export const pick = (language: string | undefined, texts: Record<Language, string>): string =>
  texts[language === "pl" || language === "de" ? language : "en"];

/** A capability, not a promised response or a scheduled outbound contact. */
export const escalationNextStep = (language: string | undefined): string =>
  pick(language, {
    pl: "Konsultant może przejąć tę rozmowę i odpowiedzieć tutaj. Możesz zostawić ten czat otwarty.",
    en: "A consultant can take over this conversation and reply here. You can keep this chat open.",
    de: "Ein Mitarbeiter kann dieses Gespräch übernehmen und hier antworten. Sie können diesen Chat geöffnet lassen.",
  });

export const escalationNotice = (language: string | undefined, ticketId: string): string =>
  pick(language, {
    pl: `Twoja sprawa jest w kolejce konsultanta (zgłoszenie ${ticketId}).`,
    en: `Your case is in the consultant queue (ticket ${ticketId}).`,
    de: `Ihr Anliegen steht in der Warteschlange für einen Mitarbeiter (Ticket ${ticketId}).`,
  }) + ` ${escalationNextStep(language)}`;

export const alreadyEscalatedNotice = (language: string | undefined, ticketId: string): string =>
  pick(language, {
    pl: `Twoja sprawa jest już w kolejce konsultanta (zgłoszenie ${ticketId}).`,
    en: `Your case is already in the consultant queue (ticket ${ticketId}).`,
    de: `Ihr Anliegen steht bereits in der Warteschlange für einen Mitarbeiter (Ticket ${ticketId}).`,
  }) + ` ${escalationNextStep(language)}`;

export const joinedNotice = (language: string | undefined, consultant: string): string =>
  pick(language, {
    pl: `Do rozmowy dołączył konsultant: ${consultant}.`,
    en: `A human colleague joined the conversation: ${consultant}.`,
    de: `Ein Mitarbeiter ist dem Gespräch beigetreten: ${consultant}.`,
  });

export const handedBackNotice = (language: string | undefined): string =>
  pick(language, {
    pl: "Konsultant zakończył rozmowę. Znów pomaga Ci asystent.",
    en: "The human colleague has left the conversation. The assistant is helping you again.",
    de: "Der Mitarbeiter hat das Gespräch beendet. Der Assistent hilft Ihnen wieder.",
  });
