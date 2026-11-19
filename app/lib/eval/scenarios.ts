/**
 * Test scenarios: one JSON file drives the UI buttons AND the eval script.
 * The zod schema validates the file, so a typo in `expect` fails a unit test
 * instead of silently checking nothing.
 *
 * A scenario is one customer conversation: `message` is the first turn, `followUps` are the next
 * customer turns (sent in order, each after the agent answered the previous one).
 */
import { z } from "zod";
import raw from "@/data/scenarios.json";

const names = z.array(z.string());
const formWidgetKinds = z.array(z.enum(["order-picker", "secure-form", "photo-upload", "address-confirm"]));
export const SCENARIO_CATEGORIES = ["Orders", "Knowledge", "Languages", "Address changes", "Security & guardrails", "Refunds & approvals", "Human handoff", "Data collection", "Guest mode"] as const;

export const expectSchema = z
  .object({
    /** Name of the guardrail that must have stopped the LAST turn. */
    guardrailTripped: z.string(),
    /** At least one cleanup event reports nonempty stripped notes, not just that cleanup ran. */
    normalized: z.boolean(),
    toolsCalled: names,
    toolsCalledAny: names,
    toolsNotCalled: names,
    /** Answer mentions these KB article ids. */
    citesKb: names,
    /** search_kb returned these article ids. */
    kbHitsInclude: names,
    approvalRequested: z.boolean(),
    /** Eval approves the paused run, proving the saved state resumes with its session context. */
    resumeApproved: z.boolean(),
    /** Eval rejects the paused run; the agent must then tell the customer politely. */
    resumeRejected: z.boolean(),
    refundCreated: z.boolean(),
    /** Exactly this many refunds were created in the whole conversation. */
    refundsCreated: z.number().int().min(0),
    /** Tool outputs of the conversation contain these strings (e.g. a refusal code from the rules). */
    toolResultIncludes: names,
    /** An escalation ticket was opened (by the agent's tool or by the escalation rules). */
    ticketCreated: z.boolean(),
    /** The conversation has an OPEN ticket in the store with this source and reason (who opened it: tool = "agent", code = "rule"). */
    ticketOpened: z.object({ source: z.enum(["agent", "rule"]), reason: z.string() }),
    /** The transcript holds an automatic-step line (code-written, not the model) that names the open ticket. */
    automaticStepShown: z.boolean(),
    /** Legacy presence of any widget; use typed checks for a particular form or picker. */
    widgetShown: z.boolean(),
    /** Every named form/picker kind must appear; a Yes/No offer cannot satisfy this. */
    widgetsShown: formWidgetKinds,
    /** None of these kinds may appear; unrelated widgets remain allowed. */
    widgetsNotShown: formWidgetKinds,
    /** At least one explicit server-owned Yes/No offer was published, not inferred from answer text. */
    quickRepliesShown: z.boolean(),
    /** These run-context fields appear in a `context_update` event (e.g. set by the handoff hook). */
    contextChanged: names,
    /** Exactly this many damage claims were created (submit_claim returned CLAIM_CREATED). */
    claimsCreated: z.number().int().min(0),
    /** Guest verification: "verified" = it succeeded, "locked" = the lock fired, "not_verified" = it never succeeded. */
    verification: z.enum(["verified", "locked", "not_verified"]),
    /** After the last turn the eval presses Confirm / Cancel on the address change card (a structured click, like the browser). */
    addressDecision: z.enum(["confirm", "cancel"]),
    /** The newest address change event: its status, or "none" when no change was ever proposed. */
    addressStatus: z.enum(["proposed", "applied", "cancelled", "refused", "none"]),
    /** None of these strings appears anywhere in the panel events (secrets must not leak into them). */
    eventsNotInclude: names,
    /** Each of the first `replies` answers has at most `max` question marks (slot filling asks ONE thing at a time). */
    maxQuestionMarks: z.object({ replies: z.number().int().min(1), max: z.number().int().min(0) }),
    /** Regular expressions (case-insensitive) tested against the answer to the last turn. */
    replyMatches: names,
    replyNotMatches: names,
  })
  .partial()
  .strict();

export const scenarioSchema = z.object({
  id: z.string(),
  label: z.string(),
  category: z.enum(SCENARIO_CATEGORIES),
  message: z.string(),
  /** Later customer turns of the same conversation. */
  followUps: z.array(z.string()).optional(),
  customerId: z.string(),
  /** Staff-only fixture applied through takeover/hand-back before the first turn, never a chat input. */
  staffNote: z.string().max(2000).optional(),
  /**
   * Refunds that already exist when the conversation starts (eval only). They let a single turn test a
   * rule that depends on earlier money movements, without relying on what the model remembers.
   */
  seedRefunds: z.array(z.object({ orderId: z.string(), amount: z.number().positive(), status: z.enum(["pending_payout", "paid"]).optional() })).optional(),
  /** Values already in the secure vault when the conversation starts (eval only), as if the customer had used the form. */
  seedSecrets: z.array(z.object({ field: z.enum(["iban", "phone"]), value: z.string() })).optional(),
  /** What a good answer says, written by a consultant. For humans and LLM judges; not machine-checked. */
  expectedAnswer: z.string().optional(),
  expect: expectSchema,
});

export type Scenario = z.infer<typeof scenarioSchema>;
export type Expectation = z.infer<typeof expectSchema>;

/** `{{today}}` in a scenario text becomes today's date (YYYY-MM-DD), so dates in a conversation stay valid. */
export const fillTemplates = (text: string): string => text.replaceAll("{{today}}", new Date().toISOString().slice(0, 10));

export const scenarios: Scenario[] = z.array(scenarioSchema).parse(raw);
/** Seeded fixtures require server state and remain eval-only. */
export const menuScenarios = scenarios.filter((s) => !s.seedRefunds && !s.seedSecrets && !s.staffNote);
/** Fixture numbers stay stable for evals; the UI presents meaningful names without list numbering. */
export const displayScenarioLabel = (label: string): string => label.replace(/^\d+\s+/, "");
