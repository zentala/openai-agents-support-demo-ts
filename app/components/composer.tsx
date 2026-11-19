"use client";

/**
 * The message input + send button. Owns the draft text so typing does not
 * re-render the rest of the page.
 */
import type { ReactNode } from "react";
import { ProductIcon } from "./product-icon";
import { useSuggestedDraft } from "@/lib/client/use-suggested-draft";
import type { DraftSuggestion } from "@/lib/client/scenario-progress";

type Props = { scenarios: ReactNode; busy: boolean; onSend: (text: string) => void; suggestion?: DraftSuggestion };

export function Composer({ busy, onSend, scenarios, suggestion }: Props) {
  const { draft, edit, sent } = useSuggestedDraft(suggestion);

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft.trim());
    sent();
  };

  return (
    <form
      className="flex gap-2 border-t border-gray-200 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {scenarios}
      <input
        data-testid="chat-input"
        value={draft}
        onChange={(e) => edit(e.target.value)}
        placeholder="Type your message..."
        aria-label="Message"
        className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-sm"
      />
      <button data-testid="send-button" type="submit" disabled={busy} className="h-10 rounded-md bg-blue-600 hover:bg-blue-700 px-3 text-white disabled:opacity-50" aria-label="Send">
        <ProductIcon name="send" />
      </button>
    </form>
  );
}
