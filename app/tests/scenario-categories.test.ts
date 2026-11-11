/** Categories drive a predictable menu; seeded scenarios remain available only to the eval runner. */
import { expect, it } from "vitest";
import { displayScenarioLabel, SCENARIO_CATEGORIES, scenarios, menuScenarios, scenarioSchema } from "@/lib/eval/scenarios";
it("assigns every scenario a valid category and represents all six groups", () => {
  expect(new Set(scenarios.map((s) => s.category))).toEqual(new Set(SCENARIO_CATEGORIES));
  for (const s of scenarios) expect(SCENARIO_CATEGORIES).toContain(s.category);
  expect(scenarioSchema.safeParse({ ...scenarios[0], category: "Other" }).success).toBe(false);
  const { category: _category, ...missing } = scenarios[0];
  expect(_category).toBeDefined();
  expect(scenarioSchema.safeParse(missing).success).toBe(false);
});
it("hides every seeded scenario and keeps ordinary scenarios", () => {
  expect(menuScenarios.length).toBeLessThan(scenarios.length);
  expect(menuScenarios.every((s) => !s.seedRefunds && !s.seedSecrets)).toBe(true);
  expect(menuScenarios.some((s) => s.id === "human-request")).toBe(true);
});
it("removes fixture numbering without removing meaningful numbers in names", () => {
  expect(displayScenarioLabel("16 Asks for a human")).toBe("Asks for a human");
  expect(displayScenarioLabel("Refund above 500 PLN")).toBe("Refund above 500 PLN");
});
