/** Tool evidence backs only matching, successful customer actions. */
import { describe, expect, it } from "vitest";
import { claimBackedByResults } from "@/lib/guardrails/action-claims";

describe("action claim backing", () => {
  it.each([
    ["escalation", "escalate_to_human", "TICKET_CREATED"],
    ["refund", "create_refund", "PENDING_APPROVAL"],
    ["claim", "submit_claim", "CLAIM_CREATED"],
    ["address", "confirm_address_change", "CONFIRMED"],
    ["report", "report_message", "REPORT_CREATED"],
    ["question", "ask_a_person", "QUESTION_CREATED"],
  ] as const)("backs %s only with the matching successful tool status", (type, tool, status) => {
    expect(claimBackedByResults(type, { [tool]: [{ status }] })).toBe(true);
    expect(claimBackedByResults(type, { [tool]: [{ status: "REFUSED" }] })).toBe(false);
    expect(claimBackedByResults(type, { other_tool: [{ status }] })).toBe(false);
  });
  it("does not treat an open ticket or unrelated concern result as report or question evidence", () => {
    expect(claimBackedByResults("report", { escalate_to_human: [{ status: "TICKET_ALREADY_OPEN" }] })).toBe(false);
    expect(claimBackedByResults("question", { report_message: [{ status: "REPORT_CREATED" }] })).toBe(false);
  });
});
