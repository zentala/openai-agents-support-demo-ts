# H01 — finish wave 3b fixes (D3–D7) and the README Security section

## TLDR

Finish the verified defect fixes from the wave-3b review and write the public
README "Security" section. D1 and D2 are already committed (`3e2eadb`, `6ff11f7`).
D3 was started and left **uncommitted** when the previous worker hit a usage
limit: `app/lib/guest/verification.ts` (modified) and `app/lib/guest/order-attempts.ts`
(new). Inspect that work, finish or redo it, then D4–D7 and the README.
Points: {ok. 8p}. Importance: High (blocks publication).

## Context

- App: Next.js in `app/`, OpenAI Agents SDK JS. Read `README.md`, `docs/BUILD-v1.md`
  ("Audience rule": TSDoc headers, explanatory comments on library calls,
  `// SECURITY:` and `// INTERVIEW:` markers, specific visible errors; files ≤ 250
  lines, functions ≤ 50 incl. nested), and `.plan/JOURNAL.md`.
- The code is a teaching artifact being prepared for publication. Never downgrade
  existing features. Do not edit `.tours/` (the coordinator updates it).

## Tasks

| # | Imp. | Pts | Task |
|---|---|---|---|
| D3 | Medium | 3 | `app/lib/guest/verification.ts`: e-mail is REQUIRED (postal code may be an extra factor, never a substitute); add a global per-order attempt limit (e.g. 5 per order per hour, in memory, `order-attempts.ts`) on top of the 3-per-thread lock; failures reveal nothing about which field was wrong. Update README, scenarios and tests. |
| D4 | Low | 1 | `app/lib/security/thread-credential.ts:34`: warn about the public default `SESSION_SECRET` in every mode except `next dev`/tests, and show a small visible notice in the Agent View when the default is in use. |
| D5 | Low | 1 | `app/data/scenarios.json` `kb-unknown` `replyNotMatches` is too loose (a variable-length lookbehind excuses any earlier hedge word: "We don't ship much, but we deliver to Iceland" passes). Make it strict again and add unit tests with positive and negative examples. |
| D6 | Low | 2 | `app/lib/address/address-flow.ts`: give each address proposal an id/nonce carried by the card and required on confirm; a stale card is refused with a visible message. |
| D7 | Low | 1 | Global in-memory caps: max threads (evict oldest), max photos total, max vault entries; named constants, documented. |
| R | High | 2 | README "Security" section (see below). |

Tests that must fail when their fix is reverted (check and report): D3, D5, D6.

### README "Security" section must contain

1. What was hardened during development and why: the customer browser could
   approve its own refund via `/api/chat` (fixed); the SSE stream leaked internal
   events to anyone knowing a threadId (fixed: signed httpOnly thread cookie +
   customer event allowlist); CSRF on admin POSTs (Origin check); Basic auth now
   UTF-8; tool errors were swallowed by the SDK's default `errorFunction` (fixed);
   client crash on plain HTTP because `crypto.randomUUID` needs a secure context
   (fixed); masking of IBANs with `.`/`/` separators and invisible characters (D1, D2);
   D3–D7 above.
2. Honest demo limits: without `ADMIN_PASSWORD` the open console can approve
   refunds; no rate limiting on `/api/threads`, `/api/chat` and uploads beyond the
   caps (use a proxy/WAF limit in production); everything is in memory (transcripts,
   photos, vault) and lost on restart; `x-forwarded-proto/host` are trusted, so
   deploy behind a trusted reverse proxy only; masking scope and its limits;
   consultant identity in the audit is self-declared (production needs SSO).

## Constraints

- Work on `main` in this repo. A single-writer lease hook may block writes; when
  blocked, run exactly the `lease acquire ...` command it prints (expires ~90 s).
- `corepack pnpm`, `CI=true`. Conventional Commits, one commit per task, no AI attribution.
- your process manager serves the production build at http://127.0.0.1:3100/ (service
  `the local demo service`, `next start` on 4336; your process manager injects `OPENAI_API_KEY` and
  `SESSION_SECRET`). At the end: `just build`, then `restart the server`.
- The OpenAI key on this machine is injected automatically by `scripts/with-key.mjs`
  (`just eval <ids>`). Never print or write the key.

## Acceptance (report exit codes and evidence)

- `just check` and `just build` pass.
- Revert checks for D3, D5, D6 (test fails without the fix, passes with it).
- `just eval` for the guest scenarios and `kb-unknown` (list ids and results).
- After the server restart: `PROXY_PAC=<your proxy PAC, if any> node scripts/smoke-v1.mjs http://127.0.0.1:3100/` — report all checks.
- Report commits, files changed, anything left undone with the reason.
