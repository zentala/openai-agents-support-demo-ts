import type { AgentInputItem } from "@openai/agents";
import { describe, expect, it } from "vitest";
import { capHistory } from "@/lib/runtime/history";

const user = (text: string): AgentInputItem => ({ role: "user", content: text });
const call = (id: string): AgentInputItem => ({ type: "function_call", callId: id, name: "get_order", arguments: "{}", status: "completed" });
const result = (id: string): AgentInputItem => ({
  type: "function_call_result",
  callId: id,
  name: "get_order",
  status: "completed",
  output: { type: "text", text: "ok" },
});
const reply = (text: string): AgentInputItem => ({
  role: "assistant",
  status: "completed",
  content: [{ type: "output_text", text }],
});

/** Every tool result must have its call earlier in the list, and every call its result. */
function pairsAreConsistent(items: AgentInputItem[]): boolean {
  const calls = new Set(items.flatMap((i) => ("type" in i && i.type === "function_call" ? [i.callId] : [])));
  const results = new Set(items.flatMap((i) => ("type" in i && i.type === "function_call_result" ? [i.callId] : [])));
  return [...calls].every((id) => results.has(id)) && [...results].every((id) => calls.has(id));
}

const turn = (n: number): AgentInputItem[] => [user(`q${n}`), call(`c${n}`), result(`c${n}`), reply(`a${n}`)];

describe("capHistory", () => {
  it("returns short history unchanged", () => {
    const history = [...turn(1), ...turn(2)];
    expect(capHistory(history, 24)).toBe(history);
  });

  it("drops the oldest turns and starts at a user message", () => {
    const history = [1, 2, 3, 4].flatMap(turn); // 16 items
    const capped = capHistory(history, 10);
    expect(capped.length).toBeLessThanOrEqual(10);
    expect(capped[0]).toEqual(user("q3"));
    expect(pairsAreConsistent(capped)).toBe(true);
  });

  it("never cuts between a tool call and its result, whatever the cap", () => {
    const history = [1, 2, 3, 4, 5].flatMap(turn);
    for (let cap = 1; cap < history.length; cap++) {
      expect(pairsAreConsistent(capHistory(history, cap)), `cap ${cap}`).toBe(true);
    }
  });

  it("keeps the newest turn whole even when it is larger than the cap", () => {
    const history = [...turn(1), user("big"), call("x"), result("x"), call("y"), result("y"), reply("done")];
    const capped = capHistory(history, 3);
    expect(capped[0]).toEqual(user("big"));
    expect(capped).toHaveLength(6);
  });

  it("without any user message, never starts on a dangling tool result", () => {
    // Window of 3 would start at result("b"); its call is cut away, so it must be dropped too.
    const history = [reply("a0"), call("a"), result("a"), call("b"), result("b"), reply("z")];
    const capped = capHistory(history, 3);
    expect(pairsAreConsistent(capped)).toBe(true);
    expect(capped).toEqual([reply("z")]);
  });

  it("without any message or reasoning item in the window, returns nothing rather than a broken pair", () => {
    const history = [reply("a0"), call("a"), result("a"), call("b"), result("b")];
    expect(capHistory(history, 2)).toEqual([]);
  });

  it("handles an empty history", () => {
    expect(capHistory([], 5)).toEqual([]);
  });
});
