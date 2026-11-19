import { beforeEach, describe, expect, it } from "vitest";
import { rateAnswer } from "@/lib/admin/rate-answer";
import { computeMetrics } from "@/lib/admin/metrics";
import { ratingsToScenarios } from "@/lib/admin/ratings-export";
import { listRatings, resetDemoData, type RatingRecord } from "@/lib/data/store";
import { scenarioSchema, scenarios } from "@/lib/eval/scenarios";
import type { LoggedEvent } from "@/lib/runtime/event-bus";
import { addTranscript, threadFor } from "@/lib/runtime/threads";
import type { AgentEventBody } from "@/lib/types";

const rating = (over: Partial<RatingRecord>): RatingRecord => ({
  id: "RT-1", threadId: "t", entryId: "e", customerId: "c-anna", rating: "up", ratedBy: "Marta Nowak",
  ratedAt: "2026-11-09T12:00:00Z", userTurns: ["Where is my order 1004?"], agentReply: "It is in transit.", tools: ["get_order"], ...over,
});

describe("ratingsToScenarios: export shape", () => {
  it("produces objects valid for data/scenarios.json (same zod schema), with the keys id/label/message/customerId/expect", () => {
    const exported = ratingsToScenarios([rating({}), rating({ rating: "down", correction: "Say it is delayed", agentReply: "Fine (really)." })]);
    expect(exported).toHaveLength(2);
    for (const s of exported) {
      expect(() => scenarioSchema.parse(s)).not.toThrow();
      expect(Object.keys(s)).toEqual(expect.arrayContaining(["id", "label", "message", "customerId", "expect"]));
    }
    // The file the app ships with uses the same keys, so an export can be pasted into it.
    expect(Object.keys(scenarios[0])).toEqual(expect.arrayContaining(["id", "label", "message", "customerId", "expect"]));
  });

  it("thumbs-up pins the tools; thumbs-down pins that the bad answer must not return and keeps the correction", () => {
    const [up, down] = ratingsToScenarios([rating({}), rating({ rating: "down", correction: "Say it is delayed", agentReply: "Fine (really)." })]);
    expect(up.expect).toEqual({ toolsCalled: ["get_order"], replyNotMatches: ["^\\s*$"] });
    expect(down.expect.replyNotMatches).toEqual(["Fine \\(really\\)\\."]);
    expect(down.expectedAnswer).toBe("Say it is delayed");
    // The generated pattern must really match the rejected answer (so it would catch it again).
    expect(new RegExp(down.expect.replyNotMatches![0], "i").test("Fine (really).")).toBe(true);
  });

  it("keeps earlier customer turns as followUps so the conversation can be replayed", () => {
    const [s] = ratingsToScenarios([rating({ userTurns: ["first", "second", "third"] })]);
    expect(s.message).toBe("first");
    expect(s.followUps).toEqual(["second", "third"]);
  });

  it("an empty list exports an empty array", () => {
    expect(ratingsToScenarios([])).toEqual([]);
  });
});

describe("rateAnswer (store round trip)", () => {
  beforeEach(() => resetDemoData());

  it("stores a rating built from the transcript, replaces a repeated rating, refuses non-agent lines", () => {
    const thread = threadFor({ threadId: "thread-rate-0001", customerId: "c-anna" });
    if (!thread) throw new Error("thread");
    addTranscript(thread, { role: "customer", text: "Hello" });
    const answer = addTranscript(thread, { role: "agent", text: "Hi, how can I help?", tools: ["search_kb"] });
    const customerLine = addTranscript(thread, { role: "customer", text: "Thanks" });

    const first = rateAnswer({ threadId: thread.threadId, entryId: answer.id, rating: "down", correction: " be warmer ", consultant: "Marta Nowak" });
    expect(first.ok).toBe(true);
    expect(listRatings()[0]).toMatchObject({ rating: "down", correction: "be warmer", userTurns: ["Hello"], agentReply: "Hi, how can I help?", tools: ["search_kb"] });

    rateAnswer({ threadId: thread.threadId, entryId: answer.id, rating: "up", consultant: "Tomasz Berg" });
    expect(listRatings()).toHaveLength(1);
    expect(listRatings()[0]).toMatchObject({ rating: "up", ratedBy: "Tomasz Berg" });

    expect(rateAnswer({ threadId: thread.threadId, entryId: customerLine.id, rating: "up", consultant: "Marta Nowak" })).toMatchObject({ ok: false, errorType: "NotAnAgentAnswer" });
    expect(rateAnswer({ threadId: "nope-nope-nope", entryId: "x", rating: "up", consultant: "Marta Nowak" })).toMatchObject({ ok: false, errorType: "UnknownThread" });
  });
});

describe("computeMetrics", () => {
  const log = (threadId: string, body: AgentEventBody): LoggedEvent => ({ threadId, event: { ...body, id: crypto.randomUUID(), ts: 0 } as LoggedEvent["event"] });

  it("counts escalation rate, guardrail trips and tool errors from events", () => {
    const events = [
      log("a", { kind: "trace", traceId: "t", url: "" }),
      log("b", { kind: "trace", traceId: "t", url: "" }),
      log("b", { kind: "escalation", ticketId: "T-1", source: "rule", reason: "x" }),
      log("a", { kind: "guardrail", stage: "input", name: "g", passed: false, reasoning: "" }),
      log("a", { kind: "guardrail", stage: "input", name: "g", passed: true, reasoning: "" }),
      log("a", { kind: "error", errorType: "E", message: "m", where: "tool get_order" }),
      log("a", { kind: "error", errorType: "E", message: "m", where: "agent run" }),
    ];
    const metrics = computeMetrics(events, { pending: 2, approved: 1, rejected: 3 });
    expect(metrics).toMatchObject({
      conversations: 2, escalatedConversations: 1, escalationRate: 0.5, guardrailTrips: 1, toolErrors: 1,
      approvals: { pending: 2, approved: 1, rejected: 3 },
    });
  });

  it("an empty log gives zeros, not NaN", () => {
    const metrics = computeMetrics([], { pending: 0, approved: 0, rejected: 0 });
    expect(metrics.escalationRate).toBe(0);
    expect(metrics.conversations).toBe(0);
  });
  it("excludes rejected turns but keeps any accepted turn of the same conversation", () => {
    const trace = (id: string) => log(id, { kind: "trace", traceId: "t", url: "" });
    const rejected = (id: string, errorType: string) => log(id, { kind: "error", errorType, message: "invalid", where: "input" });
    const counts = { pending: 0, approved: 0, rejected: 0 };
    expect(computeMetrics([trace("a"), rejected("a", "EmptyMessage"), trace("b"), rejected("b", "InvalidSelection")], counts).conversations).toBe(0);
    expect(computeMetrics([trace("a"), trace("a"), rejected("a", "EmptyMessage")], counts).conversations).toBe(1);
    expect(computeMetrics([trace("a"), rejected("a", "InvalidSelection"), trace("a")], counts).conversations).toBe(1);
    expect(computeMetrics([trace("a"), rejected("a", "ProviderError")], counts).conversations).toBe(1);
  });

  it("a rule-escalated thread that never started a run still counts as a conversation", () => {
    const metrics = computeMetrics([log("c", { kind: "escalation", ticketId: "T-1", source: "rule", reason: "x" })], { pending: 0, approved: 0, rejected: 0 });
    expect(metrics.conversations).toBe(1);
    expect(metrics.escalationRate).toBe(1);
  });
});
