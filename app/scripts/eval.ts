/**
 * `just eval`: runs every scenario in data/scenarios.json against the real agents
 * and prints a pass/fail table. Needs OPENAI_API_KEY (injected by the broker).
 *
 * It calls the same `handleUserMessage` as the chat route, so it measures the
 * real system - guardrails, tools, escalation rules and all - not a mock.
 * Like the browser it first creates the thread on the "server" (`createThread`) and rebuilds the run
 * context from the stored thread before every turn, so a guest who verifies mid-conversation is that
 * customer from the next turn on.
 * INTERVIEW: "I don't just demo the agent, I measure it" - this table is the proof.
 */
import { pathToFileURL } from "node:url";
import { evaluate } from "@/lib/eval/checks";
import { fillTemplates, scenarios, type Scenario } from "@/lib/eval/scenarios";
import { addRefund, resetDemoData } from "@/lib/data/store";
import { resolveApproval } from "@/lib/runtime/approval-flow";
import { clearEventLog, subscribeToThread } from "@/lib/runtime/event-bus";
import type { RunOutcome } from "@/lib/runtime/run-support";
import { sessionContextOf } from "@/lib/runtime/session-context";
import { createThread, type Thread } from "@/lib/runtime/threads";
import { handleUserMessage } from "@/lib/runtime/turn";
import { storeSecret } from "@/lib/sensitive/vault";
import type { AgentEvent } from "@/lib/types";

const only = process.argv.slice(2);
const selected = only.length > 0 ? scenarios.filter((s) => only.includes(s.id)) : scenarios;
const EVAL_CONSULTANT = "eval-script";

type Row = { id: string; verdict: "PASS" | "FAIL"; ms: number; notes: string; reply: string; tools: string[] };

/** Plays the human approver: resumes every paused refund through the same code the console uses. */
async function decideAll(outcome: RunOutcome, approve: boolean): Promise<RunOutcome> {
  let latest = outcome;
  for (const approval of outcome.approvals) {
    const resolved = await resolveApproval(approval.approvalId, approve, EVAL_CONSULTANT);
    if (!resolved.ok) throw new Error(`${resolved.errorType}: ${resolved.message}`);
    latest = resolved.outcome;
  }
  return latest;
}

/** Presses Confirm / Cancel on the pending address change card, the way the browser button does. */
async function clickAddressCard(thread: Thread, decision: "confirm" | "cancel"): Promise<RunOutcome> {
  if (!thread.pendingAddress) throw new Error("addressDecision: no address change proposal is pending");
  const click = { type: "address" as const, orderId: thread.pendingAddress.orderId, proposalId: thread.pendingAddress.proposalId, decision };
  return handleUserMessage(sessionContextOf(thread), `(click: ${decision} address change)`, click);
}

/** Money and secrets that exist "before" the conversation (see `seedRefunds` / `seedSecrets` in the scenario schema). */
function seed(scenario: Scenario, thread: Thread): void {
  for (const refund of scenario.seedRefunds ?? []) {
    addRefund({ customerId: thread.customerId, orderId: refund.orderId, amount: refund.amount, reason: "seeded by eval" });
  }
  for (const secret of scenario.seedSecrets ?? []) storeSecret(thread.threadId, secret.field, secret.value);
}

async function playConversation(scenario: Scenario, thread: Thread): Promise<{ outcome: RunOutcome; replies: string[] }> {
  const replies: string[] = [];
  const say = async (text: string): Promise<RunOutcome> => {
    const outcome = await handleUserMessage(sessionContextOf(thread), fillTemplates(text));
    replies.push(outcome.reply);
    // EVAL_TRACE=1 prints every turn of a multi-turn conversation, to see where a scenario went wrong.
    if (process.env.EVAL_TRACE) console.log(`      turn ${replies.length}: "${fillTemplates(text).slice(0, 80)}" -> ${outcome.reply.replace(/\s+/g, " ").slice(0, 200)}`);
    return outcome;
  };
  let outcome = await say(scenario.message);
  if (scenario.expect.resumeApproved) outcome = await decideAll(outcome, true);
  if (scenario.expect.resumeRejected) outcome = await decideAll(outcome, false);
  for (const followUp of scenario.followUps ?? []) outcome = await say(followUp);
  if (scenario.expect.addressDecision) {
    outcome = await clickAddressCard(thread, scenario.expect.addressDecision);
    replies.push(outcome.reply);
  }
  return { outcome, replies };
}

export async function runScenario(scenario: Scenario): Promise<Row> {
  // Every scenario starts from clean demo data, so a refund made by one cannot change the next.
  resetDemoData();
  clearEventLog();
  const thread = createThread(scenario.customerId);
  seed(scenario, thread);
  const events: AgentEvent[] = [];
  const unsubscribe = subscribeToThread(thread.threadId, (event) => events.push(event));
  const started = Date.now();
  try {
    const { outcome, replies } = await playConversation(scenario, thread);
    const failures = evaluate(scenario.expect, { reply: outcome.reply, replies, events, tripwire: outcome.tripwire, failed: outcome.failed });
    if (process.env.EVAL_TRACE) events.filter((e) => e.kind === "tool_call" || e.kind === "tool_output").forEach((e) => console.log(`      ${e.kind} ${e.tool}: ${JSON.stringify(e.kind === "tool_call" ? e.args : e.result).slice(0, 260)}`));
    return { id: scenario.id, verdict: failures.length === 0 ? "PASS" : "FAIL", ms: Date.now() - started, notes: failures.join("; "), reply: outcome.reply, tools: events.flatMap((e) => (e.kind === "tool_call" ? [e.tool] : [])) };
  } catch (error) {
    // A scenario failure belongs in the table; it must not hide later scenarios.
    return { id: scenario.id, verdict: "FAIL", ms: Date.now() - started, notes: error instanceof Error ? `${error.name}: ${error.message}` : String(error), reply: "", tools: events.flatMap((e) => e.kind === "tool_call" ? [e.tool] : []) };
  } finally {
    unsubscribe();
  }
}

async function main() {
  if (selected.length === 0) throw new Error(`No scenario matches: ${only.join(", ")}`);
  const rows: Row[] = [];
  for (let i = 0; i < selected.length; i++) {
    const row = await runScenario(selected[i]);
    rows.push(row);
    console.log(`${row.verdict}  ${row.id.padEnd(28)} ${String(row.ms).padStart(6)} ms  ${row.notes}`);
    // Always show what the agent did and said: a PASS is only as good as its assertions.
    console.log(`      tools: ${row.tools.join(", ") || "-"}`);
    console.log(`      reply: ${row.reply.replace(/\s+/g, " ").slice(0, 300)}`);
  }
  const failed = rows.filter((r) => r.verdict === "FAIL");
  console.log("\n| scenario | result | ms | notes |\n|---|---|---|---|");
  rows.forEach((r) => console.log(`| ${r.id} | ${r.verdict} | ${r.ms} | ${r.notes.replaceAll("|", "/")} |`));
  console.log(`\n${rows.length - failed.length}/${rows.length} passed`);
  process.exit(failed.length === 0 ? 0 : 1);
}

// Importing the runner in offline tests must not invoke models or exit the test process.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main().catch((error) => {
  console.error("eval crashed:", error);
  process.exit(2);
});
