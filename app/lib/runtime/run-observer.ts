/**
 * Watches the event bus while one run is in progress and counts what the escalation rules need:
 * tool failures (they are not exceptions the caller sees: the SDK turns them into text for the model)
 * and the tools that were called (kept on the transcript entry for ratings and the eval export).
 */
import { subscribeToThread } from "./event-bus";

/** What update_address_change returned during this run (not earlier turns). */
export type AddressResult = { status: string; code?: string; message?: string };
export type RunObservation = { toolErrors: number; tools: string[]; addressResult?: AddressResult };

function addressResultOf(result: unknown): AddressResult | undefined {
  if (typeof result !== "object" || result === null || !("status" in result)) return undefined;
  const { status, code, reason, rejected } = result as { status: unknown; code?: unknown; reason?: unknown; rejected?: { code?: string; message?: string }[] };
  const first = rejected?.[0];
  return { status: String(status), code: typeof code === "string" ? code : first?.code, message: typeof reason === "string" ? reason : first?.message };
}

/** Starts watching; call the returned function when the run is over to stop and read the counts. */
export function observeRun(threadId: string): () => RunObservation {
  const seen: RunObservation = { toolErrors: 0, tools: [] };
  const unsubscribe = subscribeToThread(threadId, (event) => {
    if (event.kind === "error" && event.where.startsWith("tool ")) seen.toolErrors++;
    if (event.kind === "tool_call") seen.tools.push(event.tool);
    if (event.kind === "tool_output" && event.tool === "update_address_change") seen.addressResult = addressResultOf(event.result);
  });
  return () => {
    unsubscribe();
    return seen;
  };
}
