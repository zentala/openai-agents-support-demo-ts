# H02 verification fixes — delivery report

Date: 2026-11-09. Repository: agent-demo. Branch: main.

All four implementation tasks are complete, with one commit per task.
`just check`, `just build` and the server restart all passed; status confirmed the service ready/live.
No eval, browser smoke, H03 implementation or push was performed. `.tours/` is unchanged.

## Tasks and commits

| Task | Importance | Points | Done / not done | Commit | Delivered behavior |
|---|---|---|---|---|---|
| 1 — thread/approval lifecycle | Medium | 2 | Done | `458c029` | Eviction skips threads with pending or partly decided approvals, choosing the next oldest eligible thread. Central removal clears every approval key for the removed thread. If all 100 slots are protected, thread creation returns a specific HTTP 429 and no cookie. README Security documents this. |
| 2 — unknown-order proof comparison | Low | 1 | Done | `752e26e` | Proof comparisons run before the customer-existence branch, with nonmatching placeholders for unknown orders. Tests observe both real helper calls and their arguments. |
| 3 — hidden characters in output | Low | 1 | Done | `14555a2` | Output leak detection strips invisible characters before checking accounts, phones, cards, prompt text and foreign data. Tests cover the supplied IBAN and a complete detection bypass. |
| 4 — test gaps | Low | 1 | Done | `0a7550d` | Added limiter memory/cap/expiry tests, malformed address-click HTTP tests, an explicit-public-default production warning test, and the requested Iceland claim example. |

Total: 5 points, Importance: Medium. Delivery documentation is committed separately.

## Acceptance results

| Check | Exit code | Done / not done | Observed evidence |
|---|---|---|---|
| `just check` | 0 | Done | Typecheck and lint passed; 29 Vitest files, 293 tests passed. |
| Task 1 revert | 1, expected | Done | All four new lifecycle tests failed when pending-thread protection and approval cleanup were disabled. |
| Task 1 restored | 0 | Done | All four lifecycle tests passed with the final source restored. |
| Task 3 final revert | 1, expected | Done | Five hidden-character output tests failed with pre-fix leak-detect.ts. |
| Task 3 restored | 0 | Done | All 13 guardrail tests passed with the final source restored. |
| `just build` | 0 | Done | Next.js 16.4.5 production build: compilation and TypeScript passed, seven static pages generated; `/` remains dynamic. |
| `restart the server` | 0 | Done | Command returned running; subsequent your process manager status exited 0 and confirmed `running`, `ready: true`, `live: true`, with a new process from this repo's app directory. |
| Real-model eval | Not run | Intentionally omitted | Explicit operator instruction: the OpenAI account has no credits. |
| Browser smoke | Not run | Intentionally omitted | Explicit operator instruction. No browser/runtime behavior acceptance is claimed. |

Recipes used `corepack pnpm` with `CI=true`. Unit and HTTP-handler tests used synthetic
fixtures and the existing test tools; no real-model calls were made.

Production artifacts observed after the successful build:

- `agent-demo/app/.next/BUILD_ID` — written at 20:19:47 local time.
- `agent-demo/app/.next/server/app/page.js` — written at 20:19:36 local time.
- `agent-demo/app/.next/server/app/api/threads/route.js` — written at 20:19:36 local time.

The existing your process manager service runs `next start` from `agent-demo/app` on port 4336,
loading `agent-demo/app/.next`. No second server was launched.

## Revert checks and targeted evidence

### Task 1

The revert temporarily selected the oldest thread regardless of approvals and removed
the cleanup call from `removeThread`, preserving the new interfaces so assertions
failed on behavior rather than an unavailable export. The source was restored in `finally`.

The four observed failures were:

1. A paused oldest thread disappeared instead of the next oldest eligible thread.
2. A removed partly decided run still accepted a decision (`waiting` instead of `unknown`).
3. A partly decided thread was evicted before its remaining approval was decided.
4. Thread creation returned 201 instead of 429 when all 100 slots were protected.

Restored result: 4/4 passed. Earlier targeted approval, audit, eviction and storage
suites also passed: 4 files, 16 tests; typecheck exited 0.

The shared paused-run registry is separated from SDK serialization so the thread
registry can inspect lifecycle state without importing agents/tools through a cycle.
The removal test also checks that another conversation's approval remains intact,
and that removed approvals cannot be resolved through the consultant path.

### Task 2

The guest suite passed 17/17. For both a known and unknown order, a spy around the
real comparator observed two calls: e-mail and postal code. The unknown order uses
the placeholder for both. This establishes the requested comparison code path,
not a wall-clock timing guarantee; the comments now make that distinction.

### Task 3

Revert round 1: pre-fix leak-detect.ts failed four prefix-hidden-character IBAN tests;
restored source passed all 12 then-current guardrail tests.

Inspection showed a nuance in the review's supplied example: the old detector failed
to identify it as an IBAN, but other numeric detectors happened to flag its digits.
A further probe inserts U+200B between every character of the IBAN. Before the fix,
`detectLeak` returned `[]` for that probe, demonstrating a full bypass.

Final revert round 2, including that probe: exit 1, five failures and eight passes.
Restored final source: exit 0, 13/13. Both rounds are retained here; the final full
`just check` includes the additional probe. Earlier guardrail, sensitive-data and
input-masking targeted suites passed 41 tests before that final probe was added.

### Task 4

Four targeted files passed 57 tests. New assertions cover:

- 500 denied guesses leave one bucket and the original five timestamps intact;
  denied requests do not extend expiry.
- The order table retains at most `MAX_TRACKED_ORDERS` entries, evicting the oldest
  when necessary and pruning expired buckets before still-live ones.
- Missing and empty `proposalId` return 400 / `InvalidRequest` through the real chat
  handler with valid thread credentials, before any agent turn executes.
- Explicitly configuring the public default emits exactly one production warning.
- "We do deliver to Iceland, I am not sure about the cost." matches the forbidden
  affirmative-claim pattern.

## Files changed

- Production: `app/lib/runtime/threads.ts`, `app/lib/runtime/approvals.ts`,
  `app/lib/runtime/pending-runs.ts`, `app/app/api/threads/route.ts`,
  `app/lib/guest/verification.ts`, `app/lib/guardrails/leak-detect.ts`.
- Tests: `app/tests/approval-eviction.test.ts`, `app/tests/guest-verification.test.ts`,
  `app/tests/guardrails.test.ts`, `app/tests/order-attempts.test.ts`,
  `app/tests/thread-security.test.ts`, `app/tests/session-secret.test.ts`,
  `app/tests/scenarios.test.ts`.
- Documentation: `README.md`, `.plan/JOURNAL.md`, this report.

The named single-writer lease hook stopped expired-lease writes before execution;
its printed acquire command succeeded and the writes resumed afterward.
Expected failures occurred only in the intentional revert checks. No failed source
check is concealed by the final passing results.

## Remaining scope

No implementation or requested automated source check remains outstanding.
Real-model and browser behavior were deliberately not checked in this task.
H03 remains unstarted; `.tours/` is unchanged; nothing was pushed.
