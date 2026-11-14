# 003 — Business rules enforced in tool code, not in the prompt

## TLDR

Identity, refund limits and the return window are checked in the tools' `execute` code. The
prompt only guides tone and routing. A jailbroken model still cannot read another customer's
order or refund more than the rules allow.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

A model can forget, misread or be talked out of an instruction. Money and personal data
need a hard layer. The Agents SDK lets a tool check the run context and arguments in code.

## Options considered

1. **Rules in the system prompt.** Cheap and readable, but soft: a prompt injection or a
   model error bypasses them.
2. **Rules in tool code, re-validated at execution.** Hard, testable without a model.
3. **Both.** Prompt for behavior, code for guarantees.

## Decision

Option 3, with code as the authority:

- `customerId` comes from the run context (the server's thread), never from model arguments.
  Tools accept no customer id.
- `create_refund` re-validates ownership, amount against the order total, and the 30-day
  window in `execute`, even after a human approved. `needsApproval` only adds a pause.
- Demo refunds have explicit `pending_payout`, `paid` and `cancelled` states. Creation reserves
  the amount without paying it. `cancel_refund` checks the session's order and refund ownership,
  then changes only `pending_payout` to `cancelled`. Paid or unknown states refuse with an escalation
  offer; repeated cancellation reports `REFUND_ALREADY_CANCELLED` without another mutation.
  Multiple owned refund records (including cancelled and paid ones) require an explicit choice;
  a retry without an ID must never advance to another pending refund. Cancelled records remain in history but
  do not count toward `refundedSoFar`; pending and paid amounts still consume the limit.
  No model-facing operation marks a refund paid or reverses a payout. Paid eval fixtures simulate
  that boundary; this demo does not have a real payment processor.
- "Not found" and "not yours" return the same answer, so existence is not revealed.
- Order ids from the model (handoff) or the browser (widget click) are validated before storage.
- Delivery country comes from each stored order, never from the customer's language or a model guess.
  Address proposals and Confirm both validate postal-code format against it and refuse country changes.
  These are format checks, not geographical verification of a street or city.
- Tool output and KB text are wrapped as data; errors go through one `toolErrorHandler` so
  the real cause reaches the panel.

## Consequences

- An explicit current confirmed refund or cancellation for an owned order selects the
  existing Orders agent's SDK toolChoice once, with the entry input guards and output
  guards intact. resetToolChoice avoids repeated execution. This never calls refund
  execute/invoke directly: SDK needsApproval and execution-time rules still govern money.
- The same selection files a complete stored damage claim (`submit_claim`) when the customer confirms
  the summary or asks to file it. Code, not triage or the model's memory, makes the claim exist
  before a later refund turn; `submit_claim` still checks the draft schema, ownership and window.
- While an address change is in progress (stored draft with an accepted order), the next message goes to the
  Orders agent with the open step in its instructions. No tool is forced, so the customer can still change topic,
  stop or ask for a person; code drops the draft on Cancel, on a refusal, on an escalation rule or tool, and when
  another flow's tool runs. A run that ends with no text gets a fixed system line (`fillEmptyReply`) built from
  this turn's tool output only.
- A message that names an order number of the logged-in customer (or of a verified guest, who is that customer
  from the next turn on) goes to the Orders agent, without a forced tool, after the escalation rules. A foreign
  and a non-existent number take the unchanged triage path, so routing reveals nothing about which orders exist;
  an unverified guest owns no order and still reaches verification through triage.
  Because the handoff hook does not run for such a turn, `routeRequest` records what the hook would: the validated
  `activeOrderId` and a code-written `handoffReason`, announced as a `context_update`.
- A turn that ends with only a promise to check, retrieve or wait, while no tool ran, is replaced by the same fixed
  system line as an empty reply (`isDeadPromise`), and the promise is kept out of the stored history; the
  prompt also forbids such promises.

- Optional claim-photo requests remember whether they were already offered. Declining or
  repeating that step returns instructions to continue summary/confirmed submission, not
  another mandatory stop. Claim schema, owner, window, date and photo checks remain in code.
- Repeated delivery-address collection reuses the same validated proposal when unchanged;
  partial updates start from its stored fields. Invalid updates invalidate it, changed
  addresses issue a new nonce, and only the exact current customer Confirm may apply it.

- Conversation state invokes the existing `offer_reply_choices` action after a successful guarded run,
  using the customer's pending refund request or the KB help flow; it never parses the model's answer.
  The model may also call that tool, but optional choices no longer depend on it choosing to do so.
  Refund offers validate the
  session-owned order and amount, then recheck the stored proposal on click. Customer confirmation
  is ordinary input to the existing guarded run; it never calls a refund directly or grants consultant
  approval. Declining consumes the offer without model work, a refund or a ticket. FAQ/Triage may offer
  escalation only; code refuses their refund proposals.

- Rules are unit-testable with no network (`app/tests/`).
- Changing a rule means changing code and tests, not only a prompt.
- A tool that skips these checks is a security bug. Reviewers look for them.

## Evidence

- [app/lib/tools/refund-rules.ts](../../app/lib/tools/refund-rules.ts),
  [refund.ts](../../app/lib/tools/refund.ts), [cancel-refund.ts](../../app/lib/tools/cancel-refund.ts), [orders.ts](../../app/lib/tools/orders.ts),
  [tool-error.ts](../../app/lib/tools/tool-error.ts).
- [app/lib/agents/handoff-context.ts](../../app/lib/agents/handoff-context.ts).
- README "Security", [docs/BUILD-v1.md](../../docs/BUILD-v1.md) "Tools".
- [JOURNAL.md](../JOURNAL.md): verification round 1 (swallowed tool errors).
