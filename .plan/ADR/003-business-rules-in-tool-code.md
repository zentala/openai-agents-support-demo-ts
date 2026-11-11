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
- "Not found" and "not yours" return the same answer, so existence is not revealed.
- Order ids from the model (handoff) or the browser (widget click) are validated before storage.
- Tool output and KB text are wrapped as data; errors go through one `toolErrorHandler` so
  the real cause reaches the panel.

## Consequences

- Rules are unit-testable with no network (`app/tests/`).
- Changing a rule means changing code and tests, not only a prompt.
- A tool that skips these checks is a security bug. Reviewers look for them.

## Evidence

- [app/lib/tools/refund-rules.ts](../../app/lib/tools/refund-rules.ts),
  [refund.ts](../../app/lib/tools/refund.ts), [orders.ts](../../app/lib/tools/orders.ts),
  [tool-error.ts](../../app/lib/tools/tool-error.ts).
- [app/lib/agents/handoff-context.ts](../../app/lib/agents/handoff-context.ts).
- README "Security", [docs/BUILD-v1.md](../../docs/BUILD-v1.md) "Tools".
- [JOURNAL.md](../JOURNAL.md): verification round 1 (swallowed tool errors).
