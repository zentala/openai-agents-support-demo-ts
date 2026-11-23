# Backlog

## TLDR

Index of open work. Each line links to an item file in [backlog/](backlog/) with the current
situation, reason, proposal and acceptance criteria. Points use the Fibonacci scale
(1, 2, 3, 5, 8, 13); `?` means unknown. See also [STATE.md](STATE.md), [ARCH.md](ARCH.md)
and [VISION.md](VISION.md).

| Item | Importance | Points | Status |
|---|---|---|---|
| [Recorded scenario gallery](handoffs/H14-scenario-gallery-site-report.md) | High | 21 | local implementation done; owner-supplied public URLs configured; no push |
| [Private-session gallery recording correction](handoffs/H14-scenario-gallery-site-report.md#private-session-secret-correction-2026-11-16) | High | 8 | done locally: all 25 frames replaced, recorder guard and private random secret, GIF regenerated, 667 tests / 944 gallery assertions; no push |
| [Gallery coordinator review round 1](handoffs/H14-scenario-gallery-site-report.md#coordinator-review-round-1-2026-11-16) | High | 23 | done locally: 12 corrections, 667 tests and 941 browser assertions; no push |
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

- [ ] H15 leftovers (Low, 1p each, from the round-3 review): after a blocked claim `reply` holds only the fallback line while `messages` keeps the "Passed to a human" notice; check in the browser whether the streamed text part drops the notice. ARCH.md lost the row about prompt-level ticket state (D6); add it back.
- [x] Gallery polish: zoom removed on 2026-11-19, so the "step 4 zoom" item is obsolete; the 390px player position remains open below.
- [ ] Gallery on 390px: the player starts ~650px down — hide `.lead` on mobile or move the Shows chip below the player (Low, 1p).
- [ ] **Drop the old "do not push unless the owner asked" rule** (`AGENTS.md:92`, "Do not push, publish or spend model credits unless the owner asked"). Owner, 2026-11-23: the old "never commit without approval / never push" rules are removed everywhere; agents commit and push working branches freely, and the global Harness policy already auto-pushes `main`/`dev`. Keep the parts that still bind: publishing to public registries and spending model credits stay gated. Filed from the zentala.agency session. (Medium, 1p)
- [ ] **Customer ticket badge says "closed" while staff still work the ticket** — found by the H16 browser check (2026-11-23): after a hand-back (three-strike lockout or "Back to assistant") `ticketBadgeStatus` in `app/lib/client/ticket-status.ts` returns "closed" because the conversation no longer has an open ticket, while the console still lists the ticket as open for manager review. Decide what the customer should see (e.g. "with staff") and derive it from the ticket status, not from the conversation's open-ticket id. (Low, 2)
- [ ] **`just` recipes fail: corepack runs pnpm 11.28.13, project pins 11.25.0** — found 2026-11-23: `corepack pnpm` exits with "This project is configured to use 11.25.0 of pnpm", so `just check`/`just eval`/`just dev` fail on this machine. The 2026-11-23 eval and checks ran with plain `pnpm` (11.25.0). Align `packageManager` with what corepack resolves, or call `pnpm` directly in the justfile; verify on CI. (Medium, 1)
