/** An emitted cleanup step is not proof that cleanup changed input. Evals must inspect stripped notes. */
import { expect, it } from "vitest";
import { evaluate } from "@/lib/eval/checks";
import type { AgentEvent } from "@/lib/types";
const observation = (stripped: string[]) => ({ reply: "ok", events: [
  { id: "cleanup", ts: 0, kind: "normalization", stripped, before: "safe preview", after: "clean text" } as AgentEvent,
] });
it("fails normalized=true when the per-turn event reports nothing stripped", () => {
  expect(evaluate({ normalized: true }, observation([]))).toEqual(["normalization event mismatch"]);
  expect(evaluate({ normalized: false }, observation([]))).toEqual([]);
});
it("requires a nonempty cleanup note for a successful normalization expectation", () => {
  expect(evaluate({ normalized: true }, observation(["1 mail signature line"]))).toEqual([]);
  expect(evaluate({ normalized: false }, observation(["1 card number masked"]))).toEqual(["normalization event mismatch"]);
});
