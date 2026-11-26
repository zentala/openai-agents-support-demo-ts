/**
 * Reads whether a customer message asks for a refund or takes one back ("do not refund anything").
 * Plain code, no model: the decision stays out of the prompt (ADR 003).
 *
 * The negation must govern the refund word directly: "do not change or refund", "no refund",
 * "keine Erstattung", "refund is not needed". "I did not receive the lamp, can you refund it" and
 * "do not delay my refund" still ask for a refund. Clauses are split on punctuation and on
 * but/and/ale/aber/sondern, and a message with one asking clause and one negated clause still asks.
 */
const REFUND = String.raw`\b(?:refund\p{L}*|zwrot\p{L}*|erstat\p{L}*)\b`;
// "n't" covers don't, doesn't, can't... with a straight or curly apostrophe (iOS sends the curly one).
const NEGATOR = String.raw`(?:not|never|no|without|\p{L}*n['’]t|dont|nie|bez|nicht|kein\p{L}*|ohne)`;
const FILLER = String.raw`(?:(?:please|really|ever|even|also|bitte|prosz[ęe])\s+)*`;
const WANT = String.raw`(?:(?:want|need|wish|like|require|issue|make|process|create|r[oó]b|zr[oó]b|wystawiaj|machen|chc\p{L}*|potrzebuj\p{L}*|möchte\p{L}*|brauche\p{L}*)\s+(?:(?:to|a|an|any|the|ein\p{L}*)\s+)?)?`;
const OTHER_VERB = String.raw`(?:\p{L}+\s+(?:or|nor|oder|lub|albo)\s+)?`;
const BEFORE = new RegExp(String.raw`\b${NEGATOR}\s+${FILLER}${WANT}${OTHER_VERB}${REFUND}`, "iu");
const AFTER = new RegExp(String.raw`${REFUND}\s+(?:(?:is|are|will be|be|jest|ist|wird)\s+)?(?:not|nie|nicht|no longer)\b`, "iu");
const CLAUSE_BREAK = /[.!?;,\n]+|\s(?:but|and|however|ale|tylko|aber|sondern|und|jedoch)\s/iu;
const HAS_REFUND = new RegExp(REFUND, "iu");

export type RefundWish = "asked" | "withdrawn" | undefined;

export function refundWish(text: string): RefundWish {
  const clauses = text.split(CLAUSE_BREAK).filter((clause) => HAS_REFUND.test(clause));
  if (clauses.some((clause) => !BEFORE.test(clause) && !AFTER.test(clause))) return "asked";
  return clauses.length ? "withdrawn" : undefined;
}
