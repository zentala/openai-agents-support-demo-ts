# Eval runner crashes on a missing address proposal

## TLDR

In `app/scripts/eval.ts`, `clickAddressCard` throws "no address change proposal is pending"
instead of recording a FAIL. One missing proposal stops the whole run.

- **Importance:** Medium
- **Points:** 1
- **Status:** done (H08a; offline regression and 2/2 address eval passed)

## Current situation

During the `gpt-6.1-terra` run on 2026-11-10 the model did not propose an address change in
`address-change-confirm`. `clickAddressCard` threw, and the run ended with 2 scenarios not run.

## Why

An eval must report a failing scenario, not abort. The crash is a runner defect, independent of
the model, and it hides results for later scenarios.

## Proposal

Catch the missing-proposal case in the runner and record a FAIL for that scenario with the
reason, then continue. Add a unit test for the runner path that does not need a model, and check
it fails on the old behavior.

## Acceptance

- A scenario without a proposal is recorded as FAIL with a clear reason; the run continues.
- The final table lists every scenario as PASS, FAIL or not run, and the exit code is non-zero
  on any FAIL.
- `just check` passes.

## Links

- [app/scripts/eval.ts](../../app/scripts/eval.ts)
- [prompt-tuning-for-newer-models](prompt-tuning-for-newer-models.md),
  [ADR 010](../ADR/010-eval-and-smoke-as-acceptance-gate.md)
