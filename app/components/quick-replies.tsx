"use client";

/** Customer choices from a server-owned offer. Only a click sends; old/thread-switched choices stay disabled. */
import { useRef, useState } from "react";
import type { QuickReplyWidget } from "@/lib/types";
import type { WidgetActions } from "./widget-actions";

export function QuickReplies({ widget, active, actions }: { widget: QuickReplyWidget; active: boolean; actions: WidgetActions }) {
  const sent = useRef(false);
  const [chosen, setChosen] = useState(false);
  const disabled = !active || widget.threadId !== actions.threadId || chosen;
  const choose = (decision: "yes" | "no") => {
    if (disabled || sent.current) return;
    sent.current = true; setChosen(true);
    actions.onSend(decision === "yes" ? widget.yes : widget.no, { type: "quick-reply", offerId: widget.offerId, decision });
  };
  return <div data-testid="quick-replies" className="w-full space-y-2 py-2 text-sm">
    <p className="wrap-anywhere text-zinc-900">{widget.prompt}</p>
    <div className="flex flex-wrap gap-2">{(["yes", "no"] as const).map((decision) => <button key={decision} type="button"
      data-testid={`quick-reply-${decision}`} disabled={disabled} onClick={() => choose(decision)}
      className="min-h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium hover:bg-gray-100 disabled:opacity-50">
      {widget[decision]}
    </button>)}</div>
  </div>;
}
