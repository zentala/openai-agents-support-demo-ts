"use client";

/** Compact, accessible event narrative. Status words carry meaning alongside the existing colors. */
import { formatTime } from "@/lib/client/format-time";
import { Badge } from "./ui/badge";
import { turnTrace } from "@/lib/client/turn-trace";
import type { AgentEvent } from "@/lib/types";
const tones = { passed: "border-transparent bg-white text-zinc-900", failed: "border-red-300 bg-red-50 text-red-900", waiting: "border-amber-300 bg-amber-50 text-amber-900", skipped: "border-transparent bg-white text-zinc-700" };
const badgeTones = { passed: "green", failed: "red", waiting: "amber", skipped: "grey" } as const;

export function TurnTrace({ events, replySent }: { events: AgentEvent[]; replySent: boolean }) {
  const rows = turnTrace(events, replySent);
  return <section data-testid="turn-trace" className="mb-5">
    <h2 className="mb-3 text-lg font-semibold">Current turn</h2>
    {!rows.length && <p className="text-sm text-zinc-600">Send a message to follow its path through the agent.</p>}
    <ol className={rows.length ? "space-y-1 rounded-lg border border-gray-200 bg-white p-2 shadow-sm" : ""} aria-label="Current turn steps">
      {rows.map((r) => <li key={r.id} data-status={r.status} className={`flex items-start gap-3 rounded-md border p-2 text-sm ${tones[r.status]}`}>
        <time className="shrink-0 text-xs tabular-nums" dateTime={new Date(r.ts).toISOString()}>{formatTime(r.ts)}</time>
        <div className="min-w-0 break-words"><p className="font-semibold">{r.label}</p><p>{r.detail}</p></div>
        <Badge className="ml-auto shrink-0" tone={badgeTones[r.status]}>{r.status}</Badge>
      </li>)}
    </ol>
  </section>;
}
