# H10 — pre-publication fixes

## TLDR

The H09 independent verification found no publication blocker, but five medium and four low
findings. Fix them before the repository goes public. PO decision: in public mode every visitor
sees only their own conversations (console, tickets, approvals, metrics), so an `ADMIN_PASSWORD`
is no longer required for a safe public demo. Points: {ok. 13p}. Importance: High. Effort: high.

## Fixes

| # | Pts | Fix |
|---|---|---|
| M1 | 1 | `app/lib/security/request-key.ts` `redactSecrets`: the regex `sk-[A-Za-z0-9_*.-]+` also eats "desk-lamp", "risk-free", "task-chair". Use a word boundary and real key shapes: `sk-`, optional `proj-`/`svcacct-`/`admin-`, at least 20 characters. Tests: real-shaped keys are redacted; the three words above stay intact. |
| M2 | 2 | `app/lib/security/public-rate-limit.ts`: the leftmost `X-Forwarded-For` entry is client-controlled. Add `TRUSTED_PROXY_HOPS` (default 1 = rightmost entry, 0 = ignore the header). On the 10 000-bucket cap, evict expired and then oldest buckets instead of refusing. Tests for both. |
| M3 | 3 | Missing tests: the key never lands in localStorage, a cookie or a URL; the guardrail classifier refuses without a key; resuming an approval without a key refuses and does not consume the decision; tickets and paused state never contain the key; one test asserts the real log output carries no key. |
| M4 | 1 | Replace the owner's first name in `research/2026-11-09-code-visibility-tools.md` and `research/codex-prompt-code-visibility.md` with "the developer"; add the name to the publication scan pattern. |
| M5 | 5 | Per-visitor scoping when `PUBLIC_DEMO=true`: console, state API, inspector stream, tickets, approvals, audit, ratings and metrics show only threads bound to the visitor's session cookie. `ADMIN_PASSWORD` becomes optional in public mode. Update `render.yaml`, README, ADR-011 (or a new ADR-013), `.plan/ARCH.md` and its impact log. Tests both ways (own thread visible, foreign thread hidden and refused). Smoke with two browser contexts. |
| L1 | 1 | Visitor key form: show an HTTPS warning, and refuse to send the key over plain HTTP to a non-loopback host. |
| L2 | — | README top line: "Unofficial — not affiliated with OpenAI." |
| L3 | — | Replace the private proxy PAC URL in handoffs and docs with generic wording ("your proxy PAC, if any"). |
| L4 | — | Revert the hand edit in the lockfile, exclude lockfiles from the scan, verify `corepack pnpm install --frozen-lockfile`. |

## Constraints

Same as H07–H09: `corepack pnpm`, `CI=true`, lease hook, commit per item, no AI attribution,
no push, no repository creation, no full `just eval`. At most one model turn in the public smoke.
Do not commit logs or screenshots that contain private names or paths; restore committed
screenshots with `git restore -- docs/screenshots` if a smoke overwrote them.

## Acceptance (report exit codes)

`just check`, `just build`, restart the local server, layout smoke, public-demo smoke with two
contexts, and the publication scan (private topology, owner name, key shapes) with its output.
Report: `.plan/handoffs/H10-pre-publication-fixes-report.md`.
