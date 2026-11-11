"use client";

/**
 * The message input + send button. Owns the draft text so typing does not
 * re-render the rest of the page.
 */
import type { ReactNode } from "react";
import { Send } from "lucide-react";
import { useState } from "react";

type Props = { scenarios: ReactNode; busy: boolean; onSend: (text: string) => void };

export function Composer({ busy, onSend, scenarios }: Props) {
  const [draft, setDraft] = useState("");

  const submit = () => {
    if (!draft.trim() || busy) return;
    onSend(draft.trim());
    setDraft("");
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
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Type your message..."
        aria-label="Message"
        className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-sm"
      />
      <button data-testid="send-button" type="submit" disabled={busy} className="h-10 rounded-md bg-blue-600 hover:bg-blue-700 px-3 text-white disabled:opacity-50" aria-label="Send">
        <Send className="h-4 w-4" />
      </button>
    </form>
  );
}
