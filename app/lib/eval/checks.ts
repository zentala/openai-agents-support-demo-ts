/**
 * Eval checks as a PURE function: observations in, list of failed expectations out.
 * Kept separate from the runner so it is unit-tested without any network.
 */
import type { AgentEvent } from "@/lib/types";
import type { Expectation } from "./scenarios";

export type Observation = {
  /** Answer to the last customer turn. */
  reply: string;
  /** Events of the whole conversation (all turns). */
  events: AgentEvent[];
  /** Name of the guardrail that stopped the last turn, if any. */
  tripwire?: string;
  /** Message of a crash, if any. */
  failed?: string;
  /** Every answer of the conversation, oldest first (defaults to just `reply`). */
  replies?: string[];
};

const toolCalls = (events: AgentEvent[]): string[] =>
  events.flatMap((e) => (e.kind === "tool_call" ? [e.tool] : []));

const refundsCreated = (events: AgentEvent[]): number =>
  events.filter(
    (e) => e.kind === "tool_output" && e.tool === "create_refund" && JSON.stringify(e.result).includes("REFUND_CREATED"),
  ).length;

const count = (events: AgentEvent[], predicate: (e: AgentEvent) => boolean): number => events.filter(predicate).length;

/** Checks for the data-collection features (claims, guest verification, address change, secrets). */
function checkWave3b(expect: Expectation, obs: Observation, check: (ok: boolean, message: string) => void): void {
  const { events } = obs;
  if (expect.claimsCreated !== undefined) {
    const created = count(events, (e) => e.kind === "tool_output" && e.tool === "submit_claim" && JSON.stringify(e.result).includes("CLAIM_CREATED"));
    check(created === expect.claimsCreated, `expected ${expect.claimsCreated} claim(s), got ${created}`);
  }
  if (expect.verification !== undefined) {
    const outcomes = events.flatMap((e) => (e.kind === "verification" ? [e.outcome] : []));
    const ok = expect.verification === "not_verified" ? !outcomes.includes("verified") : outcomes.includes(expect.verification);
    check(ok, `verification should be ${expect.verification}, events: ${outcomes.join(",") || "none"}`);
  }
  if (expect.addressStatus !== undefined) {
    const last = events.flatMap((e) => (e.kind === "address_change" ? [e.status] : [])).at(-1) ?? "none";
    check(last === expect.addressStatus, `address change status should be ${expect.addressStatus}, got ${last}`);
  }
  const everything = JSON.stringify(events);
  for (const text of expect.eventsNotInclude ?? []) check(!everything.includes(text), `panel events contain "${text}"`);
  if (expect.maxQuestionMarks) {
    const { replies, max } = expect.maxQuestionMarks;
    (obs.replies ?? [obs.reply]).slice(0, replies).forEach((reply, i) => {
      const questions = (reply.match(/\?/g) ?? []).length;
      check(questions <= max, `answer ${i + 1} asks ${questions} questions (max ${max})`);
    });
  }
}

/** Returns one human-readable string per failed expectation (empty = pass). */
export function evaluate(expect: Expectation, obs: Observation): string[] {
  const failures: string[] = [];
  const called = toolCalls(obs.events);
  const check = (ok: boolean, message: string) => {
    if (!ok) failures.push(message);
  };

  if (obs.failed) failures.push(`run crashed: ${obs.failed}`);
  if (expect.guardrailTripped !== undefined) {
    check(obs.tripwire === expect.guardrailTripped, `expected ${expect.guardrailTripped} to trip, got ${obs.tripwire ?? "none"}`);
  }
  if (expect.normalized !== undefined) {
    check(obs.events.some((e) => e.kind === "normalization" && e.stripped.length > 0) === expect.normalized, "normalization event mismatch");
  }
  for (const tool of expect.toolsCalled ?? []) check(called.includes(tool), `tool ${tool} was not called`);
  if (expect.toolsCalledAny) {
    check(expect.toolsCalledAny.some((t) => called.includes(t)), `none of ${expect.toolsCalledAny.join("/")} called`);
  }
  for (const tool of expect.toolsNotCalled ?? []) check(!called.includes(tool), `tool ${tool} must not be called`);
  for (const id of expect.citesKb ?? []) check(obs.reply.includes(id), `answer does not cite ${id}`);
  const hitIds = obs.events.flatMap((e) => (e.kind === "kb_hits" ? e.hits.map((h) => h.id) : []));
  for (const id of expect.kbHitsInclude ?? []) check(hitIds.includes(id), `no KB hit for ${id}`);
  if (expect.approvalRequested !== undefined) {
    check(obs.events.some((e) => e.kind === "approval_request") === expect.approvalRequested, `approvalRequested should be ${expect.approvalRequested}`);
  }
  if (expect.refundCreated !== undefined) {
    check((refundsCreated(obs.events) > 0) === expect.refundCreated, `refundCreated should be ${expect.refundCreated}`);
  }
  if (expect.refundsCreated !== undefined) {
    check(refundsCreated(obs.events) === expect.refundsCreated, `expected ${expect.refundsCreated} refund(s), got ${refundsCreated(obs.events)}`);
  }
  const outputs = obs.events.flatMap((e) => (e.kind === "tool_output" ? [JSON.stringify(e.result)] : []));
  for (const text of expect.toolResultIncludes ?? []) {
    check(outputs.some((o) => o.includes(text)), `no tool result contains ${text}`);
  }
  if (expect.ticketCreated !== undefined) {
    check(obs.events.some((e) => e.kind === "escalation") === expect.ticketCreated, `ticketCreated should be ${expect.ticketCreated}`);
  }
  if (expect.widgetShown !== undefined) {
    check(obs.events.some((e) => e.kind === "widget") === expect.widgetShown, `widgetShown should be ${expect.widgetShown}`);
  }
  const changedFields = obs.events.flatMap((e) => (e.kind === "context_update" ? Object.keys(e.changes) : []));
  for (const field of expect.contextChanged ?? []) check(changedFields.includes(field), `context field ${field} was not updated`);
  checkWave3b(expect, obs, check);
  for (const pattern of expect.replyMatches ?? []) check(new RegExp(pattern, "i").test(obs.reply), `answer lacks /${pattern}/`);
  for (const pattern of expect.replyNotMatches ?? []) check(!new RegExp(pattern, "i").test(obs.reply), `answer matches forbidden /${pattern}/`);
  return failures;
}
