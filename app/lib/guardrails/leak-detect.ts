/**
 * Output-side leak detection as a PURE function (the SDK wrapper is in
 * leak-guardrail.ts). No model is involved: deterministic checks are cheap, fast
 * and cannot be talked out of their decision.
 */
import { containsSensitive } from "@/lib/sensitive/mask";
import { findCardNumbers } from "./pii";
import { stripInvisible } from "./normalize-input";

/** Words in a row that must match the prompt to count as "prompt text". */
const SHINGLE_SIZE = 7;

export type LeakCheckInput = {
  answer: string;
  /** Full prompt texts that must never appear in an answer. */
  promptTexts: string[];
  canary: string;
  /** Names, emails and item names that belong to OTHER customers. */
  foreignSecrets: string[];
};

const words = (text: string): string[] =>
  text.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean);

function shingles(text: string): Set<string> {
  const list = words(text);
  const set = new Set<string>();
  for (let i = 0; i + SHINGLE_SIZE <= list.length; i++) {
    set.add(list.slice(i, i + SHINGLE_SIZE).join(" "));
  }
  return set;
}

export function detectLeak(input: LeakCheckInput): string[] {
  const reasons: string[] = [];
  // SECURITY: model output is untrusted too; hidden characters must not split a secret past the detectors.
  const answer = stripInvisible(input.answer);
  const lower = answer.toLowerCase();

  if (lower.includes(input.canary.toLowerCase())) reasons.push("contains the internal prompt marker");

  const answerShingles = shingles(answer);
  const promptShingles = new Set(input.promptTexts.flatMap((p) => [...shingles(p)]));
  if ([...answerShingles].some((s) => promptShingles.has(s))) {
    reasons.push(`repeats ${SHINGLE_SIZE}+ consecutive words of the system prompt`);
  }

  const foreign = input.foreignSecrets.filter((secret) => lower.includes(secret.toLowerCase()));
  if (foreign.length > 0) reasons.push("mentions data of another customer");

  if (findCardNumbers(answer).length > 0) reasons.push("contains a card number");
  const sensitive = containsSensitive(answer);
  if (sensitive.iban) reasons.push("contains a bank account number");
  if (sensitive.phone) reasons.push("contains a phone number");
  return reasons;
}
