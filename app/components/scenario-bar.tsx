"use client";

/** Radix supplies menu roles, focus return, keyboard navigation and collision-aware positioning. */
import { ListVideo } from "lucide-react";
import * as Menu from "@radix-ui/react-dropdown-menu";
import { useRef, useState } from "react";
import { menuScenarios, type Scenario } from "@/lib/eval/scenarios";
import { ScenarioOptions } from "./scenario-options";

export function ScenarioBar({ busy, onRun }: { busy: boolean; onRun: (scenario: Scenario) => void }) {
  const [error, setError] = useState<string>();
  const trigger = useRef<HTMLButtonElement>(null);
  const [topPadding, setTopPadding] = useState(12);
  const locateHeader = (open: boolean) => {
    if (!open) return;
    const header = trigger.current?.closest('[data-testid="customer-view"]')?.querySelector('[data-testid="customer-header"]');
    setTopPadding(Math.max(12, (header?.getBoundingClientRect().bottom ?? 4) + 8));
  };
  const reset = async () => {
    try {
      const response = await fetch("/api/reset", { method: "POST" });
      if (!response.ok) throw new Error(`Reset refused: HTTP ${response.status}`);
      setError(undefined);
    } catch (e) { setError(e instanceof Error ? e.message : String(e)); }
  };
  return <div className="shrink-0" data-testid="scenario-bar">
    <Menu.Root onOpenChange={locateHeader}>
      <Menu.Trigger ref={trigger} disabled={busy} aria-label="Scenarios" aria-describedby="scenario-catalog-count" className="flex h-10 min-w-10 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-2 sm:px-3 text-sm font-medium hover:bg-blue-50 disabled:opacity-50" data-testid="scenario-menu-trigger">
        <ListVideo aria-hidden="true" className="h-4 w-4" /><span className="hidden sm:inline">Scenarios</span>
        <span aria-hidden="true" className="rounded-full bg-gray-100 px-1.5 text-xs font-medium tabular-nums text-zinc-700">{menuScenarios.length}</span>
        <span id="scenario-catalog-count" className="sr-only">{menuScenarios.length} available scenarios</span>
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content side="top" align="start" sideOffset={8} collisionPadding={{ top: topPadding, bottom: 12, left: 12, right: 12 }} className="scenario-menu z-50 max-h-[min(60svh,var(--radix-dropdown-menu-content-available-height))] w-80 max-w-[calc(100vw-24px)] overflow-hidden rounded-lg border border-gray-200 bg-white text-zinc-900 shadow-xl shadow-gray-400/40" aria-label="Scenarios">
          <ScenarioOptions busy={busy} onRun={onRun} onReset={() => void reset()} />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
    {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
  </div>;
}
