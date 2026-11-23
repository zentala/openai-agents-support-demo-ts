# H16 implementation and verification report

## Delivery

Implemented M1–M7 on worktree branch `feat/h16-manager-moderation`, with a separate task commit for each M1–M6 item and a separate M7 commit. Follow-up test and review fixes are additional commits on the same branch. Nothing was merged or pushed, and the main checkout was not modified.

- M1 blocks rude consultant replies, keeps the draft in the composer, reports classifier errors visibly and fails closed.
- M2 applies a three-strike per-thread lockout, alerts the manager with blocked drafts, scopes manager-only records and allows manager unlock.
- M3 adds deterministic manager-request routing and staff escalation with a reason.
- M4 adds customer and agent message reports, manager review routing and report export.
- M5 adds question tickets tied to an AI answer and consultant replies linked to the quoted answer.
- M6 hands a consultant conversation back to the assistant while preserving open complaint and manager tickets.
- M7 replaces the transient no-thread placeholder with the existing customer-data loading state; guests see the unverified notice immediately. The selected customer's authenticated thread snapshot supplies profile, address and order data before any customer message.

The handoff, DESIGN.md and architecture impact log were updated. README scenario inventory now contains 59 scenarios.

## Offline verification

| Check | Result |
|---|---|
| M7 tests | PASS: 2 new component tests cover selected-customer loading and the immediate guest notice before thread creation; the 3 existing customer snapshot security tests remain. |
| `just check` | PASS after M7, exit 0: 86 test files, 721 tests; typecheck/lint and repository checks passed; gallery smoke passed at 1440px and 390px (14 scenarios, 1,004 assertions, no model/network calls). |
| `just build` | PASS after M7, exit 0; Next.js 16.4.5 compiled, typechecked and generated all 8 static pages. Worktree artifact: `app/.next/BUILD_ID`. |
| `just eval` | NOT RUN, as required pending owner approval for H16 model spend. |

The original H16 `just check` required stale assertion and fixture fixes, then a worktree-local ignored `research/` directory for its gallery report. During M7, a `.tsx` test file was not included by the repository's Vitest include pattern; it was moved into the existing `.test.ts` file. That file retains the 3 original authorization/snapshot tests plus the 2 M7 tests. The final M7 `just check` passed with 721 tests. No failed result is represented as a pass.

## Browser verification

The app ran as a plain worktree process at `http://127.0.0.1:3137` and was stopped after QA. Port 3127 was free but its first server attempt did not answer HTTP; the app was then started directly on the second requested port. No process manager or preview route was used. Screenshots were saved under the ignored worktree directory `docs/screenshots/`.

| Browser check | 1440px | 390px |
|---|---|---|
| Blocked rude consultant reply; draft stays in composer with reason | PASS | PASS |
| Three-strike lockout and manager-only alert with blocked drafts | PASS | PASS |
| Customer asks for a manager; manager queue receives the ticket | PASS | PASS |
| Selected customer's profile, address and orders before first message | PASS | PASS |
| Guest sees "Not verified yet" | — | PASS |
| Report an AI answer and ask a person about an AI answer | NOT CHECKED | NOT CHECKED |
| Return to assistant after a consultant reply | NOT CHECKED | NOT CHECKED |

The manager-request and human-request flows showed `model skipped` in the Agent trace; no eval was run. The report/ask flows and hand-back after a staff reply would require an AI answer or a staff reply to pass tone classification. Those checks were left NOT_CHECKED to avoid using unapproved H16 model spend.

Screenshots:

- `h16-customer-selected-no-message-1440.png`, `h16-customer-selected-no-message-390.png`, `h16-guest-unverified-390.png`
- `h16-manager-escalation-1440.png`, `h16-manager-escalation-390.png`
- `h16-blocked-reply-1440.png`, `h16-blocked-reply-390.png`
- `h16-consultant-locked-out-1440.png`, `h16-consultant-locked-out-390.png`
- `h16-manager-lockout-alert-1440.png`, `h16-manager-lockout-alert-390.png`

The customer screenshots show a selected verified customer's masked profile, saved address and orders while the chat still has no customer messages. The guest screenshot shows the immediate unverified state. The manager-request turn displays `model skipped`; no eval was run.

## Eval scenarios awaiting approval

No eval scenario was run. Once the owner approves H16 spend, the targeted H16 scenarios to run are:

- `h16-manager-request-en`
- `h16-manager-request-pl`
- `h16-manager-request-de`
- `h16-report-ai-answer`
- `h16-ask-person-answer`

## Review round 1 remediation

The independent verifier returned FAIL on M2, M3, M6, M4, M1, manager tone-check ordering and documentation. The follow-up changes are committed separately by task; M1's staff reply source also includes the requested tone-order correction.

- **M2:** the admin action boundary rejects every non-manager staff action against a locked thread, including plain `take_over`. At the third blocked reply, the active takeover returns to the assistant; the open `manager_review` ticket stays open. Offline coverage checks the plain action and takeover release/ticket state.
- **M3:** manager-request patterns cover the reported EN/PL/DE wording. The deterministic manager decision is evaluated before human takeover routing, so an active takeover is released and a manager ticket is opened. An offline turn test verifies this path skips the model.
- **M6:** Back to assistant moved into the customer's takeover banner and uses `POST /api/threads/[threadId]/hand-back`, protected by the thread credential. The consultant's Hand back remains in the reply area.
- **M4/M5:** report/question claims require their matching successful tool result or a report/question record for the same thread. An unrelated open ticket and a claim result do not back a report. Question creation now returns `QUESTION_CREATED`.
- **M1/manager:** tokens beginning with “dummy” bypass the local `dumm` stem and reach the classifier. Manager tone classification runs before manager takeover mutation.
- **Docs:** the staff reply ADR is now 014 (013 remains the recorded gallery ADR); ADR 004 marks the tone warning superseded; DESIGN records the three requested surfaces; ARCH records M4/M5 impact.

### Verification evidence

| Check | Result |
|---|---|
| First `just check` after remediation | FAILED, exit 1: three Polish manager phrase cases, a stale report-claim expectation, a manager test fixture using an already-removed thread, and a manager-turn assertion expecting English instead of the configured Polish notice. |
| Follow-up `just check` | PASS after the first corrections: typecheck and lint passed; 87 test files, 735 tests; README scenario catalog, icon checks and export checks passed; gallery passed at 1440px and 390px (14 scenarios, 1,004 assertions, no external requests or model calls). |
| Final `just check` | PASS on final source: typecheck and lint passed; 87 test files, 736 tests; README scenario catalog, icon checks and export checks passed; gallery passed at 1440px and 390px (14 scenarios, 1,004 assertions, no external requests or model calls). |
| Final `just build` | PASS: Next.js 16.4.5 compiled, typechecked and generated all 8 static pages, including `/api/threads/[threadId]/hand-back`. Worktree artifact: `app/.next/BUILD_ID`. |
| `just eval` | NOT RUN. No eval scenario was run; H16 model spend remains unapproved. |
| Independent source review round 4 | PASS for M1/M2/M3/M4/M6, manager tone ordering, docs and the round-2 findings. The round-2 FAIL findings were fixed; the round-3 M6 ticket-preservation concern was withdrawn after the reviewer re-read the current endpoint, which uses `releaseTakeoverPreservingTickets` and does not resolve open tickets. |
| Independent screenshot review | PASS at 1440px and 390px: banner and action fit, mobile wraps without clipping, composer remains reachable. |
| H16 review round 2 `just check` | PASS after the ticket privacy and German phrase fixes: typecheck and lint passed; 87 test files, 740 tests; repository checks passed; gallery passed at 1440px and 390px (14 scenarios, 1,004 assertions, no external requests or model calls). |

The failed checks remain recorded as failures; the latest successful check is the current source verification. The temporary Playwright driver had four harness-only failures (module resolution, an overly broad status selector, a result element removed with its banner, and a relative URL in the ticket-state probe) before the corrected run passed. The driver used synthetic in-memory tickets; the dev server was stopped and no model calls or persistent data writes occurred. Browser report and ask-a-person flows that need a model-produced answer remain NOT CHECKED because eval/model spend is still unapproved. No eval scenario ran.

### Customer hand-back browser evidence

Using a plain worktree dev server at `http://127.0.0.1:3127` and Playwright, a synthetic manager ticket was opened, the manager took over, and the customer used Back to assistant. The banner disappeared, the customer saw the assistant confirmation, and the manager ticket remained open at both widths. The server was stopped after the check.

- `docs/screenshots/h16-customer-handback-1440.png`
- `docs/screenshots/h16-customer-handback-390.png`

The screenshots show the reachable button before activation. After clicking it, the browser check verified the assistant confirmation, takeover banner removal and the still-open manager ticket; no post-action screenshots were retained.

## Review round 2 remediation

- **Customer ticket privacy:** `/api/threads/[threadId]/customer` now projects tickets to `{ id, category, status, createdAt }`; full summaries and reasons remain in the consultant console. The Customer tab displays a readable category label and status, never `summary`. Regression coverage seeds staff drafts, lockout/escalation reasons and reported text, then verifies none are present in the response.
- **German manager requests:** the bare `Chef`/`Vorgesetzten` matches were removed. Escalation requires a request phrase such as “Kann ich mit dem Chef sprechen?” or “Vorgesetzten, bitte.” Tests include both manager requests and ordinary mentions such as “Der Chef von Ikea hat das gesagt.”
- **Verification:** review-round-2 `just check` passed with 740 tests. No eval was run.

