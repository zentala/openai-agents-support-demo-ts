/** One visible author treatment shared by customer chat and the consultant transcript. */
import { Cog, Sparkles, Ticket, UserRound } from "lucide-react";
import type { CustomerMessage } from "@/lib/message-kinds";
import { ticketBadgeStatus, type TicketContext } from "@/lib/client/ticket-status";
import { CitationText } from "./kb-sources";

export function MessageContent({ text, sender, customer = false, ticket }: CustomerMessage & { customer?: boolean; ticket?: TicketContext }) {
  if (sender.kind === "system" && sender.notice) return <p data-testid="message-system" data-message-kind="system"
    className="flex w-full items-center justify-center gap-2 text-center text-xs text-zinc-600 before:h-px before:flex-1 before:bg-gray-200 after:h-px after:flex-1 after:bg-gray-200">
    <UserRound aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />{text}</p>;
  if (sender.kind === "system") return <AutomaticStep text={text} sender={sender} ticket={ticket} />;
  const human = sender.kind === "human";
  return <div data-message-kind={sender.kind} className={`flex w-full flex-col ${customer ? "items-end" : "items-start"}`}>
    {!customer && <span className={`mb-0.5 inline-flex items-center gap-1.5 text-xs font-medium ${human ? "text-emerald-700" : "text-blue-600"}`}>
      {human ? <UserRound aria-hidden="true" className="h-3.5 w-3.5" /> : <Sparkles aria-hidden="true" className="h-3.5 w-3.5" />}
      {human ? `${sender.name ?? "Consultant"} · human` : "AI assistant"}
    </span>}
    <div data-testid={customer ? "message-user" : human ? "message-consultant" : "message-assistant"}
      className={`max-w-[85%] whitespace-pre-wrap text-base text-zinc-900 ${customer ? "rounded-2xl bg-gray-100 px-3 py-2" : human ? "rounded-2xl bg-emerald-100 px-3 py-2" : "py-2"}`}>
      {customer ? text : <CitationText text={text} />}
    </div>
  </div>;
}

function AutomaticStep({ text, sender, ticket }: CustomerMessage & { ticket?: TicketContext }) {
  return <div data-testid="message-automatic" data-message-kind="system"
    className="@container mx-auto grid w-full min-w-0 grid-cols-[32px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1 rounded-[10px] border border-gray-200 bg-gray-50 p-3 text-sm">
    <span className="row-span-2 grid size-8 place-items-center rounded-lg bg-amber-100 text-amber-700"><Ticket aria-hidden="true" className="size-[18px]" /></span>
    <div className="flex min-w-0 items-center gap-2 @max-[29rem]:flex-wrap">
      <span className="whitespace-nowrap text-[15px] font-semibold text-zinc-900">{sender.title ?? "Automatic step"}</span>
      {sender.ticketId && <span data-testid="message-ticket" className="inline-flex max-w-full overflow-hidden rounded-md border border-amber-300 text-xs leading-5">
        <span className="inline-flex items-center gap-1 bg-amber-200 px-1.5 font-medium text-amber-900"><Ticket aria-hidden="true" className="size-3" />Ticket</span>
        <span className="border-l border-amber-300 bg-amber-50 px-1.5 font-mono text-zinc-900">{sender.ticketId}</span>
        <span className="border-l border-amber-300 bg-amber-100 px-1.5 text-amber-800">{ticketBadgeStatus(sender.ticketId, ticket)}</span>
      </span>}
      <span className="ml-auto inline-flex items-center gap-1 whitespace-nowrap rounded-md border border-gray-200 bg-gray-100 px-1.5 text-xs leading-5 text-zinc-600"><Cog aria-hidden="true" className="size-3" />Automatic step</span>
    </div>
    <p className="min-w-0 whitespace-pre-wrap wrap-anywhere text-zinc-600">{text}</p>
  </div>;
}
