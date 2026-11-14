# Backlog

## TLDR

Index of open work. Each line links to an item file in [backlog/](backlog/) with the current
situation, reason, proposal and acceptance criteria. Points use the Fibonacci scale
(1, 2, 3, 5, 8, 13); `?` means unknown. See also [STATE.md](STATE.md), [ARCH.md](ARCH.md)
and [VISION.md](VISION.md).

| Item | Importance | Points | Status |
|---|---|---|---|
| [Switch guardrail model to gpt-6-luna](backlog/switch-guardrail-model-to-luna.md) | High | 1 | done (38/38 eval; code default switched) |
| [Hosting and BYOK public demo](backlog/hosting-and-byok-public-demo.md) | High | ? | open (ADR 011 proposed) |
| [README rewrite and screencast](backlog/readme-and-screencast.md) | High | 5 | done (README and reproducible GIF/WebM) |
| [Prompt tuning for newer models](backlog/prompt-tuning-for-newer-models.md) | Medium | 5 | open |
| [Eval runner crash on missing proposal](backlog/eval-runner-crash-on-missing-proposal.md) | Medium | 1 | done (scenario FAIL recorded; run continues) |
| [Developer annotations toggle](backlog/dev-annotations-toggle.md) | Medium | 3 | done (opt-in manual feedback) |
| [Design review follow-ups](backlog/design-review-follow-ups.md) | High | 48 | done (H07 visual review accepted per H08 handoff; N1–N7 fixed) |
| [Prior-art re-check before publication](backlog/prior-art-recheck-before-publication.md) | Medium | 1 | open |
| [GitHub CI first run and cross-platform check](backlog/github-ci-first-run-and-cross-platform.md) | Low | 2 | open |
- [x] **Triage sometimes answers an order question itself with no tool call** (closed 2026-11-14: a named own order goes to the Orders agent in code, `712d379`; a dead promise becomes a system line, ADR 003) — eval `order-delivery-address` failed 1 of 3 real runs (2026-11-14: reply "the address you confirmed during checkout", tools: none; passed on rerun). Same class as the claim confirmation fixed in `09fab0c`: nothing in code forces the handoff, only the prompt. Found by the H13 eval; consider routing named-order questions to the Orders agent in `app/lib/agents/requested-action.ts` or a triage output check. (Medium, 3)
- [ ] **escalation-next-step eval flags an honest answer as a contact promise** — `replyNotMatches` `(?:will (?!not\b)|going to )…(?:e-?mail|phone|call)` matched "does not guarantee that someone will contact you by email or phone" (full eval 2026-11-14, rerun passed). The regex cannot tell a promise from its denial; make it negation-aware (skip a match preceded by not/no/nie/nicht within the clause) in `app/data/scenarios.json`. Found by the H13 full eval. (Low, 2)
