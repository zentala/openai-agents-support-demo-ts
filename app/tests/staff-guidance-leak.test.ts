/** Staff guidance may shape a useful question; quoting the note or attributing it must stay blocked. */
import { RunContext } from "@openai/agents";
import { describe, expect, it } from "vitest";
import { triageAgent } from "@/lib/agents";
import { leakGuardrail } from "@/lib/guardrails/leak-guardrail";
import { staffGuidanceLeak } from "@/lib/guardrails/staff-guidance-leak";

const NOTE = "Before discussing delivery arrangements, ask whether the customer is available to receive a two-person delivery team.";

describe("staffGuidanceLeak", () => {
  it("blocks quoting the whole note, ignoring case and punctuation", () => {
    expect(staffGuidanceLeak(`Sure! ${NOTE.toUpperCase().replace(",", " -")} Thanks.`, NOTE)).toBe(true);
  });

  it("blocks an answer that overlaps 7+ words and says where the words came from", () => {
    expect(staffGuidanceLeak("The internal note says to ask whether the customer is available to receive a delivery team.", NOTE)).toBe(true);
    expect(staffGuidanceLeak("My private guidance: ask whether the customer is available to receive a two-person team.", NOTE)).toBe(true);
  });

  it("allows a normal answer that follows the guidance without revealing it", () => {
    const followed = "Are you available to receive a two-person delivery team on the day? Then we can talk about arrangements.";
    expect(staffGuidanceLeak(followed, NOTE)).toBe(false);
  });

  it("allows an answer that shares 7+ words but does not name the note as its source", () => {
    expect(staffGuidanceLeak("Is the customer available to receive a two-person delivery team on Friday?", NOTE)).toBe(false);
  });

  it("does not treat a short note as a secret", () => {
    expect(staffGuidanceLeak("Your refund is private and internal to the queue.", "Offer a refund.")).toBe(false);
  });
});

describe("leakGuardrail reason for staff guidance", () => {
  it("states the rule the code applies: whole note, or 7+ words while naming the note", async () => {
    const context = new RunContext({ customerId: "c-anna", customerName: "Anna", threadId: "staff-guidance-reason",
      staffInstruction: { text: NOTE, consultant: "Marta Nowak", updatedAt: "2026-11-11" } });
    const result = await leakGuardrail.execute({ agentOutput: "The note says to ask whether the customer is available to receive a two-person delivery team.", context, agent: triageAgent });
    expect(result.tripwireTriggered).toBe(true);
    const reasons = (result.outputInfo as { reasons: string[] }).reasons.join(" ");
    expect(reasons).toContain("7+ consecutive words");
    expect(reasons).toContain("naming it as a note or instruction");
  });
});
