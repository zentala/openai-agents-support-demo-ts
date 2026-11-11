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

export const escalationNotice = (language: string | undefined, ticketId: string): string =>
  pick(language, {
    pl: `Przekazałem Twoją sprawę konsultantowi (zgłoszenie ${ticketId}). Skontaktuje się z Tobą tak szybko, jak to możliwe.`,
    en: `I have passed your case to a human colleague (ticket ${ticketId}). They will contact you as soon as possible.`,
    de: `Ich habe Ihr Anliegen an einen Mitarbeiter weitergeleitet (Ticket ${ticketId}). Er meldet sich so bald wie möglich.`,
  });

export const alreadyEscalatedNotice = (language: string | undefined, ticketId: string): string =>
  pick(language, {
    pl: `Twoja sprawa jest już u konsultanta (zgłoszenie ${ticketId}). Odezwie się do Ciebie.`,
    en: `Your case is already with a human colleague (ticket ${ticketId}). They will get back to you.`,
    de: `Ihr Anliegen liegt bereits bei einem Mitarbeiter (Ticket ${ticketId}). Er meldet sich bei Ihnen.`,
  });

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
