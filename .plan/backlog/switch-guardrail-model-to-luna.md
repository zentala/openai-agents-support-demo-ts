# Switch the guardrail model to gpt-6-luna

## TLDR

Decided 2026-11-10: guardrails use `gpt-6-luna`. The code default in `app/lib/config.ts` still says
`gpt-4.1-mini`. Change it and prove it with the full eval.

- **Importance:** High
- **Points:** 1
- **Status:** done (2026-11-10; H07a: 38/38 eval, exit 0)

## Current situation

`GUARDRAIL_MODEL` defaults to `gpt-4.1-mini` in [app/lib/config.ts](../../app/lib/config.ts).
An eval with agents `gpt-4.1` and guardrails `gpt-6-luna` passed 38/38 on 2026-11-10.

## Why

About 8x cheaper input and output (0.05/0.25 vs 0.40/1.60 USD per 1M tokens). The classifiers
are simple yes/no judges that run on every message.

## Proposal

1. Set the default to `gpt-6-luna` and update the comment above it.
2. Update `app/.env.example` (`OPENAI_GUARDRAIL_MODEL`) and the README model line.
3. Add a line to the [ARCH.md](../ARCH.md) impact log if the ADR text needs a status change.

## Acceptance

- `app/lib/config.ts` default is `gpt-6-luna`; the comment is accurate.
- `just check` passes.
- Full `just eval` passes 38/38 with no environment override.

## Links

- [ADR 002](../ADR/002-model-choice.md)
