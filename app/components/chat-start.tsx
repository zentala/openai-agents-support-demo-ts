"use client";

/** Three familiar starters followed by the same public, categorized scenario catalog as the menu. */
import { displayScenarioLabel, type Scenario } from "@/lib/eval/scenarios";
import { highlightedScenarios, isRuleOnlyScenario, scenarioGroups } from "@/lib/client/scenario-catalog";
import { ScenarioCategoryIcon } from "./scenario-category-icon";

type Props = { busy: boolean; onScenario: (scenario: Scenario) => void };

export function ChatStart({ busy, onScenario }: Props) {
  return <div data-testid="chat-start" className="flex min-w-0 flex-col gap-4">
    <div className="space-y-2 text-center"><h2 className="text-lg font-semibold">How can we help?</h2>
      <p className="text-sm text-zinc-600">Ask about an order, a return or a policy.</p></div>
    <div data-testid="start-highlights" className="flex flex-col gap-2">
      {highlightedScenarios.map((scenario) => <ScenarioButton key={scenario.id} scenario={scenario} busy={busy} onScenario={onScenario} highlighted />)}
    </div>
    <div>
      <h3 id="start-categories-label" className="mb-2 text-sm font-semibold">Explore scenarios</h3>
      <div role="region" aria-labelledby="start-categories-label" tabIndex={0} data-testid="start-scenario-list"
        className="max-h-[min(18rem,45svh)] overflow-y-auto overscroll-contain">
        {scenarioGroups.map(({ category, scenarios }, index) => <section key={category} aria-label={category} className={index ? "mt-3 border-t border-gray-200 pt-3" : ""}>
          <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold"><ScenarioCategoryIcon category={category} />{category}</h4>
          <div className="space-y-1">{scenarios.map((scenario) => <ScenarioButton key={scenario.id} scenario={scenario} busy={busy} onScenario={onScenario} />)}</div>
        </section>)}
      </div>
    </div>
  </div>;
}

function ScenarioButton({ scenario, busy, onScenario, highlighted = false }: Props & { scenario: Scenario; highlighted?: boolean }) {
  return <button type="button" data-testid={`start-${highlighted ? "highlight" : "scenario"}-${scenario.id}`} disabled={busy} onClick={() => onScenario(scenario)}
    className={`flex min-h-10 w-full flex-wrap items-center gap-x-2 gap-y-1 rounded-md px-3 py-2 text-left text-sm hover:bg-gray-100 disabled:opacity-50 ${highlighted ? "border border-gray-300 bg-white font-medium" : ""}`}>
    <span className="min-w-0 wrap-anywhere">{displayScenarioLabel(scenario.label)}</span>
    {isRuleOnlyScenario(scenario) && <span className="text-xs font-normal text-zinc-600">No AI needed</span>}
  </button>;
}
