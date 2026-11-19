/**
 * Agents SDK: one shared `errorFunction` for every tool.
 *
 * TEACHING POINT - the bug we saw in the OpenAI demo: when a tool throws, the SDK
 * does NOT crash the run. Its default `errorFunction` swallows the exception and
 * tells the model only "An error occurred while running the tool. Please try
 * again." The real cause (429, bad API key, a bug) never reaches the user or the
 * logs. We replace the default so that every tool failure
 *   1. becomes a visible `error` card in the Errors panel (type, message, which tool), and
 *   2. gives the model a SPECIFIC text, so the chat can say what failed.
 */
import type { RunContext } from "@openai/agents";
import { describeError } from "@/lib/runtime/errors";
import { emitAgentEvent } from "@/lib/runtime/event-bus";
import type { SupportContext } from "@/lib/types";

/** Prefix the prompt tells the model to recognise (see SHARED_POLICY). */
export const TOOL_ERROR_PREFIX = "TOOL_ERROR";

/** Pure part: report one failure, return the text the model will read. */
export function reportToolError(toolName: string, threadId: string | undefined, error: unknown): string {
  // describeError keeps the error type and cuts the text; it also hides API keys (redactSecrets).
  const { errorType, message } = describeError(error);
  if (threadId) {
    emitAgentEvent(threadId, { kind: "error", errorType, message, where: `tool ${toolName}` });
  }
  return `${TOOL_ERROR_PREFIX} ${toolName}: ${errorType}: ${message}`;
}

/** Use as `errorFunction: toolErrorHandler("search_kb")` in every `tool({...})`. */
export function toolErrorHandler(toolName: string) {
  return (runContext: Pick<RunContext<unknown>, "context">, error: unknown): string =>
    reportToolError(toolName, (runContext.context as SupportContext | undefined)?.threadId, error);
}
