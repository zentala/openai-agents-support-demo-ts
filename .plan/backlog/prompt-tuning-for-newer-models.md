# Prompt tuning for newer models

## TLDR

Tune prompts and model settings so a cheaper, newer model passes the full eval for the agents.
First re-check which OpenAI models are current, popular and cost-efficient at the time of work.

- **Importance:** Medium
- **Points:** 5
- **Status:** open

## Current situation

Agents run on `gpt-4.1` (USD 2.00/8.00 per 1M in/out). On 2026-11-10 `gpt-6.1-terra` (0.50/2.50)
agents with `gpt-6-luna` guardrails scored 32/38 with 2 scenarios not run, and ran about 2x slower.

Failure analysis (2026-11-10):

- `german-returns`, `language-switch`: the model answered "no information" without handing off to
  FAQ or calling `search_kb`.
- `kb-unknown-offers-escalation`: it escalated but did not tell the customer.
- `claim-slot-filling`: it escalated instead of calling `submit_claim`.
- `address-change-confirm`: the model did not propose a change; the runner then crashed
  ([separate item](eval-runner-crash-on-missing-proposal.md)). Two scenarios did not run.

`modelSettingsFor` in [app/lib/config.ts](../../app/lib/config.ts) only sets reasoning effort for
`gpt-5` models; newer families get provider defaults.

## Why

Agent cost and latency dominate a live demo. A cheaper, faster model that passes the same suite
is a real gain, and the tuning work is good material to explain.

## Proposal

1. **Re-check the model landscape first.** At the time of work, list current OpenAI models, check
   popularity (for example OpenRouter rankings) and price, pick candidates, and write down why in
   the ADR. Today's candidates: `gpt-6.1-terra` for agents, `gpt-6-luna` for guardrails.
2. Fix the eval runner crash first so one failure cannot hide the rest.
3. For each failing scenario, inspect the trace: is the cause the prompt, the handoff
   description, or the model's tool-use habit?
4. Adjust prompts ([prompts.ts](../../app/lib/agents/prompts.ts)), handoff descriptions
   ([index.ts](../../app/lib/agents/index.ts)) and `modelSettingsFor` (reasoning effort and similar
   settings for the new family).
5. Run the full eval several times; compare latency against `gpt-4.1`.

## Acceptance

- The candidate model passes 38/38 in at least three consecutive full eval runs.
- Browser smoke passes with it.
- Latency and cost are recorded next to `gpt-4.1`.
- [ADR 002](../ADR/002-model-choice.md) is updated (or superseded) with the evidence, and the
  default in `config.ts` changes only if the evidence supports it.

## Links

- [ADR 002](../ADR/002-model-choice.md), [ADR 010](../ADR/010-eval-and-smoke-as-acceptance-gate.md)
- [JOURNAL.md](../JOURNAL.md), entry 2026-11-10
