/**
 * Agents SDK: ONE function that runs the agent system and reports everything.
 *
 * Concepts shown here:
 * - `Runner` with a trace id, so the whole run shows up in OpenAI's trace viewer.
 * - `runner.run(agent, input, { stream: true, context })`: events arrive while the
 *   run is in progress (tool calls, handoffs) and we forward them to the panel.
 * - The typed `context` is what tools read the customer from.
 * - Guardrail tripwires and errors surface as exceptions; we turn each into a
 *   visible, specific event instead of swallowing it.
 *
 * The caller (chat route or eval script) subscribes to the event bus for the thread.
 */
import { RunState, type AgentInputItem, type RunStreamEvent } from "@openai/agents";
import { createRequestRunner } from "./model-access";
import { redactValue } from "@/lib/security/request-key";
import { triageAgent } from "@/lib/agents";
import { MAX_AGENT_TURNS } from "@/lib/config";
import type { ApprovalRequest, MutableContext, SupportContext } from "@/lib/types";
import { savePausedRun } from "./approvals";
import { diffContext, pickMutable } from "./context-diff";
import { emitAgentEvent } from "./event-bus";
import { asTripwire, describeError, refusalFor } from "./errors";
import { translateEvent } from "./translate-events";
import { refreshStaffInstruction } from "./session-context";
import type { CustomerMessage, SenderInfo } from "@/lib/message-kinds";
import { routeRequest } from "@/lib/agents/requested-action";

export type RunInput = string | AgentInputItem[] | RunState<SupportContext, typeof triageAgent>;

export type RunOutcome = {
  sender?: SenderInfo;
  messages?: CustomerMessage[];
  /** Text for the chat bubble. Empty when waiting for approval. */
  reply: string;
  /** Full conversation items to store for the next turn (only on success). */
  history?: AgentInputItem[];
  /** Set when the run paused for a human decision. */
  approvals: ApprovalRequest[];
  /** Set when a guardrail stopped the run. */
  tripwire?: string;
  /** Set when something crashed. */
  failed?: string;
  /** Set when a consultant is in charge: the agent did not run and `reply` is empty. */
  handledByHuman?: boolean;
  /** Mutable context fields at the end of the run; the thread keeps them for the next turn. */
  context?: MutableContext;
};

/** Models occasionally return an empty final message. Never show a blank bubble. */
const EMPTY_OUTPUT = "EmptyModelOutput";

export async function executeSupportRun(input: RunInput, ctx: SupportContext, traceId: string): Promise<RunOutcome> {
  refreshStaffInstruction(ctx);
  let attempt = await runOnce(input, ctx, traceId);
  if (attempt.outcome.reply !== "" || attempt.outcome.approvals.length > 0 || attempt.outcome.tripwire || attempt.outcome.failed) {
    return attempt.outcome;
  }
  emitAgentEvent(ctx.threadId, {
    kind: "error",
    errorType: EMPTY_OUTPUT,
    message: "The model returned an empty answer" + (attempt.usedTools ? " (after tool calls, not retrying)" : ", retrying once"),
    where: "agent run",
  });
  // SECURITY: retry only when no tool ran. Repeating a run that already created a refund would do it twice.
  if (!attempt.usedTools && !(input instanceof RunState)) attempt = await runOnce(input, ctx, traceId);
  if (attempt.outcome.reply !== "" || attempt.outcome.approvals.length > 0 || attempt.outcome.tripwire || attempt.outcome.failed) {
    return attempt.outcome;
  }
  const message = "Sorry, the assistant returned an empty answer (EmptyModelOutput). Please send your message again.";
  return { reply: message, approvals: [], failed: message };
}

/**
 * Reads the stream of a running agent system and forwards every event to the panel.
 * Returns true when at least one tool was called (the caller needs this for its retry rule).
 *
 * `ctx` is the object the SDK mutates: a fresh run gets it as `context`, and a resumed run was
 * rebuilt around it (see approvals.ts), so hooks and tools write into THIS reference.
 */
async function forwardStreamEvents(
  events: AsyncIterable<RunStreamEvent>,
  ctx: SupportContext,
): Promise<boolean> {
  let usedTools = false;
  let snapshot = pickMutable(ctx);
  for await (const event of events) {
    const body = translateEvent(event);
    if (body?.kind === "tool_call") usedTools = true;
    if (body) emitAgentEvent(ctx.threadId, body);
    // Diff after every event: the onHandoff hook runs between events, so its change shows up right here.
    const changes = diffContext(snapshot, ctx);
    if (changes) emitAgentEvent(ctx.threadId, { kind: "context_update", changes });
    snapshot = pickMutable(ctx);
  }
  return usedTools;
}

async function runOnce(
  input: RunInput,
  ctx: SupportContext,
  traceId: string,
): Promise<{ outcome: RunOutcome; usedTools: boolean }> {
  const { threadId } = ctx;
  // INTERVIEW: tracing is on by default in the Agents SDK; the trace id links this run to the OpenAI trace viewer (audit trail).
  let usedTools = false;
  try {
    const runner = createRequestRunner({
      workflowName: "Nordic Home support",
      traceId,
      groupId: threadId, // groups the turns of one conversation in the trace viewer
      traceMetadata: { customerId: ctx.customerId },
    });

    const options = { stream: true as const, maxTurns: MAX_AGENT_TURNS };
    // A resumed RunState already carries its context (built around `ctx`); a fresh run needs ours.
    const result =
      input instanceof RunState
        ? await runner.run(triageAgent, input, options)
        : await runner.run(routeRequest(ctx), input, { ...options, context: ctx });
    usedTools = await forwardStreamEvents(result, ctx);
    await result.completed; // rethrows tripwires / API errors that happened during the run
    const context = pickMutable(ctx);

    if (result.interruptions.length > 0) {
      const approvals = savePausedRun(ctx, traceId, result.state, result.interruptions);
      approvals.forEach((approval) => emitAgentEvent(threadId, { kind: "approval_request", approval }));
      return { outcome: { reply: "", approvals, context }, usedTools };
    }
    // SECURITY: we deliver the text only now, after the output guardrail passed.
    // Streaming raw tokens would show a leaked answer before the guardrail could stop it.
    const reply = String(result.finalOutput ?? "").trim();
    return { outcome: redactValue({ reply, history: reply ? result.history : undefined, approvals: [], context }), usedTools };
  } catch (error) {
    return { outcome: outcomeForError(error, threadId), usedTools };
  }
}

function outcomeForError(error: unknown, threadId: string): RunOutcome {
  const tripwire = asTripwire(error);
  if (tripwire) {
    // The guardrail itself already emitted its (red) panel card with the reasoning.
    return { reply: refusalFor(tripwire), approvals: [], tripwire: tripwire.guardrail };
  }
  const described = describeError(error);
  emitAgentEvent(threadId, {
    kind: "error",
    errorType: described.errorType,
    message: described.message,
    where: "agent run",
  });
  return { reply: described.chatSentence, approvals: [], failed: `${described.errorType}: ${described.message}` };
}
