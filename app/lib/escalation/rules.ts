/**
 * Escalation rules as a PURE function: signals in, decision out. No I/O, no model.
 *
 * Why this exists: the prompt tells the agent "escalate when the customer is upset", but a prompt is
 * the soft layer and a model can forget. These rules run in CODE on every turn, so a legal threat, a
 * GDPR request or an explicit "I want a human" always ends with a ticket for a person.
 *
 * INTERVIEW: "Escalation is enforced in code, not only by the prompt - and the rules are a pure,
 * unit-tested function, so I can show exactly which words and counters trigger it."
 */

/** Two tripped guardrails in one conversation: the customer is fighting the bot or probing it. */
export const GUARDRAIL_TRIP_LIMIT = 2;
/** Two failed tool calls in one conversation: the system, not the customer, is the problem. */
export const TOOL_ERROR_LIMIT = 2;

export type EscalationReason = "legal_or_gdpr" | "human_requested" | "guardrail_trips" | "tool_errors";

export type EscalationSignals = {
  /** The customer's latest message (empty when only the counters should be judged). */
  text: string;
  /** Turns of this conversation that ended in a guardrail tripwire. */
  guardrailTrips: number;
  /** Tool failures seen in this conversation. */
  toolErrors: number;
};

export type EscalationDecision = { escalate: false } | { escalate: true; reason: EscalationReason; detail: string };

/**
 * Keyword lists in Polish, English and German. Stems (`cz[łl]owiek\w*`) catch inflected forms such as
 * "z człowiekiem". `\b` is ASCII-only in JavaScript, so it is used only before plain letters.
 */
const LEGAL_PATTERNS: RegExp[] = [
  /\bsue\b/, /\blawyers?\b/, /\battorney\b/, /\bgdpr\b/, /\brodo\b/,
  /delete\s+(all\s+)?(of\s+)?my\s+(personal\s+)?data/,
  /\bpozew\w*/, /\bpozw[ęe]\b/, /\bprawnik\w*/,
  /usu[nń]\s+(wszystkie\s+)?moje\s+(dane|danych)/,
  /\banw[aä]lt\w*/, /\bdatenschutz\w*/, /\bverklag\w*/,
];

/**
 * REQUEST phrases, not bare words: "human error" or "the human resources team" must not open a ticket.
 * Each pattern needs a verb or preposition that asks for a person ("talk to", "want", "z człowiekiem",
 * "mit einem Menschen"). `konsultant` is kept bare: in a support chat it is virtually always a request.
 */
const PERSON = String.raw`(?:human|person|people|consultant|agent|representative|manager|operator|someone|somebody)`;
const HUMAN_PATTERNS: RegExp[] = [
  new RegExp(String.raw`\b(?:talk|speak|chat)\s+(?:to|with)\s+(?:a\s+|an\s+|the\s+|your\s+)?(?:real\s+|live\s+)?${PERSON}\b`),
  new RegExp(String.raw`\b(?:want|need|get|give|connect|transfer|put)\s+(?:me\s+)?(?:to\s+|through\s+to\s+|with\s+)?(?:a\s+|an\s+|the\s+)?(?:real\s+|live\s+)?(?:human|person|consultant|representative)\b`),
  /\breal\s+(?:person|human)\b/,
  /\b(?:a|an)\s+(?:real\s+|live\s+)?human\b(?!\s+(?:error|mistake|being|resource|touch))/,
  /\bhuman\s+(?:agent|colleague|support|operator)\b/,
  /\b(?:z|do|poprosz\w*|chc\w*|potrzebuj\w*)\s+(?:prawdziw\w+\s+)?cz[łl]owiek\w*/,
  /\bkonsultant\w*/,
  /\bprawdziw\w+\s+osob\w*/,
  /\bmit\s+(?:einem|einer|dem|der)\s+(?:echten\s+|richtigen\s+)?(?:mensch\w*|mitarbeiter\w*|berater\w*)/,
  /\b(?:ein|einen)\s+(?:echten\s+|richtigen\s+)?(?:mensch|menschen|mitarbeiter)\b/,
  /\bechte[nr]?\s+mensch\w*/,
];

const firstMatch = (patterns: RegExp[], text: string): string | undefined => {
  for (const pattern of patterns) {
    const found = pattern.exec(text);
    if (found) return found[0];
  }
  return undefined;
};

// INTERVIEW: order matters. A legal threat outranks "I want a human" because it needs a person AND a record.
export function decideEscalation({ text, guardrailTrips, toolErrors }: EscalationSignals): EscalationDecision {
  const lowered = text.toLowerCase();
  const legal = firstMatch(LEGAL_PATTERNS, lowered);
  if (legal) return { escalate: true, reason: "legal_or_gdpr", detail: `legal/GDPR term "${legal}"` };
  const human = firstMatch(HUMAN_PATTERNS, lowered);
  if (human) return { escalate: true, reason: "human_requested", detail: `asked for a person ("${human}")` };
  if (guardrailTrips >= GUARDRAIL_TRIP_LIMIT) {
    return { escalate: true, reason: "guardrail_trips", detail: `${guardrailTrips} guardrail trips in this conversation` };
  }
  if (toolErrors >= TOOL_ERROR_LIMIT) {
    return { escalate: true, reason: "tool_errors", detail: `${toolErrors} tool errors in this conversation` };
  }
  return { escalate: false };
}
