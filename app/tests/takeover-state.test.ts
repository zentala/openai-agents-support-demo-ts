import { describe, expect, it } from "vitest";
import { initialTakeover, reduceTakeover, type TakeoverState } from "@/lib/runtime/takeover-state";

const take = (state: TakeoverState, consultant: string) => reduceTakeover(state, { type: "take", consultant, at: 1000 });

describe("takeover state machine", () => {
  it("starts with the agent and moves agent -> human -> agent", () => {
    const taken = take(initialTakeover(), "Marta");
    expect(taken).toEqual({ ok: true, state: { status: "human", consultant: "Marta", since: 1000 } });
    if (!taken.ok) throw new Error("unreachable");
    expect(reduceTakeover(taken.state, { type: "release", consultant: "Marta" })).toEqual({ ok: true, state: { status: "agent" } });
  });

  it("refuses a second consultant (and the same one twice) with a specific error", () => {
    const taken = take(initialTakeover(), "Marta");
    if (!taken.ok) throw new Error("unreachable");
    const other = take(taken.state, "Tomasz");
    expect(other.ok === false && other.errorType).toBe("AlreadyTakenOver");
    expect(other.ok === false && other.message).toContain("Marta");
    expect(take(taken.state, "Marta").ok).toBe(false);
  });

  it("refuses reply and hand-back while the agent is in charge", () => {
    const reply = reduceTakeover(initialTakeover(), { type: "reply", consultant: "Marta" });
    const release = reduceTakeover(initialTakeover(), { type: "release", consultant: "Marta" });
    expect(reply.ok === false && reply.errorType).toBe("NotTakenOver");
    expect(release.ok === false && release.errorType).toBe("NotTakenOver");
  });

  it("only the consultant in charge may reply or hand back", () => {
    const taken = take(initialTakeover(), "Marta");
    if (!taken.ok) throw new Error("unreachable");
    const reply = reduceTakeover(taken.state, { type: "reply", consultant: "Tomasz" });
    const release = reduceTakeover(taken.state, { type: "release", consultant: "Tomasz" });
    expect(reply.ok === false && reply.errorType).toBe("NotYourConversation");
    expect(release.ok === false && release.errorType).toBe("NotYourConversation");
    expect(reduceTakeover(taken.state, { type: "reply", consultant: "Marta" }).ok).toBe(true);
  });
});
