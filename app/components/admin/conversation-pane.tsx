"use client";

/**
 * Right side of the console: one conversation. Transcript, takeover controls, a reply box that works
 * only while this consultant has taken the conversation over, and ratings under agent answers.
 */
import { formatTime } from "@/lib/client/format-time";
import { MessagesSquare } from "lucide-react";
import { useState } from "react";
import type { ThreadView } from "@/lib/admin/types";
import type { TranscriptEntry } from "@/lib/runtime/threads";
import { Badge } from "../ui/badge";
import { handlerDescription } from "@/lib/client/handler-description";
import { RatingControls } from "./rating-controls";

type Props = {
  thread: ThreadView | null;
  ticketId?: string;
  ticketNumber?: string;
  consultant: string;
  acting: boolean;
  onTakeOver: () => void;
  onHandBack: () => void;
  onReply: (text: string) => Promise<boolean>;
  onRate: (entryId: string, rating: "up" | "down", correction: string) => void;
};

const BUBBLE: Record<TranscriptEntry["role"], string> = {
  customer: "self-start bg-gray-100 text-zinc-900",
  agent: "self-end bg-gray-100 text-zinc-900",
  consultant: "self-end bg-emerald-100 text-zinc-900",
  system: "self-center bg-transparent text-xs italic text-zinc-600",
};

const labelOf = (e: TranscriptEntry): string =>
  e.role === "consultant" ? `Human colleague ${e.author}` : e.role === "customer" ? "Customer" : e.role === "agent" ? "Agent" : "";

function ReplyBox({ enabled, onReply }: { enabled: boolean; onReply: (text: string) => Promise<boolean> }) {
  const [text, setText] = useState("");
  const send = async () => {
    if (await onReply(text)) setText("");
  };
  return (
    <div className="flex gap-2 border-t border-gray-200 p-3">
      <input
        data-testid="reply-input"
        value={text}
        disabled={!enabled}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && text.trim() && void send()}
        placeholder={enabled ? "Reply to the customer" : "Take over the conversation to reply"}
        aria-label="Consultant reply"
        className="h-10 min-w-0 flex-1 rounded-md border border-gray-300 px-3 text-sm disabled:bg-gray-100"
      />
      <button data-testid="reply-send" disabled={!enabled || !text.trim()} onClick={() => void send()} className="h-10 rounded-md bg-blue-600 hover:bg-blue-700 px-4 text-sm font-medium text-white disabled:opacity-50">
        Send
      </button>
    </div>
  );
}

export function ConversationPane({ thread, ticketId, ticketNumber, consultant, acting, onTakeOver, onHandBack, onReply, onRate }: Props) {
  if (!thread) {
    return (
      <p className="text-sm text-zinc-700" data-testid="conversation-empty">
        Open a ticket to see its conversation.
      </p>
    );
  }
  const handler = thread.takeover.status === "human" ? thread.takeover.consultant : undefined;
  const human = handler !== undefined;
  const mine = handler === consultant;
  return (
    <div className="flex min-w-0 flex-1 flex-col rounded-xl bg-white shadow-sm" data-testid="conversation-pane" data-handler={human ? "human" : "agent"}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 p-3">
        <MessagesSquare className="h-4 w-4 text-blue-600" />
        <span className="font-semibold">{thread.customerName}</span>
        {ticketNumber && <span data-testid="conversation-ticket" className="font-mono font-semibold">Ticket {ticketNumber}</span>}
        <Badge className="max-w-full whitespace-normal rounded-md!" tone={human || ticketId ? "amber" : "blue"}>{handlerDescription(human ? "human" : "agent", handler, ticketId)}</Badge>
        <div className="ml-auto flex gap-2">
          <button data-testid="take-over-button" disabled={acting || human} onClick={onTakeOver} className="min-h-10 rounded-md bg-blue-600 hover:bg-blue-700 px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50">
            Take over
          </button>
          <button data-testid="hand-back-button" disabled={acting || !mine} onClick={onHandBack} className="min-h-10 rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium disabled:opacity-50">
            Hand back
          </button>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-gray-50/50 p-4" data-testid="transcript">
        {thread.transcript.map((e) => (
          <div key={e.id} data-testid={`transcript-${e.role}`} className={`flex max-w-[85%] flex-col ${BUBBLE[e.role].includes("self-end") ? "items-end self-end" : e.role === "system" ? "self-center" : "self-start"}`}>
            {labelOf(e) && <span className="mb-0.5 text-xs text-zinc-600">{labelOf(e)} - {formatTime(e.ts)}</span>}
            <div className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm ${BUBBLE[e.role]}`}>{e.text}</div>
            {e.role === "agent" && (
              <RatingControls rated={thread.ratings[e.id]} disabled={acting} onRate={(rating, correction) => onRate(e.id, rating, correction)} />
            )}
          </div>
        ))}
      </div>
      <ReplyBox enabled={mine && !acting} onReply={onReply} />
    </div>
  );
}
