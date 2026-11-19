/**
 * A consultant rates one agent answer (thumbs up/down, optional correction).
 * Only AGENT answers can be rated: consultant lines and system notices are not model output.
 */
import { saveRating, type RatingRecord } from "@/lib/data/store";
import { getThread } from "@/lib/runtime/threads";

export type RateInput = {
  threadId: string;
  entryId: string;
  rating: "up" | "down";
  correction?: string;
  consultant: string;
};

export type RateResult = { ok: true; record: RatingRecord } | { ok: false; errorType: string; message: string };

export function rateAnswer(input: RateInput): RateResult {
  const thread = getThread(input.threadId);
  if (!thread) return { ok: false, errorType: "UnknownThread", message: `No conversation ${input.threadId}` };
  const index = thread.transcript.findIndex((e) => e.id === input.entryId);
  const entry = thread.transcript[index];
  if (!entry || entry.role !== "agent") {
    return { ok: false, errorType: "NotAnAgentAnswer", message: "Only answers written by the agent can be rated." };
  }
  const correction = input.correction?.trim();
  const record = saveRating({
    threadId: input.threadId,
    entryId: input.entryId,
    customerId: thread.customerId,
    rating: input.rating,
    correction: correction || undefined,
    ratedBy: input.consultant,
    ratedAt: new Date().toISOString(),
    userTurns: thread.transcript.slice(0, index).filter((e) => e.role === "customer").map((e) => e.text),
    agentReply: entry.text,
    tools: entry.tools ?? [],
  });
  return { ok: true, record };
}
