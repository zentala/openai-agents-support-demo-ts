/**
 * A legitimate escalation answer must pass the real leak guardrail. The model is told to relay the queue
 * facts to the customer, so those facts live in the tool result (data), not in secret prompt wording that
 * an honest paraphrase then repeats (escalation-next-step eval: blocked by leak_guardrail).
 */
import { RunContext } from "@openai/agents";
import { beforeEach, expect, it } from "vitest";
import { triageAgent } from "@/lib/agents";
import { resetDemoData } from "@/lib/data/store";
import { leakGuardrail } from "@/lib/guardrails/leak-guardrail";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread } from "@/lib/runtime/threads";
import { unwrapData } from "@/lib/tools/helpers";
import { escalateToHuman } from "@/lib/tools/kb-and-escalation";

beforeEach(() => resetDemoData());

const blocked = async (answer: string) => {
  const context = new RunContext(sessionContextOf(createThread("c-james")));
  return (await leakGuardrail.execute({ context, agent: triageAgent, agentOutput: answer })).tripwireTriggered;
};

it.each([
  "I opened a ticket for you. Opening a ticket puts it in a queue; it does not mean a consultant has taken over yet. A consultant can take over and reply in this chat, so you can keep it open. I cannot promise an e-mail, call or a time.",
  "Your ticket is in the queue. That does not mean a consultant has taken over yet, but a consultant can take over and reply in this chat. Please keep this chat open.",
])("does not block a natural escalation answer: %s", async (answer) => {
  expect(await blocked(answer)).toBe(false);
});

it("does not block an answer built from the escalation tool's own words", async () => {
  const run = new RunContext(sessionContextOf(createThread("c-james")));
  const result = unwrapData(await escalateToHuman.invoke(run, '{"summary":"Third failed attempt"}')) as { queueMeaning: string; nextStep: string };
  expect(result.queueMeaning).toMatch(/queue/);
  expect(await blocked(`${result.queueMeaning} ${result.nextStep}`)).toBe(false);
});
