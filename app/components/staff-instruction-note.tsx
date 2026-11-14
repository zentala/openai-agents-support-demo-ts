/** Private staff guidance, shared by the inspector and consultant conversation views. */
import type { StaffInstruction } from "@/lib/types";

export function StaffInstructionNote({ instruction }: { instruction?: StaffInstruction | null }) {
  if (!instruction) return null;
  return <aside role="note" aria-label="Staff instruction" data-testid="staff-instruction"
    className="rounded-md border border-gray-200 bg-gray-50 p-3 text-sm text-zinc-700">
    <p className="font-semibold text-zinc-900">Note for the agent</p>
    <p className="mt-1 whitespace-pre-wrap break-words">{instruction.text}</p>
    <p className="mt-1 text-xs text-zinc-600">{instruction.consultant} · this conversation only</p>
  </aside>;
}
