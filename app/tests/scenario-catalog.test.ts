/** Start/menu catalog keeps public scenarios, plain labels, three highlights and honest rule-only hints. */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, expect, it, vi } from "vitest";
import { ChatStart } from "@/components/chat-start";
import { highlightedScenarios, isRuleOnlyScenario, scenarioGroups } from "@/lib/client/scenario-catalog";
import { menuScenarios, scenarios } from "@/lib/eval/scenarios";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, removeThread } from "@/lib/runtime/threads";
import { clearEventLog } from "@/lib/runtime/event-bus";
import { resetDemoData } from "@/lib/data/store";

const model = vi.hoisted(() => ({ run: vi.fn() }));
vi.mock("@/lib/runtime/run-support", () => ({ executeSupportRun: model.run }));
const { handleUserMessage } = await import("@/lib/runtime/turn");
afterEach(() => { vi.unstubAllEnvs(); resetDemoData(); clearEventLog(); });

it("covers the public catalog exactly once across nonempty categories and retains three highlighted actions", () => {
  const listed = scenarioGroups.flatMap((group) => group.scenarios.map((scenario) => scenario.id));
  expect(new Set(listed).size).toBe(menuScenarios.length);
  expect(listed.sort()).toEqual(menuScenarios.map((scenario) => scenario.id).sort());
  expect(scenarioGroups.every((group) => group.scenarios.length > 0)).toBe(true);
  expect(highlightedScenarios.map((scenario) => scenario.id)).toEqual(["human-request", "iphone-signature", "german-returns"]);
  expect(scenarios.find((scenario) => scenario.id === "kb-unknown-yes")?.label).toBe("Unknown answer, then accept escalation");
});
it("renders accessible categories and every public example without exposing eval-only setup", () => {
  const html = renderToStaticMarkup(createElement(ChatStart, { busy: false, onScenario: () => {} }));
  expect(html).toContain('aria-labelledby="start-categories-label"');
  expect(html).toContain('tabindex="0"');
  for (const { category, scenarios } of scenarioGroups) {
    expect(html).toContain(`aria-label="${category.replaceAll("&", "&amp;")}"`);
    for (const scenario of scenarios) expect(html).toContain(`data-testid="start-scenario-${scenario.id}"`);
  }
  for (const scenario of scenarios.filter((scenario) => !menuScenarios.includes(scenario))) expect(html).not.toContain(`start-scenario-${scenario.id}`);
  expect(html.match(/data-testid="start-highlight-/g)).toHaveLength(3);
});
it("busy state disables every runnable start action", () => {
  const html = renderToStaticMarkup(createElement(ChatStart, { busy: true, onScenario: () => {} }));
  const buttons = html.match(/<button[^>]*>/g) ?? [];
  expect(buttons).toHaveLength(menuScenarios.length + 3);
  expect(buttons.every((button) => button.includes('disabled=""'))).toBe(true);
});
it("places proven rule-only choices first where available and never labels mixed follow-ups as free", () => {
  const human = scenarioGroups.find((group) => group.category === "Human handoff")!;
  expect(isRuleOnlyScenario(human.scenarios[0])).toBe(true);
  expect(isRuleOnlyScenario({ ...human.scenarios[0], followUps: ["Where is my order?"] })).toBe(false);
  expect(isRuleOnlyScenario({ ...human.scenarios[0], message: "> I want a human" })).toBe(false);
  expect(isRuleOnlyScenario(scenarios.find((scenario) => scenario.id === "german-returns")!)).toBe(false);
});
it("all No AI needed examples actually complete through existing rules without model work", async () => {
  vi.stubEnv("PUBLIC_DEMO", "true");
  model.run.mockReset().mockImplementation(() => { throw new Error("A rule-only starter reached model work"); });
  const free = menuScenarios.filter(isRuleOnlyScenario);
  expect(free.length).toBeGreaterThan(0);
  for (const scenario of free) {
    const thread = createThread(scenario.customerId);
    try {
      for (const message of [scenario.message, ...(scenario.followUps ?? [])]) {
        const outcome = await handleUserMessage(sessionContextOf(thread), message);
        expect(outcome.failed).toBeUndefined(); expect(outcome.reply).not.toBe("");
      }
    } finally { removeThread(thread.threadId); }
  }
  expect(model.run).not.toHaveBeenCalled();
});
