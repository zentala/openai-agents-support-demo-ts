"use client";

/** Compact agent-name strip; native details reveals each specialist's role without filling the panel. */
import { Bot, ChevronDown } from "lucide-react";
import { AGENT_CATALOG } from "@/lib/agents/catalog";
import { Badge } from "./ui/badge";
import { PanelSection } from "./panel-section";

export function AgentsList({ active }: { active: string }) {
  return <PanelSection title="Available Agents" icon={<Bot className="h-4 w-4 text-blue-600" />} testId="agents-list">
    <div className="flex flex-wrap items-start gap-2">
      {AGENT_CATALOG.map((agent) => <details key={agent.name} data-testid={`agent-card-${agent.name}`} data-active={active === agent.name}
        className={`group max-w-full rounded-lg border bg-white ${active === agent.name ? "border-blue-500 ring-1 ring-blue-500" : "border-gray-300"}`}>
        <summary className="flex min-h-10 cursor-pointer list-none items-center gap-2 px-3 text-sm font-medium hover:bg-gray-100">
          {agent.name}{active === agent.name && <Badge tone="blue">Active</Badge>}
          <ChevronDown aria-hidden="true" className="ml-auto h-4 w-4 -rotate-90 group-open:rotate-0" />
        </summary>
        <p data-agent-description className="max-w-64 border-t border-gray-200 p-3 text-[13px] text-zinc-700">{agent.description}</p>
      </details>)}
    </div>
  </PanelSection>;
}
