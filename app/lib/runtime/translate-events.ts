/**
 * Agents SDK: streaming events -> panel events.
 *
 * `run(agent, input, { stream: true })` returns an async iterable of three kinds
 * of events: raw model tokens, run items (tool called, handoff, ...) and
 * "agent updated". We translate the useful ones into our own `AgentEventBody`.
 * Text tokens are ignored on purpose (see run-support.ts: output guardrails).
 */
import type { RunStreamEvent } from "@openai/agents";
import type { AgentEventBody } from "@/lib/types";
import { unwrapData } from "@/lib/tools/helpers";

function parseArgs(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function translateEvent(event: RunStreamEvent): AgentEventBody | undefined {
  if (event.type === "agent_updated_stream_event") {
    return { kind: "agent_active", agent: event.agent.name };
  }
  if (event.type !== "run_item_stream_event") return undefined;

  const item = event.item;
  if (item.type === "handoff_output_item") {
    return { kind: "handoff", from: item.sourceAgent.name, to: item.targetAgent.name };
  }
  if (item.type === "tool_call_item" && item.rawItem.type === "function_call") {
    return {
      kind: "tool_call",
      agent: item.agent.name,
      tool: item.rawItem.name,
      args: parseArgs(item.rawItem.arguments),
    };
  }
  if (item.type === "tool_call_output_item") {
    const name = "name" in item.rawItem ? String(item.rawItem.name) : "tool";
    const output = typeof item.output === "string" ? unwrapData(item.output) : item.output;
    return { kind: "tool_output", agent: item.agent.name, tool: name, result: output };
  }
  return undefined;
}
