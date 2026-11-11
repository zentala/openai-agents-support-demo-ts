/**
 * Layer 1 of defense in depth: clean the user's text BEFORE any model sees it.
 *
 * This is a plain function, not an SDK feature. It removes noise that confuses
 * models (mail signatures, quoted replies) and hiding places for attacks
 * (zero-width characters) and sensitive data (card numbers, bank accounts, phone numbers: those belong in the
 * secure form, never in a prompt). Whatever it removes is reported
 * to the Agent View panel, so the cleanup is visible, not silent.
 */
import { MAX_INPUT_LENGTH } from "@/lib/config";
import { maskIbans, maskPhones } from "@/lib/sensitive/mask";
import { maskCardNumbers } from "./pii";

export type NormalizedInput = {
  text: string;
  stripped: string[];
  /** How many bank account / phone numbers were masked: the turn flow shows the secure form for them. */
  sensitive: { iban: number; phone: number };
};

export type MaskedText = { text: string; notes: string[]; sensitive: NormalizedInput["sensitive"] };

/**
 * Masks bank accounts, card numbers and phone numbers. Order matters: account numbers first (26 digits),
 * then cards (Luhn), then phones (9-15 digits), so one kind is not read as another.
 * Also used to build the "before" text of the panel's cleanup card, which must not show the raw number either.
 */
export function maskSensitiveText(input: string): MaskedText {
  let text = input;
  const notes: string[] = [];
  const counts = { iban: 0, phone: 0 };
  const steps = [
    { mask: maskIbans, label: "bank account number(s) masked", kind: "iban" as const },
    { mask: maskCardNumbers, label: "card number(s) masked", kind: undefined },
    { mask: maskPhones, label: "phone number(s) masked", kind: "phone" as const },
  ];
  for (const { mask, label, kind } of steps) {
    const masked = mask(text);
    if (masked.count === 0) continue;
    text = masked.text;
    notes.push(`${masked.count} ${label}`);
    if (kind) counts[kind] += masked.count;
  }
  return { text, notes, sensitive: counts };
}

// SECURITY: invisible characters can hide instructions from human reviewers.
// Zero-width spaces/joiners, bidi controls, word joiner, BOM.
const INVISIBLE_RANGES: [number, number][] = [
  [0x00ad, 0x00ad], // soft hyphen
  [0x034f, 0x034f], // combining grapheme joiner
  [0x061c, 0x061c], // Arabic letter mark
  [0x180e, 0x180e], // Mongolian vowel separator
  [0x200b, 0x200f], // zero-width space/joiners, LRM/RLM
  [0x202a, 0x202e], // bidi embedding and override controls
  [0x2060, 0x2064], // word joiner and invisible operators
  [0xfe00, 0xfe0f], // variation selectors
  [0xfeff, 0xfeff], // byte order mark
];
const INVISIBLE = new RegExp(
  `[${INVISIBLE_RANGES.map(([from, to]) => String.fromCharCode(from) + "-" + String.fromCharCode(to)).join("")}]`,
  "g",
);

const SIGNATURE_LINE =
  /^\s*(sent from my (iphone|ipad|android|galaxy|phone)\b.*|wysłan[eay] z (mojego )?(iphone|ipad|androida|telefonu).*|get outlook for .*)$/i;

const QUOTE_HEADER = /^\s*(on .{5,200} wrote:|w dniu .{5,200} (napisał|napisała|napisał\(a\)):|am .{5,200} schrieb .*:)\s*$/i;

/** Removes zero-width and bidi characters. Also used before masking for the panel's "before" text. */
export const stripInvisible = (text: string): string => text.replace(INVISIBLE, "");

// INTERVIEW: cheap deterministic cleanup first; it also removes hiding places for prompt injection.
export function normalizeInput(raw: string, maxLength: number = MAX_INPUT_LENGTH): NormalizedInput {
  const stripped: string[] = [];
  let text = raw;

  const invisibleCount = text.match(INVISIBLE)?.length ?? 0;
  if (invisibleCount > 0) {
    text = stripInvisible(text);
    stripped.push(`${invisibleCount} invisible character(s)`);
  }

  const kept: string[] = [];
  let signatures = 0;
  let quoted = 0;
  for (const line of text.split(/\r?\n/)) {
    if (SIGNATURE_LINE.test(line)) signatures++;
    else if (QUOTE_HEADER.test(line) || line.trimStart().startsWith(">")) quoted++;
    else kept.push(line);
  }
  if (signatures > 0) stripped.push(`${signatures} mail signature line(s)`);
  if (quoted > 0) stripped.push(`${quoted} quoted reply line(s)`);
  text = kept.join("\n").replace(/\n{3,}/g, "\n\n").trim();

  // INTERVIEW: sensitive values are masked BEFORE the model; the secure form is the only way in.
  const masked = maskSensitiveText(text);
  text = masked.text;
  stripped.push(...masked.notes);

  if (text.length > maxLength) {
    stripped.push(`truncated from ${text.length} to ${maxLength} characters`);
    text = text.slice(0, maxLength);
  }
  return { text, stripped, sensitive: masked.sensitive };
}
