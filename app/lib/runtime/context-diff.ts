/**
 * Context diff: which mutable context fields changed between two snapshots.
 * Pure and SDK-free, so the server (to emit `context_update`) and the unit tests share it.
 */
import { MUTABLE_CONTEXT_FIELDS, type ContextChange, type MutableContext } from "@/lib/types";

/**
 * Copies only the fields code may change; everything else on the context is identity and stays put.
 * The slot-filling drafts are objects: they are copied, and replaced (never edited) by the tools, so a
 * snapshot taken earlier cannot change behind our back. They are not part of the string diff below; the
 * Agent View gets their progress from `slots` events.
 */
export function pickMutable(context: MutableContext): MutableContext {
  const picked: MutableContext = {};
  for (const field of MUTABLE_CONTEXT_FIELDS) {
    if (context[field] !== undefined) picked[field] = context[field];
  }
  if (context.claimDraft) picked.claimDraft = { ...context.claimDraft };
  if (context.addressDraft) picked.addressDraft = { ...context.addressDraft };
  return picked;
}

/** Returns the changed fields, or `undefined` when nothing changed (so no event is emitted). */
export function diffContext(before: MutableContext, after: MutableContext): Record<string, ContextChange> | undefined {
  const changes: Record<string, ContextChange> = {};
  for (const field of MUTABLE_CONTEXT_FIELDS) {
    const from = before[field] ?? null;
    const to = after[field] ?? null;
    if (from !== to) changes[field] = { from, to };
  }
  return Object.keys(changes).length > 0 ? changes : undefined;
}
