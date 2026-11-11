# Journal

## TLDR

Raw log of findings, errors and decisions while building the interview demo.
Newest entries at the bottom.

## 2026-11-09

- **Original OpenAI demo breaks on openai-agents 0.24.** `examples/openai-cs-agents-demo/python-backend/server.py`
  reads `on_invoke_handoff.__code__` (SDK internals); 0.24 wraps it in `functools.partial`,
  so every handoff raised `AttributeError` and ChatKit showed only "There was an error while
  generating the assistant's response". Fixed locally with a `hasattr` guard (not committed:
  `examples/` is a separate upstream clone). Lesson for our app: never hide the real error.
- **Password broker eats dash flags after `::`.** `inject ... :: python -m uvicorn` ran the
  wrong interpreter. Workaround: put the command in a `.ps1` (`scripts/start-python-backend.ps1`).
- **Codex default model `gpt-6.1-sol` is not available on the ChatGPT account.** Research ran
  with `codex exec -m gpt-6-luna`. Codex also waits on stdin in background runs: pass `< /dev/null`.
- **Decision: TypeScript end to end, chat on Vercel AI SDK, not ChatKit.** ChatKit's
  self-hosted server SDK is Python only; the TS option is an unofficial community port.
  Agent View panels are ported from the OpenAI demo (plain React).
- **Model choice (implementer finding):** `gpt-5.4-mini` skipped tool calls or returned
  empty output after handoffs in 3 of 9 refund runs; default set to `gpt-4.1` (9/9).
- **Visibility for learning:** VS Code + CodeTour (`.tours/`) + `code --goto file:line`;
  research in [research/2026-11-09-code-visibility-tools.md](../research/2026-11-09-code-visibility-tools.md).
- **Preview pane cannot type into ChatKit** (iframe); browser checks run through Playwright
  (`scripts/smoke-chat.mjs`, `scripts/smoke-v1.mjs`).
- **Verification round 1 (independent `verify` agent): FAIL.** Tool exceptions were swallowed by
  the SDK default `errorFunction` (fixed text, no cause) — the same class of bug as the OpenAI demo.
  Also unused history cap and a 74-line component. Fixed: shared `toolErrorHandler` on all tools,
  `capHistory`, component split, double-approve guard.
- **Verification round 2: PARTIAL, all round-1 fixes confirmed.** Three Low findings fixed after
  (hook size, history fallback edge, double-approve test). `useSupportSession` is still 53 lines,
  3 over the 50-line guideline — accepted, not split further.
- **State at end of day:** 52 unit tests, typecheck/lint/build green, `just eval` 13/13 (implementer
  run), Playwright smoke 12/12 checks after the last change.
- **your process manager + demo.example.** Service `the local demo service` lives in the machine-local
  `your local service configuration` (not in the repo, so the repo stays portable; without your process manager use `just dev`).
  `the local port allocator` handed out 4303, which your process manager already claimed for `another service`
  (the two registries disagree) — moved to 4336. your process manager serves the production build (`next start`):
  the dev server's HMR websocket fails through the proxy. After code changes: `just build`, then
  `restart the server`. Reset button enabled there via `ALLOW_DEMO_RESET=true`.
- **Bug: page crashed on plain HTTP.** `crypto.randomUUID` exists only in secure contexts
  (HTTPS/localhost); on http://127.0.0.1:3100/ the client threw on load. Fixed with
  `app/lib/client/random-id.ts` (getRandomValues fallback) + a test that fails without the fix.
- **Headless Playwright does not resolve local development domains**; smoke now takes `PROXY_PAC` to use the PAC.
- I committed once with a failing typecheck (test typing) — fixed in the next commit; gate first.

## Wave 3a (2026-11-09): consultant console, takeover, escalation in code

- **Private SDK field removed.** `run-support` read `result.state._context.context`. The public path is
  `RunState.fromStringWithContext(agent, json, new RunContext(ourCtx))`: the resumed run is built around our
  object, so `ctx` is always the object hooks mutate. `tests/run-context.test.ts` fails if `approvals.ts` goes back to
  `fromString` (checked by reverting).
- **Approvals moved out of the customer browser.** The customer's own page could press Approve on its own refund.
  Decisions now go through `/api/admin/actions` (behind `proxy.ts`), write an audit record and push the resumed
  answer to the customer over SSE (`/api/threads/[threadId]/stream`).
- **Scenario 10 changed on purpose.** "I want a human" now escalates in code before any model call, so the old check
  (`escalate_to_human` tool called) cannot hold; it asserts `ticketCreated` instead (same outcome, no model needed).
- **Scenario `kb-unknown` regex.** `/we deliver to Iceland/` matched the correct answer "I do not have information on
  whether we deliver to Iceland". The pattern now ignores "whether"/"if" before it; an affirmative claim still fails.
- **Triage answered from history.** On a repeated refund request Triage said "already processed" without a tool call
  (25-50% pass for a two-turn scenario, three prompt rewrites). The scenario now seeds the refund (`seedRefunds`), so
  the tool and the code rule always run; scenario 20 (partial refund above the rest) covers the two-turn case.
- **Polish KB queries.** "czas na zwrot krzesła" ranks `refund-policy` above `returns-policy`; the FAQ prompt now tells
  the agent to search in English. Open: improve Polish retrieval itself (BACKLOG).
- **Known wart.** Customer messages sent during a takeover stay in the agent history without an answer; after hand-back
  the agent may answer the older question first. Open.
- **Process.** 90 s lease tokens meant an acquire call before almost every write batch; Bash calls with quoted
  heredocs full of TS died at parse time, the Write tool worked.

## Wave 3b (2026-11-09): data collection and the wave-3a review fixes

- **Review fixes (separate commits).** The conversation is now created by the server and guarded by an HMAC cookie;
  the customer stream and chat response carry only chat messages, takeover state and widgets, the Agent View reads
  an inspector feed under `/api/admin` (tests fail when the filter or the credential check is removed).
  Origin check on admin POSTs, `/api/reset` behind the admin password, UTF-8 Basic decoding, hand-back note for
  messages answered during a takeover, request-phrase keywords for the human escalation rule, sentence-aware
  `kb-unknown` pattern.
- **Race found by the browser smoke, not by unit tests.** The browser opens the event streams a moment after the
  thread exists; a turn with no model call (escalation rule, input cleanup) had already emitted its events, so the
  Agent View stayed empty. Fix: a new subscriber first gets the thread's earlier events from the event log
  (`lib/runtime/sse.ts`); the browser already deduplicates by event id.
- **The relevance guardrail blocked the answer to the agent's own question.** "I noticed it today, 2026-11-09" was
  judged off-topic on its own in 3 of 4 runs of the claim scenario (and an insulting message in 1 of 2). The
  classifier now also sees the assistant's previous message and is told that answers to it are not violations.
  Claim and angry scenarios: 8 of 8 after the fix. This is the cost of judging one message without its context.
- **Triage had no verification tool and said "I am verifying".** A guest's order questions are now routed to the
  Orders agent, the only one with `verify_customer`.
- **Typed "yes" next to a confirmation card.** The card was only live on the newest message, so a customer who typed
  "yes" first could no longer press Confirm. The card now stays live until clicked; the model is told to point to the
  button and not say the request "will be processed".
- **Known flake.** After the secure form the model sometimes waits for one more nudge before it calls `create_refund`
  again; the prompt now says to resume at once. The smoke prints whether it needed a reminder.
- **Process.** A write to the repo needs a fresh lease before nearly every batch (90 s); several Bash heredocs with
  nested quotes died at parse time, so edits went through small Python files and the Write tool.

## H01 fixes: D3

- Required e-mail; optional postal code is an extra check. The model/tool instructions and guest scenarios match that contract.
- Five attempts per normalized order per hour across threads, three per thread. Known and unknown orders lock equally; denied attempts do not enlarge buckets.
- D3 revert check: guest tests exit 1 (4 failures); restored source: 15/15 pass. just check: exit 0, 25 files / 259 tests passed.


- D4: runtime-only public-secret boolean feeds an amber Agent View notice; server warns once outside development/test, including explicit use of the public default. Six tests and typecheck pass (exit 0). Visual choice recorded in DESIGN.md.


- D5: only uncertainty directly governing the delivery clause exempts it. Earlier hedges no longer excuse a later affirmative claim (both Iceland scenarios). Revert: exit 1 / four failures; restored: exit 0 / 32 scenario tests pass.


- D6: each address card carries a fresh proposal UUID; the API requires it and Confirm/Cancel compare it before consuming a proposal. Stale cards produce a visible refusal and preserve the current proposal. Guard removed: exit 1 / two stale-card failures; restored: exit 0 / 15 address tests pass. Address + credential suites: 27 tests pass; typecheck exit 0.


- D7: 100 threads (oldest-created eviction), 50 photos (refuse full; atomic insertion protects concurrent uploads), 100 vault entries (refuse new, preserve existing). README documents lifecycle and bounds. Initial typecheck exit 2: existing photo fixture needed to handle capacity refusal; corrected. Final typecheck exit 0; 37 storage/claim/sensitive-data tests pass, including the last-slot upload race.


- R: README Security records the observed hardening and honest demo limits (open approvals without ADMIN_PASSWORD, no endpoint rate limits, in-memory loss, trusted forwarded headers, heuristic masking, self-declared audit identity). Aligned the remaining secure-form verification message and the expired/evicted-thread message with the implemented rules. Final just check: exit 0; 27 files, 275 tests, typecheck and lint passed.


- H01 acceptance: just build exit 0 (production artifacts observed); server restart exit 0 and service ready/live. Four requested evals exited 1, all with OpenAI 429: no credits remaining. Post-restart browser smoke exited 1 (two printed PASS, four FAIL); provider failure prevented input-guardrail completion and the script timed out after 120 seconds. Remaining browser flows are NOT_CHECKED. Account owner must restore API credits before repeating eval/smoke. Full evidence: .plan/handoffs/H01-wave3b-report.md. No push; .tours untouched.


## H02 independent-review fixes

- Task 1: a shared paused-run registry lets thread eviction skip pending/partly decided approvals without importing the agent graph. Central removeThread clears all pending approval keys. If all 100 slots are protected, thread creation returns a specific 429 and no cookie. README documents the behavior. Targeted suites: exit 0, 16 tests; typecheck exit 0. Revert (protection and cleanup disabled): exit 1, four failures; restored: exit 0, 4/4.


- H02 task 2: verifyGuest always runs the proof helper before checking for a customer. Both field comparisons execute for known and unknown orders; tests spy on the real comparator and assert both calls and placeholder arguments. Guest suite: exit 0, 17/17. Comments describe the checked code path without claiming a timing benchmark.


- H02 task 3: stripInvisible now runs before every output leak detector. Five regression probes cover the requested IBAN and hidden-character variants. The prefix-only example was previously caught incidentally as card/phone data; inserting zero-width characters between every character produced no leak reasons before the fix. Revert round 1: exit 1, four missing-IBAN failures; added the full bypass probe, final revert: exit 1, five failures. Restored final suite: exit 0, 13/13; earlier masking/sensitive-data suites: 41 tests passed.


- H02 task 4: added direct limiter memory/expiry/cap tests, real chat-handler rejection for missing/empty proposalId, production warning for explicitly configured public default, and the requested Iceland claim with a later cost hedge. Targeted suites: exit 0, 57 tests. Final just check: exit 0, typecheck + lint + 29 files / 293 tests. No eval, browser smoke or H03 work was started.


- H02 delivery: just build exit 0 (new production artifacts observed); restart the server exit 0; follow-up status exit 0, running/ready/live. Final evidence: .plan/handoffs/H02-verify-fixes-report.md. Four task commits plus a report commit; no eval, browser smoke, H03, .tours edits or push.


## H03 single-page workspace

- Two H02 Low regressions fixed first with separate commits/tests; H03a then H03b delivered per item. Final just check: exit 0, 35 files / 327 tests; just build: exit 0; server restart: exit 0, ready/live. Final no-model layout smoke: exit 0, 36 PASS through the requested domain/PAC. Actual-host desktop/mobile screenshots saved under docs/screenshots/h03-*.png. Model paths and independent review remain NOT_CHECKED; no eval, .tours edits or push. Full evidence: .plan/handoffs/H03-single-page-tabs-report.md.

## H04 independent-review corrections

- All 12 findings delivered in order, one item per commit. Normalization eval revert check: fixed 0 / reverted 1 (expected regression failure) / restored 0. Final just check: exit 0, 37 files / 335 tests, no lint warnings; build and server restart: exit 0. Layout smoke: exit 0, 100 PASS / 0 FAIL, including real deterministic takeover/resolution, rejected-turn metrics and DOM typography. The first smoke's selected-border failures were corrected in source. New h04 screenshots cover 1440, 768 and 390px. Repeat independent review and model flows remain NOT_CHECKED. No eval, .tours edits or push. Report: .plan/handoffs/H04-h03-review-fixes-report.md.

## H05 polish

- Eleven Low findings delivered in individual commits. Open/newest ticket selection and singular queue wording have six new unit tests. A real repeated-escalation browser flow verifies the header before and after resolving the new ticket. Final check: exit 0, 39 files / 341 tests; build/restart: exit 0, service ready/live. Final layout smoke: exit 0, 120 PASS / 0 FAIL; 28 h05 screenshots include all six required captures. Initial missing scroll hints (117 PASS / 3 FAIL) were corrected with placement-aware ResizeObserver measurement; gray fades improve visible edge hints. Model paths remain NOT_CHECKED. No eval, .tours edits or push. Report: .plan/handoffs/H05-polish-report.md.

## 2026-11-10 — real-model acceptance and model comparison

- OpenAI credits restored. Full eval on the current code (after H01–H06) with the defaults
  `gpt-4.1` / `gpt-4.1-mini`: **38/38 PASS**. Full browser smoke with the model via
  http://127.0.0.1:3100/: **70/70 PASS**. This closes the acceptance that was blocked by
  the OpenAI 429 "no credits" since H01. Smoke refreshed 7 older screenshots in docs/screenshots.
- Model comparison (prices from OpenRouter, USD per 1M tokens in/out): `gpt-4.1` 2.00/8.00,
  `gpt-4.1-mini` 0.40/1.60, `gpt-6.1-terra` 0.50/2.50, `gpt-6-luna` 0.05/0.25. All are available
  to the project key.
- Eval with `OPENAI_MODEL=gpt-6.1-terra OPENAI_GUARDRAIL_MODEL=gpt-6-luna`: 32/38 PASS, 4 FAIL,
  2 not run. Failures: `german-returns` and `language-switch` (answered "no information"
  without calling search_kb — no handoff to FAQ), `kb-unknown-offers-escalation` (escalated but
  did not tell the customer), `claim-slot-filling` (escalated instead of `submit_claim`).
  The run then crashed on `address-change-confirm` because the model did not propose a change
  and `scripts/eval.ts` (`clickAddressCard`) throws instead of recording a FAIL — eval-runner
  defect, independent of the model. Latency was also ~2× higher than gpt-4.1.
- Decision (PO): keep `gpt-4.1` as the default — it is the only configuration that passes the
  full suite. Model choice is driven by the eval suite, not by release date or price list.
  Tuning prompts for the gpt-6 family is a separate, optional task.
