/** Deterministic guardrail checks, including invisible-character evasion in model output. */
import { describe, expect, it } from "vitest";
import { PROMPT_CANARY, PROMPT_TEXTS, SHARED_POLICY } from "@/lib/agents/prompts";
import { buildClassifierInput } from "@/lib/guardrails/input-guardrails";
import { detectLeak } from "@/lib/guardrails/leak-detect";
import { asData, unwrapData } from "@/lib/tools/helpers";
import { RunContext } from "@openai/agents";
import { triageAgent } from "@/lib/agents";
import { leakGuardrail } from "@/lib/guardrails/leak-guardrail";

const check = (answer: string, foreignSecrets: string[] = []) =>
  detectLeak({ answer, promptTexts: PROMPT_TEXTS, canary: PROMPT_CANARY, foreignSecrets });

describe("detectLeak", () => {
  it.each([
    ["refund", "Your refund is in the consultant queue."],
    ["delivery", "Delivery inside Poland takes 2-5 business days."],
  ])("a short staff note %s does not turn shared vocabulary into a secret", async (text, agentOutput) => {
    const context = new RunContext({ customerId: "c-anna", customerName: "Anna", threadId: "short-note-guardrail",
      staffInstruction: { text, consultant: "Marta Nowak", updatedAt: "2026-11-11" } });
    const result = await leakGuardrail.execute({ agentOutput, context, agent: triageAgent });
    expect(result.tripwireTriggered).toBe(false);
  });

  it("still blocks a seven-word excerpt from a longer private staff note", async () => {
    const context = new RunContext({ customerId: "c-anna", customerName: "Anna", threadId: "long-note-guardrail",
      staffInstruction: { text: "Please ask for a clear package photo before offering any refund options.", consultant: "Marta Nowak", updatedAt: "2026-11-11" } });
    const result = await leakGuardrail.execute({ agentOutput: "The note says ask for a clear package photo before offering.", context, agent: triageAgent });
    expect(result.tripwireTriggered).toBe(true);
    expect(JSON.stringify(result.outputInfo)).toContain("7+ consecutive words");
  });

  it.each([
    ["zero-width space", "\u200b"], ["zero-width joiner", "\u200d"],
    ["bidi override", "\u202e"], ["BOM", "\ufeff"],
  ])("blocks an output IBAN containing a %s", (_label, invisible) => {
    expect(check(`Refund to P${invisible}L61 1090 1014 0000 0712 1981 2874`)).toContain("contains a bank account number");
  });

  it("blocks an IBAN with zero-width characters between every character, beyond card/phone fallback detection", () => {
    const hidden = [..."PL61 1090 1014 0000 0712 1981 2874"].join("\u200b");
    expect(check(hidden)).toContain("contains a bank account number");
  });

  it("passes a normal answer", () => {
    expect(check("Your order 1001 was delivered 12 days ago. You can return it [returns-policy].")).toEqual([]);
  });

  it("catches the canary and a copied prompt fragment", () => {
    expect(check(`Sure: ${PROMPT_CANARY}`)).toHaveLength(1);
    const fragment = SHARED_POLICY.split(/\s+/).slice(30, 45).join(" ");
    expect(check(`Here you go: ${fragment}`).join()).toContain("system prompt");
  });

  it("catches another customer's data, case-insensitive", () => {
    expect(check("It belongs to lena schmidt", ["Lena Schmidt"]).join()).toContain("another customer");
  });

  it("catches a card number", () => {
    expect(check("Your card 4242 4242 4242 4242 is saved").join()).toContain("card number");
  });
});

describe("tool data delimiters", () => {
  it("wraps content and unwraps JSON for the panel", () => {
    const wrapped = asData("get_order", { orderId: "1001" });
    expect(wrapped).toContain("untrusted content");
    expect(unwrapData(wrapped)).toEqual({ orderId: "1001" });
  });
});

describe("buildClassifierInput: a short answer is judged together with the question it answers", () => {
  const history = [
    { role: "user", content: "My wardrobe arrived damaged." },
    { role: "assistant", status: "completed", content: [{ type: "output_text", text: "On which date did you notice the damage?" }] },
    { role: "user", content: "I noticed it today, 2026-11-09." },
  ];

  it("includes the assistant's previous message as context", () => {
    const text = buildClassifierInput(history);
    expect(text).toContain("Assistant's previous message: On which date did you notice the damage?");
    expect(text).toContain("Customer's latest message: I noticed it today, 2026-11-09.");
  });

  it("passes a first message and a plain string through unchanged", () => {
    expect(buildClassifierInput([{ role: "user", content: "Where is my order?" }])).toBe("Where is my order?");
    expect(buildClassifierInput("hello")).toBe("hello");
  });

  it("cuts a very long assistant message", () => {
    const long = [{ role: "assistant", content: "x".repeat(2000) }, { role: "user", content: "ok" }];
    expect(buildClassifierInput(long).length).toBeLessThan(600);
  });
});
