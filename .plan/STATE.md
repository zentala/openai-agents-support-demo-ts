---
formatVersion: 1
type: state
status: in-progress
updated: 2026-11-26T05:43:51
---

# State

## TLDR

H01–H16 are done and published. Public repo: https://github.com/zentala/openai-agents-support-demo-ts
(CI and Pages green). Live demo: https://openai-agents-support-demo.onrender.com/. Gallery:
https://zentala.github.io/openai-agents-support-demo-ts/. Last full eval on 2026-11-23: 57/59,
the two failures were scenario defects, fixed and rerun 4/4. Open work is small polish, listed in
[BACKLOG.md](BACKLOG.md). Nothing waits for the owner ([DECIDE.md](DECIDE.md)).

## What works

- Three agents with handoffs, input and output guardrails, code-enforced tool rules
  ([ARCH.md](ARCH.md)).
- Human approval in the consultant console, takeover, escalation in code, secure forms, guest mode,
  claims, address change, disputed records, honest "I forwarded it" claims (H15).
- Moderation of consultant replies, three strikes to a manager, manager escalation, report a
  message, ask a person about an answer, back to assistant (H16).
- Single page with three tabs ([ADR 008](ADR/008-single-page-with-tabs.md)).
- Recorded scenario gallery on GitHub Pages (H14).
- Gates: `just check` (typecheck, lint, unit tests, README catalog, icon and gallery checks);
  `just eval` against real models ([ADR 010](ADR/010-eval-and-smoke-as-acceptance-gate.md)).
- Hosting: Render free plan from the public repo ([ADR 011](ADR/011-hosting-and-public-demo.md)).

## Publication

The public repo receives a cleaned tree, not the local history: sync from a local clone with
`git archive HEAD`, run `node scripts/check-publication.mjs`, commit, push. Never add the public
repo as a push remote of this checkout. Render deploys through its API after the push.

## Known open issues

- Messages sent during a takeover stay in agent history; after hand-back the agent may answer the
  older one first ([ADR 007](ADR/007-escalation-in-code.md)).
- Cheaper agent models pass 32/38 scenarios (2026-11-10); the current default passes all
  ([backlog](backlog/prompt-tuning-for-newer-models.md)). Not scheduled.
- Docker image build is exercised only by Render, not locally (Docker is not installed here).

## History

Per-handoff briefs and reports: [handoffs/](handoffs/). Raw log: [JOURNAL.md](JOURNAL.md).
Earlier checkpoints of this file are in git history.
