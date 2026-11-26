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

## Finding 2026-11-11 — public repo published
- Independent H10 verification: PARTIAL, no High; F1/F3 documented as public-demo limits in ADR-011, F2 test added.
- PREP.md (recruiter feedback, interview notes) excluded from publication on owner decision; links fixed.
- Published as single commit to github.com/zentala/openai-agents-support-demo-ts; CI check job passed.

## Finding 2026-11-16 — H13 icon registry and H14 gallery published
- H13: one semantic icon registry, enforced by just check; two review rounds (human/customer glyph merge, reset glyph). Verified.
- H14: static gallery on GitHub Pages (https://zentala.github.io/openai-agents-support-demo-ts/), 14 recorded scenarios, spotlight player; two visual review rounds, PASS.
- Defect found after first publish: frames recorded with the default SESSION_SECRET showed the demo-security notice; re-recorded with an ephemeral private secret, recorder now refuses frames with the notice.
- Publication scan now allows deliberate public owner links (gallery, cal.com, agency contact).

## Finding 2026-11-19 — Agents SDK 0.21 per-run trace key
- Inspected the installed `@openai/agents` 0.21.0 and its `@openai/agents-core` / `@openai/agents-openai` dependencies before changing behavior.
- `TracingConfig` in `agents-core/dist/tracing/config.d.ts` exposes `apiKey`; `run.js` passes that run option into the trace as `tracingApiKey`, overriding the exporter default. The OpenAI exporter uses that key for its export request.
- Public-demo BYOK runs now enable tracing and pass the request-local visitor key only as the SDK run's tracing option. It is not added to agent context, persisted app state, events, or logs. Public-demo runs with no visitor key keep tracing disabled; the UI says “Traces are off in the public demo.”
- The visitor-key help text now says traces are exported with that key and appear in the visitor's OpenAI dashboard. No model call or paid eval was used to verify export.

- 2026-11-19: owner approved rewriting the public history. The public repo now has one commit (da4da7a) without research notes, test screenshots or CodeTour; CI passed. The private checkout keeps full history; the publish clone keeps tag backup-before-squash-2026-11-19.

- 2026-11-19: owner approved H15 model spend ("tak"): new D2/D6 eval scenarios plus one full eval; a second full run needs the coordinator.

## Finding 2026-11-23 — H15/H16 approved eval and model-backed browser check
- Owner approved both spends ("tak"). One full eval covered both (59 scenarios): 57/59. The two failures were scenario defects: `h16-report-ai-answer` and `h16-ask-person-answer` had no prior AI answer, so `report_message`/`ask_a_person` refused correctly ("nothing to report"). Fixed with a first turn plus `followUps` (6c677bf); English/German manager scenarios now use customers whose profile language matches (the rule reply follows the profile language, not the message). Targeted rerun 4/4.
- Environment: `corepack pnpm` resolves 11.28.13 and refuses the pinned 11.25.0, so `just` recipes fail; ran with plain `pnpm`. `with-key.mjs` needs `PASSWORD_BROKER_SCRIPT` set to find the broker (BACKLOG).
- Browser check (local dev, 1440/390): ask a person, rude reply blocked by word list and by the model, three strikes and manager unlock, manager request, Back to assistant: PASS. Defect: report/ask confirmation unmounted with the form on success (`components/message-content.tsx`); status moved outside the form. Minor: customer ticket badge says "closed" while staff still review (BACKLOG).
- 2026-11-23: `just` fixed (9c01677): Corepack takes the pnpm version from package.json in the current directory; from the root it used its newest pnpm, so pnpm recipes now run in `app/` via `[working-directory]`. `just check` exit 0. Publishing it exposed a flaky test (26b47c0): the IBAN-digit check matched "2874" inside a millisecond timestamp; it now ignores id/time fields (proved on a decoy both ways). Public CI green on 82d6d55.

## Finding 2026-11-25 — polish batch (owner: "tak", max 3 agents)
- Two ts-dev agents in worktrees plus the coordinator. Owner chose "in review" for the ticket badge: a customer-visible `ticket_status` event (id + "resolved") on hand-back; review tickets stay open, so the badge reads "in review" (022c3ee). Eval regex for escalation-next-step is negation-aware (02f55c3); independent review found "No problem, someone will call you" slipped through because the lookbehind scanned the whole sentence, so it now stops at a comma (27b1f44). KB aliases rank returns-policy first for Polish goods returns (633214b). Stop drops the address draft; REFUSED test added (73f661b). Streamed reply keeps the "Passed to a human" notice (15507f5). Gallery player in the first phone screen (fc17b45). ARCH D6 row restored (eb93395). D7 field captured at 390px, which exposed a 58px-wide correction field; fixed to 310px (a11e72d).
- `just check` failed once only because the icon check scanned the agents' leftover worktrees under `.claude/worktrees/`; after wt-remove, exit 0: 766 tests, 1005 gallery assertions. Production build exit 0; layout smoke and D7 smoke PASS on the local build. Badge render not checked in a browser (needs an escalation flow); unit tests cover it.
- Open from review: the "closed" state lives in the in-memory event log, so a restart shows "in review" again; the console marks only the newest ticket closed (BACKLOG).
- Published 2026-11-25: public repo 091dbd3, CI green, Render live. The Pages run failed three times the same way: upload-pages-artifact finalized the artifact, then deploy-pages in the same job found 0 artifacts (githubstatus all operational). Reruns reuse the run; a fresh `workflow_dispatch` run passed. If it repeats, split the workflow into build and deploy jobs (`needs:`). Production checked with Playwright: gallery player top 505px at 390x844 (DPR 3), no overflow, no console errors; live app loads at 390 and 1440 with no console errors, no model calls.

## Finding 2026-11-26 — start-up errors, key field, ticket store, gallery frames
- Owner saw "ThreadCreateFailed: HTTP 50x" on opening the live demo; a fresh load returned 201, so the cause was a Render cold start or redeploy (proxy HTML 502/503), not a missing key. The second error came from the Agent View customer panel parsing Render's HTML page as JSON. Start-up calls now retry non-JSON 502/503 (thread POST) and 502/503/504 (GETs) and end in a typed `ServerUnavailable`; our own JSON 503s (e.g. SessionSecretRequired) pass through unchanged (review finding).
- Missing-key errors are clickable and focus plus highlight the key field; the key field is a floating-label field joined with Clear (DESIGN.md row).
- Ticket store and event log are both in memory, so a restart wipes threads too; only log eviction was real. Customer stream rebuilds closed tickets from the store; the console reads each ticket's own status.
- Gallery: injection-order-note now shows the malicious note in the get_order result (frame 2); refund-in-policy and order-delivery-address gained a tool-result frame. 4 AI recordings. Found: iphone-signature never shows cleanup (single-line input drops newlines), filed in BACKLOG.
- `just check` on merged main: exit 0, 782 tests, 1077 gallery assertions.

## Finding 2026-11-26 — three BACKLOG items (worktree agent)
- iphone-signature: the product chat field was a single-line input, which drops newlines from typed and pasted text. It is now a textarea (Enter sends, Shift+Enter adds a line, DESIGN.md row). Re-recorded locally: frame 1 shows "Input cleanup: 1 mail signature line(s); 2 quoted reply line(s)"; new frame 2 expands the before/after JSON.
- smoke-public-demo: rule starters and missing-key replies are `message-automatic`; the script now waits on either kind. Run against a local public-demo build: all checks PASS; the live-model turn is NOT_CHECKED (no key given to it).
- Poisoned-note refund offer: the cause was code. "Do not change or refund anything" matched the refund-word test in `rememberRefundRequest`, and `stageConversationOffer` then staged "Confirm this refund: 1190 PLN" for order 1006. A negated refund clause now clears the wish (ADR 003, no prompt change). The added eval scenario `injection-order-note-no-refund` was not run: the agent sandbox refused `just eval` ("runs a string through eval"). Not retried through another spelling.

