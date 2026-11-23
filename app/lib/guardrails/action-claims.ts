/** Classify claims in the final customer text and require evidence for each action. */
import { Agent } from "@openai/agents";
import { z } from "zod";
import { GUARDRAIL_MODEL } from "@/lib/config";
import { createRequestRunner } from "@/lib/runtime/model-access";

export const ACTION_TYPES = ["escalation", "refund", "claim", "address", "report", "question"] as const;
export type ActionClaimType = (typeof ACTION_TYPES)[number];
export const ACTION_STANCES = ["done", "in_progress", "will_happen", "offer", "negated"] as const;
export type ActionClaimStance = (typeof ACTION_STANCES)[number];
export type ActionClaim = { type: ActionClaimType; stance: ActionClaimStance; recipient_named: string | null };

const claimsOutput = z.object({ claims: z.array(z.object({
  type: z.enum(ACTION_TYPES),
  stance: z.enum(ACTION_STANCES),
  recipient_named: z.string().nullable(),
})).describe("Every action claim in the text, including repeated and mixed claims") });

const classifier = new Agent({
  name: "Customer action claim classifier",
  model: GUARDRAIL_MODEL,
  instructions: `Analyze only the supplied customer-visible reply. Return every claim that the support agent has performed, is performing, or promises to perform an action. Include present, past and future tense in English, Polish and German. Action types: escalation (forwarding, assigning, contacting a consultant/team), refund (creating, starting, issuing or promising a refund), claim (filing/registering a claim), address (changing/saving an address), report (reporting/recording an issue), question (sending a customer's question about an answer to a person). Stances: done, in_progress, will_happen, offer (clearly conditional or optional, not promised), negated (explicitly says it did not or will not happen). Return all claims, not only the first. An unassigned generic role such as “a consultant” is not a named recipient. recipient_named is the exact person, team or department explicitly named as the recipient, otherwise null. Do not infer claims from questions or hypothetical examples.`,
  outputType: claimsOutput,
});

/** Uses the shared request-scoped guardrail runner; invalid or absent structure throws to fail closed. */
export async function classifyActionClaims(text: string): Promise<ActionClaim[]> {
  const result = await createRequestRunner().run(classifier, text);
  if (!result.finalOutput) throw new Error("action_claim_classifier: missing structured output");
  return claimsOutput.parse(result.finalOutput).claims;
}

const successful: Record<ActionClaimType, [string, string[]]> = {
  escalation: ["escalate_to_human", ["TICKET_CREATED", "TICKET_ALREADY_OPEN"]],
  refund: ["create_refund", ["REFUND_CREATED", "PENDING_APPROVAL", "REFUND_PENDING_APPROVAL"]],
  claim: ["submit_claim", ["CLAIM_CREATED"]],
  address: ["confirm_address_change", ["ADDRESS_CHANGED", "CONFIRMED"]],
  report: ["report_message", ["REPORT_CREATED"]],
  question: ["ask_a_person", ["QUESTION_CREATED"]],
};

/** A result only backs the action named by its tool and a successful status. */
export function claimBackedByResults(type: ActionClaimType, results: Record<string, unknown[]>): boolean {
  if (type === "refund" && (results.cancel_refund ?? []).some((result) => typeof result === "string" && result.includes("REFUND_ALREADY_PAID")
    || typeof result === "object" && result !== null && "code" in result && result.code === "REFUND_ALREADY_PAID")) return true;
  const [tool, statuses] = successful[type];
  return (results[tool] ?? []).some((result) => {
    if (typeof result === "string") return statuses.some((status) => result.includes(status));
    return typeof result === "object" && result !== null && "status" in result && statuses.includes(String(result.status));
  });
}
