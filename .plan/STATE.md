---
formatVersion: 1
type: state
status: in-progress
updated: 2026-11-19T04:02:09
---

# State

## TLDR

H14 private-session recording correction is complete locally. The recorder now starts
its app with a random private SESSION_SECRET only in process memory and refuses a visible
public-default-secret notice before model work and every screenshot. All 14 scenarios
were re-recorded (25 new frames; no cache reuse) under the owner's approved corrective AI
spend. README GIF/WebM and gallery screenshots are refreshed. Final `just check` PASS,
exit 0: 667 tests / 78 files and 944 gallery assertions, including capture-guard refusal.
No key/secret was saved or printed; no push or deployment. See the latest report section.

H14 coordinator review round 1 is locally complete: all ten visual items and both source
items have separate commits after the accepted DESIGN decisions. Final `just check` PASS,
exit 0: 667 tests / 78 files and 941 browser assertions across 1440/390 plus 819/820 resize
boundaries. Production build PASS, exit 0; required top/mid-step/last-step/live screenshots
captured and inspected at both widths. The report below retains the earlier delivery history.

H14 local delivery: 14 English-input scenario recordings (25 real WebP frames with
measured focus bounds), static gallery/player, generated shared icon assets, prepared
Pages workflow and captioned README GIF/WebM. The coordinator implemented and verified
directly under the owner's explicit instruction; no DM/reviewer agents, push, other-machine
contact or report publication. See the [H14 report](handoffs/H14-scenario-gallery-site-report.md).
Final `just check` PASS, exit 0: 667 tests / 78 files and all existing owning checks;
all 14 scenarios play/stop/replay at 1440/390 (944 assertions). Production build passed.
All recordings now use the private-session setup; the GIF is 522187 bytes with an exact 4s final hold. The owner supplied the public live
demo URL, https://openai-agents-support-demo.onrender.com/, on 2026-11-16. Gallery and
README now link to it; the README and app header use the confirmed GitHub Pages gallery
URL. The [DECIDE.md](DECIDE.md) item is resolved. Publication remains with the coordinator.

The following H13/H12 paragraphs are historical checkpoints, superseded for H14 readiness
by the owner's explicit instruction that H13 is done and H14 should execute now.

H13 coordinator review round 2: three small corrections in one commit. Reset source/export
is RefreshCcw (retry RotateCw, replay RotateCcw); remaining human/UserRound and No AI needed
design rows are explicitly superseded; report references use final DESIGN line numbers.
`just check` PASS, exit 0: 662 tests / 76 files and all owning checks. No new screenshots,
build or restart requested; round-1 runtime evidence is historical. Stop for coordinator
verification; H14 remains NOT_STARTED. No push, model calls or report publication.

Published 2026-11-16: H13 + H14 — gallery live at https://zentala.github.io/openai-agents-support-demo-ts/, frames re-recorded without the default-secret notice. Open: two Low gallery polish items in BACKLOG.
H13 coordinator review round 1 corrections (2026-11-15): staff identities share
consultant/Headset, reset is distinct from replay, metrics/chips have icons, starters/menu
use the rule badge, historical design rows are superseded, and additional states captured.
Six separate correction commits, each with immediate lease release. Corrected-source
`just check` PASS (662 tests / 76 files), production build and managed restart exit 0;
303 layout checks with console `[]` and 9 isolated public-key checks PASS. Twenty H13
screenshots at 1440/390; all non-H13 screenshots restored. Address/approval previews are
explicitly display-only; SDK/business execution and model behavior are not claimed.
Independent coordinator re-review is next. H14 is NOT_STARTED and must wait. No push,
model calls, report publication or other-machine contact. Earlier failures remain in
the [H13 report](handoffs/H13-icon-registry-report.md).

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

Published 2026-11-14: H11 + H12 to the public repo (commit 8a569a1) and Render (live, browser-checked). Final full eval 48/49 (escalation-next-step regex flags an honest denial; passed on rerun; BACKLOG). Open: two Low review notes (address draft persists after "Stop" if no tool runs; REFUSED-path test), local verify skill missing.
H13 icon registry (open): [handoff](handoffs/H13-icon-registry.md). H14 scenario gallery site (open, after H13): [handoff](handoffs/H14-scenario-gallery-site.md).
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
