/**
 * Turns any thrown value into a SPECIFIC, visible description.
 *
 * Rule of this project: a generic "There was an error" is a bug. Every failure
 * keeps its type and text, goes to the Errors section of the panel, and the chat
 * gets one sentence saying what failed.
 */
import { InputGuardrailTripwireTriggered, OutputGuardrailTripwireTriggered } from "@openai/agents";
import { redactSecrets } from "@/lib/security/request-key";
export { redactSecrets } from "@/lib/security/request-key";

export type DescribedError = {
  errorType: string;
  message: string;
  /** One sentence for the chat bubble. */
  chatSentence: string;
};

const MAX_MESSAGE_LENGTH = 400;

/** SECURITY: provider errors sometimes echo part of an API key. Never show it. */

export function describeError(error: unknown): DescribedError {
  const err = error instanceof Error ? error : new Error(String(error));
  if ((error as { status?: number } | null)?.status === 401) {
    return { errorType: "AuthenticationError", message: "OpenAI rejected the key: 401", chatSentence: "OpenAI rejected the key: 401" };
  }
  const status = (error as { status?: number } | null)?.status;
  const code = (error as { code?: string } | null)?.code;
  // Production minification changes constructor names; explicit error names remain stable.
  const errorType = redactSecrets(err.name !== "Error" ? err.name : (err.constructor?.name ?? "Error"));
  const detail = redactSecrets([status ? `HTTP ${status}` : "", code ?? ""].filter(Boolean).join(", "));
  const message = redactSecrets(err.message).slice(0, MAX_MESSAGE_LENGTH);
  return {
    errorType,
    message: detail ? `${message} (${detail})` : message,
    chatSentence: `Sorry, the request failed with ${errorType}: ${message}`,
  };
}

export type Tripwire = { stage: "input" | "output"; guardrail: string; reasoning: string };

/** Returns details when the error is a guardrail tripwire (a decision, not a crash). */
export function asTripwire(error: unknown): Tripwire | undefined {
  if (error instanceof InputGuardrailTripwireTriggered) {
    return { stage: "input", guardrail: error.result.guardrail.name, reasoning: reasonOf(error.result.output.outputInfo) };
  }
  if (error instanceof OutputGuardrailTripwireTriggered) {
    return { stage: "output", guardrail: error.result.guardrail.name, reasoning: reasonOf(error.result.output.outputInfo) };
  }
  return undefined;
}

function reasonOf(info: unknown): string {
  const record = info as { reasoning?: string; reasons?: string[] } | undefined;
  return record?.reasoning ?? record?.reasons?.join("; ") ?? "no reason given";
}

/** What the customer reads when a guardrail stopped the run. */
export function refusalFor(tripwire: Tripwire): string {
  if (tripwire.stage === "output") {
    return `I can't share that answer: it was blocked by our ${tripwire.guardrail} (it contained protected information). Please rephrase your question.`;
  }
  if (tripwire.guardrail === "relevance_guardrail") {
    return "Sorry, I can only help with Nordic Home orders, deliveries, returns and refunds (blocked by relevance_guardrail).";
  }
  return "I can't process this message: it looks like an attempt to change my instructions (blocked by jailbreak_guardrail). I'm happy to help with your order or a policy question.";
}
