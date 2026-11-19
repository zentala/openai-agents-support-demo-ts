# H06 — flaky test, last polish evidence, CodeTour refresh

## TLDR

H05 passed the combined visual and source review. Remaining: one flaky unit test
that randomly fails `just check`, two small evidence gaps, and the CodeTour
(`.tours/01-how-the-agent-works.tour`) whose line numbers drifted during H01–H05.
Points: {ok. 5p}. Importance: Medium (flaky gate). Effort: low.

## Tasks (commit per item)

| # | Imp. | Pts | Task |
|---|---|---|---|
| 1 | Medium | 1 | `app/tests/sensitive-data.test.ts:149` asserts `not.toContain("1090")` on the whole serialized event log; a random event UUID can contain "1090" (observed: `...b66109011800`). Assert the absence of the full IBAN and of the digit groups only in user-visible/status fields, not in ids. Run the file 20 times in a loop to show it is stable. |
| 2 | Low | 1 | `scripts/smoke-polish.mjs:45-48`: add an assertion that the bottom gradient disappears when the scenario menu is scrolled to the end. |
| 3 | Low | 1 | Re-take `docs/screenshots/h05-runner-768.png` with the pointer moved away (it shows a hover state). |
| 4 | Medium | 2 | CodeTour: this is the owner's learning walkthrough (Polish descriptions). Update every step's `line` and every line number mentioned in the descriptions so they point at the described code after H01–H05 (e.g. `use-support-session.ts`, `route.ts`, `run-support.ts`, `agents/index.ts`, `prompts.ts`, `orders.ts`, `refund.ts`, `approvals.ts`, `turn.ts`, `rules.ts`, `auth.ts`, `thread-access.ts`, `event-visibility.ts`, `secure-forms.ts`, `verification.ts`). Keep the descriptions' meaning; fix wording only where the code changed (e.g. approvals now decided in the Consultant tab, `/admin` is a redirect). Add one step for the turn trace selector (`app/lib/client/turn-trace.ts`) and one for the workspace tabs (`app/components/workspace.tsx`), Polish, same style. Write a tiny checker script (`scripts/check-tour.mjs`, plain Node) that fails if any step's line is beyond the file end or the line text no longer contains a short `pattern` you add to each step as a `"pattern"` field (CodeTour supports `pattern`); add it to `just check`. |

## Constraints and acceptance

Same constraints as `.plan/handoffs/H05-polish.md`. You MAY edit `.tours/` in this
handoff (only item 4). No `just eval`, no push. Acceptance: `just check` (incl. the
tour checker) passes; item 1 loop output; `just build`, `process-manager restart
the local demo service`; report to `.plan/handoffs/H06-flaky-test-and-tour-report.md`.
