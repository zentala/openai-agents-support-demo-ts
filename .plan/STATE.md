---
formatVersion: 1
type: state
status: in-progress
updated: 2026-11-14T00:50:00+01:00
---

# State

## TLDR

H12's five items are implemented and separately committed: explicit AI/human/automatic messages,
citation icon and fixes for the nine H11 failures. Final check (573 tests), production build,
existing service restart and post-restart layout (276 checks) PASS. Independent source/image
review belongs to the coordinator; paid eval remains NOT_RUN and gated. The planned 17-case
selection costs an estimated USD 1.82 (range USD 1–6). No push in this session.
See the [H12 report](handoffs/H12-message-kinds-and-eval-fixes-report.md) for scope, evidence and limits.

## What works

- Three agents with handoffs, input and output guardrails, code-enforced tool rules
  ([ARCH.md](ARCH.md)).
- Human approval in the consultant console, takeover, escalation in code, secure forms, guest mode,
  claims, address change.
- Single page with three tabs ([ADR 008](ADR/008-single-page-with-tabs.md)).
- Gates: `just check` (typecheck, lint, unit tests, tour and README catalog checks). Historical
  model evidence: 38/38 eval and 70/70 model/browser smoke on 2026-11-10; H12 eval is pending.
- Local hosting: `just dev`; a process manager may run the production build.

## Pending

| Item | Where |
|---|---|
| Guardrail switch completed; defaults passed 38/38 eval (exit 0) | [backlog](backlog/switch-guardrail-model-to-luna.md), [ADR 002](ADR/002-model-choice.md) |
| Public hosting deployment | [ADR 011](ADR/011-hosting-and-public-demo.md) (ACCEPTED), [backlog](backlog/hosting-and-byok-public-demo.md) |
| README rewrite and screencast completed | [backlog](backlog/readme-and-screencast.md) |
| Prompt tuning for cheaper agent models | [backlog](backlog/prompt-tuning-for-newer-models.md) |
| H07 visual review accepted; H08 implementation awaits independent review | [backlog](backlog/design-review-follow-ups.md) |
| Everything else | [BACKLOG.md](BACKLOG.md) |

## Publication preparation

GitHub description (105 characters):
TypeScript multi-agent customer-support demo on the OpenAI Agents SDK: guardrails, human approval, evals.

H09 implementation and verification: [report](handoffs/H09-public-demo-byok-and-publication-prep-report.md).
H10 pre-publication fixes completed: [report](handoffs/H10-pre-publication-fixes-report.md).
Published 2026-11-11: https://github.com/zentala/openai-agents-support-demo-ts as one fresh commit of the cleaned tree (PREP.md kept local); CI green. Local history is not pushed there; never add it as a push remote. Next: owner connects Render (free) via the README button; Docker build gets its first real test there.
H11 owner walkthrough fixes (open): [handoff](handoffs/H11-owner-walkthrough-fixes.md).
H12 implementation completed; coordinator review and gated eval pending:
[handoff](handoffs/H12-message-kinds-and-eval-fixes.md), [report](handoffs/H12-message-kinds-and-eval-fixes-report.md).
Final checks: 385 tests / 47 files, 23 CodeTour anchors, build, 151 layout checks and
36 public-smoke checks including exactly one model turn. Independent source/visual review
passed. Public console is scoped to signed conversation cookies; its admin password is optional.
All requested items have separate commits; each lease was released after its commit.
Final checks: 42 test files / 352 tests, production standalone build, 151 layout checks,
one live BYOK turn, three revert proofs and independent source/visual review passed.
Docker image execution remains NOT_CHECKED (Docker unavailable).
No push, repository creation or external deployment is authorized in the implementer handoff.
The publication owner retains fresh-history publication and deployment.

## Next steps

1. Coordinator independently checks the [H12 report](handoffs/H12-message-kinds-and-eval-fixes-report.md), source and actual-host screenshots, then confirms the planned 17-case eval spend. No evaluation runs before that confirmation.
2. Publication owner deploys the prepared Render Blueprint ([ADR 011](ADR/011-hosting-and-public-demo.md)).
3. README and screencast are complete; remaining publication work stays in BACKLOG.
4. Re-check prior art, then push and watch the first CI run.

## Known open issues

- Missing address proposals now produce FAIL rows without aborting eval (H08a).
- Messages sent during a takeover stay in agent history; after hand-back the agent may answer the
  older one first ([ADR 007](ADR/007-escalation-in-code.md)).
- Polish KB retrieval ranks `refund-policy` above `returns-policy` for some queries.

History: [JOURNAL.md](JOURNAL.md), [handoffs/](handoffs/).

H07 implementation: all three parts committed; final check/build/restart/layout smoke exit 0, 137 browser assertions. Eval ran once, 38/38. No push. H07 visual review was subsequently accepted, as recorded in the H08 handoff.

H08: all three parts implemented and committed. Final check/build/restart/layout smoke exit 0; 346 tests, 151 browser checks. Only address eval ran, once, 2/2. Manual annotations, 8s GIF/WebM and README delivered. No push. Independent source/visual review is next.
