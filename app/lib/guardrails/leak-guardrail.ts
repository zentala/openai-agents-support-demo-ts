/**
 * Agents SDK: OUTPUT guardrail. Runs after the agent produced its final answer;
 * if the tripwire fires, the SDK throws `OutputGuardrailTripwireTriggered` and
 * the answer is never shown to the customer.
 *
 * Why the chat route does not stream raw tokens: an output guardrail can only
 * judge a COMPLETE answer, so we deliver the text after it passed (see run-support.ts).
 */
import type { OutputGuardrail } from "@openai/agents";
import { PROMPT_CANARY, PROMPT_TEXTS } from "@/lib/agents/prompts";
import { customers, orders } from "@/lib/data/store";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { SupportContext } from "@/lib/types";
import { detectLeak } from "./leak-detect";

export const LEAK_GUARDRAIL = "leak_guardrail";

/** Names, emails and item names of everybody except the current customer. */
function foreignSecretsFor(customerId: string): string[] {
  const others = customers.filter((c) => c.id !== customerId);
  const otherOrders = orders.filter((o) => o.customerId !== customerId);
  return [
    ...others.flatMap((c) => [c.name, c.email]),
    ...otherOrders.flatMap((o) => o.items.map((item) => item.name)),
  ];
}

export const leakGuardrail: OutputGuardrail<"text", SupportContext> = {
  name: LEAK_GUARDRAIL,
  execute: async ({ agentOutput, context }) => {
    const session = context.context;
    const reasons = detectLeak({
      answer: String(agentOutput),
      promptTexts: PROMPT_TEXTS,
      canary: PROMPT_CANARY,
      foreignSecrets: foreignSecretsFor(session.customerId),
    });
    const passed = reasons.length === 0;
    emitAgentEvent(session.threadId, {
      kind: "guardrail",
      stage: "output",
      name: LEAK_GUARDRAIL,
      passed,
      reasoning: passed ? "No prompt text, foreign data or card numbers in the answer." : `Blocked: ${reasons.join("; ")}.`,
    });
    // tripwireTriggered = true makes the SDK abort the run with an exception.
    return { tripwireTriggered: !passed, outputInfo: { reasons } };
  },
};
