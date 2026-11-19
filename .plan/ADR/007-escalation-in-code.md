# 007 — Escalation enforced in code

## TLDR

`decideEscalation` is a pure function that opens a ticket on a request for a human, legal or
GDPR wording, two guardrail trips or two tool errors. It runs on every turn, in addition to
the prompt, and the human-request case runs before any model call.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

The prompt tells agents to escalate upset customers. A model can forget. Legal threats and
GDPR requests must always reach a person.

## Options considered

1. **Prompt only.** Soft; the model decides.
2. **A pure rules function in code, plus the prompt and an `escalate_to_human` tool.**
3. **A classifier model for escalation.** Adds cost and another soft layer.

## Decision

Option 2. [app/lib/escalation/rules.ts](../../app/lib/escalation/rules.ts) takes signals
(text, guardrail trips, tool errors) and returns a decision. Keywords cover PL, EN and DE.
`turn.ts` calls it before the model for text rules; counters are judged after a turn.
`escalateByRule` creates the ticket and returns a fixed notice.

## Consequences

- Testable with no model; the rules are visible and explainable.
- Scenario 10 asserts `ticketCreated` instead of a tool call, because no model runs.
- Keyword rules can miss paraphrases and can fire on quoted text; the prompt remains the
  soft layer for the rest.
- Messages sent during a takeover stay in agent history; after hand-back the agent may answer
  the older question first (known, open).

## Evidence

- [app/lib/escalation/rules.ts](../../app/lib/escalation/rules.ts),
  [app/lib/runtime/escalation-flow.ts](../../app/lib/runtime/escalation-flow.ts),
  [app/lib/runtime/turn.ts](../../app/lib/runtime/turn.ts).
- [JOURNAL.md](../JOURNAL.md): "Wave 3a".
