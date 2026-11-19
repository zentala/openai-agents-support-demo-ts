# H02 — fixes from the independent review of H01

## TLDR

Independent review of H01 (Claude verifier, source-level) passed typecheck, lint,
275 tests and the README claims, and found one Medium defect plus small gaps.
Fix them with tests. Points: {ok. 5p}. Importance: Medium. Effort: high
(touches the approval and verification paths).

## Tasks

| # | Imp. | Pts | Task |
|---|---|---|---|
| 1 | Medium | 2 | Thread eviction (`app/lib/runtime/threads.ts:58`) can orphan a paused refund approval kept in `app/lib/runtime/approvals.ts:63` (`__nordicPending`); a consultant can still approve it and the answer reaches nobody. Never evict a thread that has a pending approval (pick the next oldest), and when a thread is removed for any reason clear its pending approvals. Test both; one sentence in README "Security → demo limits". |
| 2 | Low | 1 | `app/lib/guest/verification.ts:56` skips the proof comparison when the order does not exist (`customer && proofMatches(...)`), contradicting the constant-cost comment at :37. Always run the same comparisons against a placeholder. Test that the code path is the same (e.g. comparison helper called equally). |
| 3 | Low | 1 | Output leak check `app/lib/guardrails/leak-detect.ts:49` does not strip invisible characters before `containsSensitive`, so an IBAN with zero-width characters in a model answer passes. Strip first; test with `"P​L61 1090 1014 0000 0712 1981 2874"`. |
| 4 | Low | 1 | Test gaps: denied guest attempts do not grow memory and `MAX_TRACKED_ORDERS` caps the table; a request with missing/empty `proposalId` is refused through the chat route handler; the production log warning fires for an explicitly configured public default secret; add "We do deliver to Iceland, I am not sure about the cost." as a must-fail example in `app/tests/scenarios.test.ts`. |

Revert checks required for tasks 1 and 3 (test fails without the fix).

## Constraints and acceptance

Same as `.plan/handoffs/H01-wave3b-fixes.md` (lease hook, `corepack pnpm`, `CI=true`,
one commit per task, no AI attribution, do not edit `.tours/`, no push).
The OpenAI account has no credits: do NOT run `just eval` or the browser smoke.
Report: commits, `just check` exit code and counts, revert results, then
`just build` and `restart the server` exit codes. Write the report to
`.plan/handoffs/H02-verify-fixes-report.md`.
