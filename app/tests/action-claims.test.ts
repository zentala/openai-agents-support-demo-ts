/** Tool evidence backs only matching, successful customer actions. */
import { describe, expect, it } from "vitest";
import { claimBackedByResults } from "@/lib/guardrails/action-claims";

describe("action claim backing", () => {
  it.each([
    ["escalation", "escalate_to_human", "TICKET_CREATED"],
    ["refund", "create_refund", "PENDING_APPROVAL"],
    ["claim", "submit_claim", "CLAIM_CREATED"],
    ["address", "confirm_address_change", "CONFIRMED"],
    ["report", "escalate_to_human", "TICKET_ALREADY_OPEN"],
  ] as const)("backs %s only with the matching successful tool status", (type, tool, status) => {
    expect(claimBackedByResults(type, { [tool]: [{ status }] })).toBe(true);
    expect(claimBackedByResults(type, { [tool]: [{ status: "REFUSED" }] })).toBe(false);
    expect(claimBackedByResults(type, { other_tool: [{ status }] })).toBe(false);
  });
});
