"use client";

/**
 * The message input + send button. Owns the draft text so typing does not
 * re-render the rest of the page.
 *
 * The field is a textarea, not a single-line input: browsers drop newlines when text is pasted into
 * an <input>, and customers paste whole emails (signature, quoted history). Enter sends, Shift+Enter
 * adds a line. `field-sizing-content` makes it grow from one 40px line up to max-h-40.
 */
import type { ReactNode } from "react";
import { ProductIcon } from "./product-icon";
import { useSuggestedDraft } from "@/lib/client/use-suggested-draft";
import type { DraftSuggestion } from "@/lib/client/scenario-progress";

/** Safari reports Enter that confirms an IME candidate with keyCode 229 after composition has ended. */
const IME_KEY_CODE = 229;

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
      className="flex items-end gap-2 border-t border-gray-200 p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      {scenarios}
      <textarea
        data-testid="chat-input"
        rows={1}
        enterKeyHint="send"
        value={draft}
        onChange={(e) => edit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing || e.keyCode === IME_KEY_CODE) return;
          e.preventDefault();
          submit();
        }}
        placeholder="Type your message..."
        aria-label="Message"
        className="field-sizing-content max-h-40 min-h-10 min-w-0 flex-1 resize-none rounded-md border border-gray-300 px-3 py-[9px] text-sm leading-5"
      />
      <button data-testid="send-button" type="submit" disabled={busy} className="h-10 rounded-md bg-blue-600 hover:bg-blue-700 px-3 text-white disabled:opacity-50" aria-label="Send">
        <ProductIcon name="send" />
      </button>
    </form>
  );
}
