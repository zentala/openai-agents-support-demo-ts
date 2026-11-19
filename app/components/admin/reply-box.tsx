"use client";

/**
 * Thread-keyed consultant composer: one request validates, takes over if needed, and replies.
 * The parent remounts it on conversation/consultant changes; failed requests keep the draft.
 */
import { useState } from "react";
import type { ActionResponse } from "@/lib/admin/types";
import { useReplyComposer } from "@/lib/client/use-reply-composer";
import { ProductIcon } from "../product-icon";

type Props = {
  mine: boolean; handler?: string; acting: boolean;
  onReply: (text: string, toneAcknowledgement?: string) => Promise<ActionResponse>;
  onHandBack: (note: string) => Promise<boolean>;
};

export function ReplyBox({ mine, handler, acting, onReply, onHandBack }: Props) {
  const [note, setNote] = useState("");
  const blocked = acting || (!!handler && !mine);
  const { text, warning, exclusive, edit, send } = useReplyComposer(blocked, onReply);
  const handBack = async () => {
    if (acting || !mine) return;
    await exclusive(async () => { if (await onHandBack(note)) setNote(""); });
  };
  return <div className="flex flex-wrap gap-2 border-t border-gray-200 p-3" data-testid="reply-composer">
    <input data-testid="reply-input" value={text} disabled={blocked}
      onChange={(event) => edit(event.target.value)}
      onKeyDown={(event) => { if (event.key === "Enter" && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }}
      placeholder={handler && !mine ? `Handled by ${handler}` : "Reply to the customer"}
      aria-label="Consultant reply"
      className="h-10 min-w-0 basis-full rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-100 sm:basis-0 sm:flex-1" />
    <div className="flex flex-wrap gap-2">
      <button data-testid="reply-send" disabled={blocked || !text.trim() || !!warning} onClick={() => void send()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
        <ProductIcon name={mine ? "send" : "takeOver"} />
        {mine ? "Send" : "Take over and reply"}
      </button>
      <button data-testid="hand-back-button" disabled={acting || !mine} onClick={() => void handBack()}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 px-3 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"><ProductIcon name="handBack" />Hand back</button>
    </div>
    {warning && <div role="alert" data-testid="reply-tone-warning" className="flex basis-full flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
      <p>{warning.message}</p>
      <button data-testid="reply-send-anyway" disabled={blocked} onClick={() => void send(true)}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-3 text-sm font-medium text-zinc-900 hover:bg-gray-100 disabled:opacity-50"><ProductIcon name="send" />Send anyway</button>
    </div>}
    {mine && <label className="block basis-full space-y-1 text-sm text-zinc-700">
      Note for the agent (optional)
      <input data-testid="hand-back-note" value={note} onChange={(event) => setNote(event.target.value)} disabled={acting}
        className="h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm" />
      <span className="block text-xs text-zinc-600">Only this conversation. Leave blank to clear previous guidance.</span>
    </label>}
  </div>;
}
