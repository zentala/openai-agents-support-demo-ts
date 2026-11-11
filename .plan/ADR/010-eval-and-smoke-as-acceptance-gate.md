# 010 — Eval suite and browser smoke as the acceptance gate

## TLDR

A change to the agents, prompts, models or provider is accepted only when the full eval suite
and the browser smoke pass. Unit tests and `just check` are the floor; they do not prove
model behavior.

- **Status:** accepted
- **Date:** 2026-11-10

## Context

Model behavior changes with the model, the prompt and the provider. Unit tests cannot see it.
Examples: the Triage agent answered from history without a tool call; the relevance guardrail
blocked the answer to the agent's own question; `gpt-6.1-terra` skipped handoffs.

## Options considered

1. **Unit tests only.** Fast and free, blind to model behavior.
2. **Manual spot checks.** Slow and not repeatable.
3. **Scenario eval against the real agents plus a Playwright smoke of the real UI.**

## Decision

Option 3.

- `just eval`: 38 scenarios (many multi-turn) run through the same `handleUserMessage` as
  the chat route and print a pass/fail table. Needs `OPENAI_API_KEY`; costs money.
- Browser smoke (`scripts/smoke-*.mjs`): Playwright against a running app, including the
  model path. A no-model layout flow also exists.
- `just check`: typecheck, lint, unit tests, CodeTour anchor check. No network.
- A regression test must fail on the reverted fix before it counts as proof.
- Any model or provider change must pass the full eval ([ADR 002](002-model-choice.md)).

## Consequences

- Eval results can flip on borderline scenarios; a failure is investigated, not silently rerun.
- The eval runner has a known defect (throws instead of recording FAIL when a proposal is
  missing): [backlog](../backlog/eval-runner-crash-on-missing-proposal.md).
- CI runs `just check`-level steps and build, not the eval (no key in CI).

## Evidence

- [app/scripts/eval.ts](../../app/scripts/eval.ts), [app/lib/eval/](../../app/lib/eval/),
  [app/data/scenarios.json](../../app/data/scenarios.json), [scripts/](../../scripts/).
- [JOURNAL.md](../JOURNAL.md), entry 2026-11-10: 38/38 eval, 70/70 smoke.
- [.github/workflows/ci.yml](../../.github/workflows/ci.yml).
