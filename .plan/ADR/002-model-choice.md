# 002 — Model choice

## TLDR

Agents stay on `gpt-4.1`: it is the only agent model that passes the full eval. Guardrail
classifiers move from `gpt-4.1-mini` to `gpt-6-luna` (about 8x cheaper, 38/38 eval). The
choice is driven by the eval suite, not by release date or price list. The code default was switched and passed 38/38 again in H07a.

- **Status:** accepted
- **Date:** 2026-11-10

## Context

Defaults in [app/lib/config.ts](../../app/lib/config.ts): `AGENT_MODEL` `gpt-4.1`,
`GUARDRAIL_MODEL` `gpt-6-luna` (formerly `gpt-4.1-mini`). On 2026-11-09 `gpt-5.4-mini` skipped tool calls or returned
empty output after handoffs in 3 of 9 refund runs, so `gpt-4.1` became the default (9/9).
On 2026-11-10 newer, cheaper models were compared.

Prices (USD per 1M tokens, input/output, from OpenRouter):

| Model | In | Out |
|---|---|---|
| `gpt-4.1` | 2.00 | 8.00 |
| `gpt-4.1-mini` | 0.40 | 1.60 |
| `gpt-6.1-terra` | 0.50 | 2.50 |
| `gpt-6-luna` | 0.05 | 0.25 |

## Options considered

1. **`gpt-4.1` agents, `gpt-4.1-mini` guardrails** (baseline).
2. **`gpt-6.1-terra` agents, `gpt-6-luna` guardrails.** Cheapest agent setup.
3. **`gpt-4.1` agents, `gpt-6-luna` guardrails.** Keep the proven agent model, cheapen the
   classifiers.

## Results (2026-11-10)

| Setup (agents / guardrails) | Eval | Other |
|---|---|---|
| `gpt-4.1` / `gpt-4.1-mini` | 38/38 PASS | Browser smoke 70/70 PASS via http://127.0.0.1:3100/ |
| `gpt-6.1-terra` / `gpt-6-luna` | 32/38 PASS, 4 FAIL, 2 not run | About 2x slower than `gpt-4.1` |
| `gpt-4.1` / `gpt-6-luna` | 38/38 PASS, no crash | See "Experiment result" |

Failures with `gpt-6.1-terra` agents:

- `german-returns`, `language-switch`: answered "no information" without a handoff to FAQ or
  a `search_kb` call.
- `kb-unknown-offers-escalation`: escalated, but did not tell the customer.
- `claim-slot-filling`: escalated instead of calling `submit_claim`.
- The run then crashed on `address-change-confirm`: the model did not propose a change and the
  eval runner throws instead of recording a FAIL (runner defect, independent of the model;
  see [backlog item](../backlog/eval-runner-crash-on-missing-proposal.md)).

## Decision

- Agents: keep `gpt-4.1`. It is the only agent configuration that passes the full suite.
- Guardrails: use `gpt-6-luna`. The classifiers answer a simple yes/no with a short reason;
  the experiment shows no loss on the suite at about one eighth of the input price.
- Model choice follows the eval suite ([ADR 010](010-eval-and-smoke-as-acceptance-gate.md)).

## Experiment result

Eval with `OPENAI_MODEL=gpt-4.1` and `OPENAI_GUARDRAIL_MODEL=gpt-6-luna`: **38/38 PASS**,
no crash. Decision by the product owner, 2026-11-10: agents stay on `gpt-4.1`; guardrails move
to `gpt-6-luna`.

**Code switch implemented.** H07a ran the full eval once with the code defaults:
38/38 PASS, exit 0. See the [implementation report](../handoffs/H07-design-review-implementation-report.md).

## Consequences

- Guardrail cost drops by about 8x on every message.
- The agent model stays the expensive part. Cheaper agent models need prompt tuning first:
  [prompt-tuning-for-newer-models](../backlog/prompt-tuning-for-newer-models.md). That is the
  trigger to revisit this ADR.
- `modelSettingsFor` only sets reasoning effort for `gpt-5` models; newer families get
  provider defaults.
- Latency matters for a live demo; `gpt-6.1-terra` was about 2x slower.

## Evidence

- [JOURNAL.md](../JOURNAL.md), entries 2026-11-09 (model choice) and 2026-11-10.
- [app/lib/config.ts](../../app/lib/config.ts).
- Eval runner: [app/scripts/eval.ts](../../app/scripts/eval.ts); scenarios
  [app/data/scenarios.json](../../app/data/scenarios.json).
