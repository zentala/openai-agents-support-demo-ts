/** Preserve the provenance of each delivered paragraph, including mixed AI answers and fixed receipts. */
import { automaticStep, type CustomerMessage, type SenderInfo } from "@/lib/message-kinds";
import type { RunOutcome } from "./run-support";

export function outcomeSender(outcome: RunOutcome): SenderInfo {
  return outcome.sender ?? (outcome.tripwire ? automaticStep("Blocked by a safety check")
    : outcome.failed ? automaticStep("Request failed") : outcome.approvals.length ? automaticStep("Waiting for approval") : { kind: "ai" });
}

export function customerMessages(outcome: RunOutcome): CustomerMessage[] {
  return outcome.messages ?? (outcome.reply ? [{ text: outcome.reply, sender: outcomeSender(outcome) }] : []);
}
