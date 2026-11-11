/**
 * Watches the event bus while one run is in progress and counts what the escalation rules need:
 * tool failures (they are not exceptions the caller sees: the SDK turns them into text for the model)
 * and the tools that were called (kept on the transcript entry for ratings and the eval export).
 */
import { subscribeToThread } from "./event-bus";

export type RunObservation = { toolErrors: number; tools: string[] };

/** Starts watching; call the returned function when the run is over to stop and read the counts. */
export function observeRun(threadId: string): () => RunObservation {
  const seen: RunObservation = { toolErrors: 0, tools: [] };
  const unsubscribe = subscribeToThread(threadId, (event) => {
    if (event.kind === "error" && event.where.startsWith("tool ")) seen.toolErrors++;
    if (event.kind === "tool_call") seen.tools.push(event.tool);
  });
  return () => {
    unsubscribe();
    return seen;
  };
}
