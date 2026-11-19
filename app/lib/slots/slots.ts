/**
 * Slot filling, the generic part: a form is a list of named slots, a draft holds the values collected so far.
 *
 * Slot filling means the agent gathers the data a form needs over several chat turns, ONE missing field at
 * a time. The slots and the draft live in CODE (here and in the run context), not in the model's memory:
 * the model cannot forget a field, invent one, or skip one, because the tool answers with exactly what is
 * still missing and what to ask next.
 *
 * Used by the damage claim (lib/claims) and the address change (lib/address). Pure, no I/O.
 */
import type { SlotView } from "@/lib/types";

export type SlotSpec = {
  key: string;
  label: string;
  /** The single question the agent asks while this slot is the first missing one. */
  question: string;
  required: boolean;
};

export type Draft = Record<string, string | undefined>;

/** Required slots without a value, in form order. */
export const missingRequired = (specs: readonly SlotSpec[], draft: Draft): SlotSpec[] =>
  specs.filter((spec) => spec.required && !draft[spec.key]);

/** The ONE slot to ask for next, or undefined when the form is complete. */
export const nextSlot = (specs: readonly SlotSpec[], draft: Draft): SlotSpec | undefined => missingRequired(specs, draft)[0];

/** What the Agent View shows: every slot as filled or missing. `hide` keeps long values (a photo id) out of the panel. */
export function slotViews(specs: readonly SlotSpec[], draft: Draft, hide: readonly string[] = []): SlotView[] {
  return specs.map((spec) => ({
    key: spec.key,
    label: spec.label,
    required: spec.required,
    filled: Boolean(draft[spec.key]),
    value: draft[spec.key] ? (hide.includes(spec.key) ? "attached" : draft[spec.key]) : undefined,
  }));
}
