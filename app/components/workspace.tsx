"use client";

/** Shared inspector workspace: preserve the demo header while the customer chat stays beside it. */
import { Bot, ExternalLink } from "lucide-react";
import { useState, type ReactNode } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import { useRouter, useSearchParams } from "next/navigation";
import { latestTrace } from "@/lib/client/selectors";
import type { AgentEvent } from "@/lib/types";
import { useAdminConsole } from "@/lib/client/use-admin-console";
import { needsHumanCount, updateBadge, type BadgeState } from "@/lib/client/consultant-badge";
import { AnnotationSettings } from "./annotations";
import { ConsultantPanel } from "./admin/consultant-panel";
import { HowItWorks } from "./how-it-works";
import type { Scenario } from "@/lib/eval/scenarios";

export function Workspace({ events, children, busy, onScenario }: { events: AgentEvent[]; children: ReactNode; busy: boolean; onScenario: (scenario: Scenario) => void }) {
  const router = useRouter();
  const params = useSearchParams();
  const selected = params.get("tab");
  const tab = selected === "consultant" || selected === "how" ? selected : "agent";
  const console = useAdminConsole();
  const count = console.state ? needsHumanCount(console.state) : null;
  const [badge, setBadge] = useState<BadgeState>({ count: null, unseen: false });
  const nextBadge = updateBadge(badge, count, tab === "consultant");
  // Adjust derived state during render to acknowledge the current count immediately on opening.
  if (nextBadge.count !== badge.count || nextBadge.unseen !== badge.unseen) setBadge(nextBadge);
  const changeTab = (value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("tab", value);
    // Next navigation preserves other query parameters and the selected conversation hash.
    router.push(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  };
  return (
    <Tabs.Root value={tab} onValueChange={changeTab} data-testid="workspace" className="order-2 flex min-h-[600px] min-w-0 flex-col rounded-xl bg-white shadow-sm lg:order-1 lg:min-h-0 lg:w-3/5">
      <header className="flex min-h-12 items-center gap-3 rounded-t-xl bg-blue-600 px-3 text-white">
        <Bot aria-hidden="true" className="h-5 w-5 shrink-0" />
        <h1 className="text-lg font-semibold">Agent View</h1>
        <a href={latestTrace(events)?.url} aria-disabled={!latestTrace(events)} tabIndex={latestTrace(events) ? 0 : -1} target="_blank" rel="noreferrer"
          className={`ml-auto inline-flex min-h-6 items-center gap-1 text-xs underline ${latestTrace(events) ? "" : "cursor-not-allowed opacity-50"}`} data-testid="open-trace">Open trace <ExternalLink aria-hidden="true" className="h-3 w-3" /></a>
        <AnnotationSettings />
        <span className="hidden shrink-0 border-l border-blue-300 pl-3 text-xs sm:inline">Nordic Home</span>
      </header>
      {/* Radix supplies tab roles, roving focus, Arrow keys and Home/End. */}
      <Tabs.List aria-label="Demo workspace" className="flex min-h-10 shrink-0 gap-1 overflow-x-auto border-b border-gray-200 bg-white px-2">
        {[["agent", "Agent"], ["consultant", "Consultant"], ["how", "How it works"]].map(([value, label]) => (
          <Tabs.Trigger key={value} value={value} className="workspace-tab min-h-10 shrink-0 whitespace-nowrap border-b-[3px] border-transparent px-2 text-sm font-semibold text-zinc-700 hover:bg-gray-100 data-[state=active]:border-blue-600 data-[state=active]:text-blue-700">
            {label}{value === "consultant" && <><span data-testid="consultant-badge" data-unseen={badge.unseen} className={`ml-1 rounded-full px-1.5 tabular-nums ${badge.unseen ? "bg-amber-100 text-amber-900" : "bg-gray-100 text-zinc-700"}`} aria-hidden="true">{count ?? "…"}</span><span className="sr-only"> {count === null ? "Human queue loading" : `${count} ${count === 1 ? "needs" : "need"} a human`}</span></>}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.Content value="agent" className="flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden">{children}</Tabs.Content>
      <Tabs.Content value="consultant" className="workspace-content min-h-0 flex-1 overflow-y-auto bg-gray-50"><ConsultantPanel c={console} /></Tabs.Content>
      <Tabs.Content value="how" className="workspace-content min-h-0 flex-1 overflow-y-auto bg-gray-50"><HowItWorks busy={busy} onScenario={onScenario} /></Tabs.Content>
    </Tabs.Root>
  );
}
