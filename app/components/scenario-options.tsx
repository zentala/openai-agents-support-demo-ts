"use client";

/** Radix items keep keyboard behavior; a separate scroll box leaves edge hints fixed over its content. */
import * as Menu from "@radix-ui/react-dropdown-menu";
import { useVisitorKey } from "./visitor-key";
import { useCallback, useState } from "react";
import { displayScenarioLabel, type Scenario } from "@/lib/eval/scenarios";
import { isRuleOnlyScenario, scenarioGroups } from "@/lib/client/scenario-catalog";
import { ScenarioCategoryIcon } from "./scenario-category-icon";
const itemClass = "min-h-10 cursor-pointer rounded-md px-3 py-2 text-sm outline-none hover:bg-blue-50 focus:bg-blue-50 data-[highlighted]:bg-blue-50 data-[disabled]:opacity-50";

export function ScenarioOptions({ busy, onRun, onReset }: { busy: boolean; onRun: (scenario: Scenario) => void; onReset: () => void }) {
  const { allowReset } = useVisitorKey();
  const [edges, setEdges] = useState({ top: false, bottom: false });
  const measure = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const next = { top: node.scrollTop > 1, bottom: node.scrollTop + node.clientHeight < node.scrollHeight - 1 };
    setEdges((previous) => previous.top === next.top && previous.bottom === next.bottom ? previous : next);
  }, []);
  const observe = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    measure(node);
    // Radix sets the available height after mounting. Remeasure that resize, not just user scrolling.
    const observer = new ResizeObserver(() => measure(node));
    observer.observe(node);
    // React 19 calls this ref cleanup on unmount, so a closed menu retains no observer.
    return () => observer.disconnect();
  }, [measure]);
  return <div className="relative" style={{ maxHeight: "inherit" }}>
    <div data-testid="scenario-scroll" ref={observe} onScroll={(e) => measure(e.currentTarget)} className="overflow-y-auto p-2" style={{ maxHeight: "inherit" }}>
      {scenarioGroups.map(({ category, scenarios }, index) => <Menu.Group key={category} aria-label={category}>
        <Menu.Label className={`flex items-center gap-2 px-3 pb-2 pt-3 text-sm font-semibold text-zinc-800 ${index > 0 ? "mt-3 border-t border-gray-300" : ""}`}><ScenarioCategoryIcon category={category} />{category}</Menu.Label>
        {scenarios.map((scenario) => <Menu.Item key={scenario.id} data-testid={`scenario-${scenario.id}`} disabled={busy} onSelect={() => onRun(scenario)} className={itemClass}>
          {displayScenarioLabel(scenario.label)}{isRuleOnlyScenario(scenario) && <span className="ml-2 text-xs text-zinc-600">No AI needed</span>}
        </Menu.Item>)}
      </Menu.Group>)}
      {allowReset && <><Menu.Separator className="my-2 h-px bg-gray-200" />
      <Menu.Item disabled={busy} onSelect={onReset} className={itemClass} data-testid="reset-demo-data">Reset demo data</Menu.Item></>}
    </div>
    {edges.top && <div aria-hidden="true" data-testid="scenario-scroll-top" className="pointer-events-none absolute inset-x-0 top-0 h-5 bg-linear-to-b from-gray-200/90 to-transparent" />}
    {edges.bottom && <div aria-hidden="true" data-testid="scenario-scroll-bottom" className="pointer-events-none absolute inset-x-0 bottom-0 h-5 bg-linear-to-t from-gray-200/90 to-transparent" />}
  </div>;
}
