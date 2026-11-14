"use client";

/**
 * One conversation: identity, transcript, ratings and a thread-keyed reply composer.
 * The first reply takes over in one server action; another consultant's thread stays read-only.
 */
import { formatTime } from "@/lib/client/format-time";
import { MessagesSquare } from "lucide-react";
import type { ActionResponse, ThreadView } from "@/lib/admin/types";
import { Badge } from "../ui/badge";
import { handlerDescription } from "@/lib/client/handler-description";
import { RatingControls } from "./rating-controls";
import { ReplyBox } from "./reply-box";
import { StaffInstructionNote } from "../staff-instruction-note";
import { OrderItems } from "../order-items";
import { MessageContent } from "../message-content";
import { senderForRole } from "@/lib/message-kinds";

type Props = {
  thread: ThreadView | null;
  ticketId?: string;
  ticketNumber?: string;
  consultant: string;
  acting: boolean;
  onHandBack: (note: string) => Promise<boolean>;
  onReply: (text: string, toneAcknowledgement?: string) => Promise<ActionResponse>;
  onRate: (entryId: string, rating: "up" | "down", correction: string) => void;
};

export function ConversationPane({ thread, ticketId, ticketNumber, consultant, acting, onHandBack, onReply, onRate }: Props) {
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
      </div>
      {thread.staffInstruction && <div className="p-3"><StaffInstructionNote instruction={thread.staffInstruction} /></div>}
      {thread.customerOrder.status === "verified" && thread.customerOrder.order && <div className="space-y-2 border-b border-gray-200 p-3 text-sm" data-testid="consultant-active-order">
        <h3 className="font-semibold">Active order #{thread.customerOrder.order.orderId}</h3>
        <OrderItems items={thread.customerOrder.order.items} currency={thread.customerOrder.order.currency} />
      </div>}
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto bg-gray-50/50 p-4" data-testid="transcript">
        {thread.transcript.map((e) => (
          <div key={e.id} data-testid={`transcript-${e.role}`} className="flex w-full flex-col gap-1">
            <span className="text-xs text-zinc-600">{formatTime(e.ts)}</span>
            <MessageContent text={e.text} sender={e.sender ?? senderForRole(e.role, e.author)} customer={e.role === "customer"} ticket={{ openTicketId: ticketId, handler: human ? "human" : "agent" }} />
            {e.role === "agent" && e.sender?.kind !== "system" && (
              <RatingControls rated={thread.ratings[e.id]} disabled={acting} onRate={(rating, correction) => onRate(e.id, rating, correction)} />
            )}
          </div>
        ))}
      </div>
      <ReplyBox key={`${thread.threadId}:${consultant}`} mine={mine} handler={handler} acting={acting} onReply={onReply} onHandBack={onHandBack} />
    </div>
  );
}
