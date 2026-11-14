/** Shared public catalog for start and menu; no seeded/private setup is runnable from either surface. */
import { menuScenarios, SCENARIO_CATEGORIES, type Scenario } from "@/lib/eval/scenarios";
import { decideEscalation } from "@/lib/escalation/rules";
import { normalizeInput } from "@/lib/guardrails/normalize-input";

/** Claim no AI work only when every scripted turn takes the existing early deterministic rule path. */
export const isRuleOnlyScenario = (scenario: Scenario): boolean => [scenario.message, ...(scenario.followUps ?? [])]
  .every((text) => decideEscalation({ text: normalizeInput(text).text, guardrailTrips: 0, toolErrors: 0 }).escalate);

export const highlightedScenarios = ["human-request", "iphone-signature", "german-returns"]
  .map((id) => menuScenarios.find((scenario) => scenario.id === id)!);

export const scenarioGroups = SCENARIO_CATEGORIES.map((category) => ({ category,
  scenarios: menuScenarios.filter((scenario) => scenario.category === category)
    .sort((a, b) => Number(isRuleOnlyScenario(b)) - Number(isRuleOnlyScenario(a))),
}));
