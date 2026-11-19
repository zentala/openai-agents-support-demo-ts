/**
 * Central configuration read from environment variables, with defaults.
 *
 * SECURITY: local mode lets SDKs read OPENAI_API_KEY from the environment. PUBLIC_DEMO=true
 * requires request-local visitor clients instead (runtime/model-access.ts). Set it in your shell or in `app/.env.local`
 * (git-ignored, see `.env.example`). A secret manager can inject it into the environment instead.
 */

/**
 * Main model for the three agents. gpt-4.1 was the most reliable at tool calling after
 * handoffs in our scenarios (gpt-5.4-mini sometimes answered without calling the tool
 * or returned an empty message). Override with OPENAI_MODEL to compare.
 */
export const AGENT_MODEL = process.env.OPENAI_MODEL ?? "gpt-4.1";

/** Guardrail classifier: gpt-6-luna passed 38/38 scenarios (ADR 002); agents stay on gpt-4.1. */
export const GUARDRAIL_MODEL = process.env.OPENAI_GUARDRAIL_MODEL ?? "gpt-6-luna";

/** Embedding model used for knowledge-base search. */
export const EMBEDDING_MODEL = "text-embedding-3-small";

/** Refunds above this amount (PLN) pause the run until a human approves. */
export const REFUND_APPROVAL_THRESHOLD = Number(process.env.REFUND_APPROVAL_THRESHOLD ?? 500);

/** Returns are accepted this many days after the delivery date. */
export const RETURN_WINDOW_DAYS = 30;

export const CURRENCY = "PLN";

/** Safety net against agent loops: the run stops with MaxTurnsExceededError. */
export const MAX_AGENT_TURNS = 10;

/** Longest user message we accept (characters); the rest is cut by normalizeInput. */
export const MAX_INPUT_LENGTH = 2000;

/**
 * Only the newest history items are sent to the model, to bound cost and attack surface.
 * An item is one user/assistant message, tool call, tool result or reasoning step,
 * so one customer turn is usually 4-8 items.
 */
export const MAX_HISTORY_ITEMS = 24;

/** `reasoning.effort` is only valid for gpt-5 family models. */
export function modelSettingsFor(model: string) {
  return model.startsWith("gpt-5") ? { reasoning: { effort: "low" as const } } : {};
}
