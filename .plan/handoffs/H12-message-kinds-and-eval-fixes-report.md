# H12 — implementation report

Owner brief: [accepted handoff](H12-message-kinds-and-eval-fixes.md). Scope: 14 points.
Direct implementation in the existing session, as explicitly authorized for quota conservation.
No DM, implementer or reviewer agents started. Coordinator owns independent verification.
No push. Eval is NOT_RUN and requires the coordinator's spend confirmation.

All five source items are committed in the requested order, with the native lease released
after each commit. Final check, production build, restart and post-restart layout PASS.
This is ready for the coordinator's independent source/image review, not model acceptance.
Planned eval: 17 scenarios, estimated USD 1.82 (planning range USD 1–6); STOP before running it.

| Item | Points | Done / not done | Evidence |
| --- | --- | --- | --- |
| F1: explicit message kinds | 5 | Implemented; coordinator review pending | Typecheck PASS; 54 tests / 6 files PASS, including real rule/key/stale-card/human/notice producers to shared renderer. |
| F2: citation icon | 1 | Implemented; coordinator review pending | Shared source chip adds decorative BookOpen; title, accessible name and article dialog unchanged. Actual-host captures and keyboard dialog/focus checks PASS at 1440/390. |
| G1: state-owned choices | 3 | Implemented; coordinator/model verification pending | 21 tests / 2 files and typecheck PASS. Code invokes the existing action from customer request/owned facts or KB state; natural Yes/No consumes the current offer. No scenario weakened. |
| G2: claim/address regressions | 3 | Implemented; coordinator/model verification pending | 51 tests / 4 files and typecheck PASS. Photo decline/repeat cannot block completion; identical address collection preserves its proposal, changed/foreign/stale data remains guarded. |
| G3: cancellation/staff/long story | 2 | Implemented; coordinator/model verification pending | 46 tests / 5 files PASS, including real SDK pause/approve/resume with an offline provider. Explicit current confirmed refund/repeated cancellation selects the existing tool once; guards/needsApproval remain. |

## Final gates and captures

| Gate | Done / not done | Observed result |
| --- | --- | --- |
| `just check` on all five source changes | Done | Exit 0; typecheck/lint, 573 tests / 68 files, 23 CodeTour anchors, README catalog 49 PASS. |
| `just build` | Done | Exit 0; [durable output](../../research/H12-build-r2.log). Artifacts: `app/.next/BUILD_ID`, `app/.next/standalone/server.js`, `app/.next/server/app/page.js`. |
| Existing local service manager service restart | Done | Exit 0; the local app service, cwd `app`, then running/ready/live observed. No new runtime. |
| Post-restart headless layout | Done | Exit 0; 276 PASS / 0 FAIL, console `[]`; [log](../../research/H12-layout-r2.log). No model calls or CDP. |
| Independent source/image review | Not done | Reserved for the coordinator afterwards, as instructed; no reviewer agent started. |
| Paid eval / actual model behavior | Not done | NOT_RUN; requires coordinator spend confirmation for the selection below. |

Logs are deliberately git-ignored local evidence; counts and results are retained here.
No app source changed after the passing final check/build. Existing historical screenshots
overwritten by the layout command were restored; only the eight H12 captures are added.

| Actual host at 1440 / 390 | Evidence | What it proves |
| --- | --- | --- |
| Automatic receipt | [wide](../../docs/screenshots/h12-automatic-1440.png), [narrow](../../docs/screenshots/h12-automatic-390.png) | Real early escalation producer, ticket badge, automatic kind, no AI label. |
| Human reply and join notice | [wide](../../docs/screenshots/h12-human-1440.png), [narrow](../../docs/screenshots/h12-human-390.png) | Real staff action and SSE, named human author, thin notice. |
| AI label and citation | [wide](../../docs/screenshots/h12-ai-citation-1440.png), [narrow](../../docs/screenshots/h12-ai-citation-390.png) | Explicitly synthetic intercepted AI-display fixture; real renderer, containing panel, BookOpen, click/Escape and focus restoration. No inference proof. |
| Consultant transcript | [wide](../../docs/screenshots/h12-consultant-1440.png), [narrow](../../docs/screenshots/h12-consultant-390.png) | Real rule transcript uses the shared system receipt and has no model-rating controls; copied from this run's existing consultant captures. |

Implementer inspected rendered captures; this does not establish independent visual acceptance.
The paid full conversation stories and revert proofs remain for coordinator verification.

## Planned eval — gated, NOT_RUN

Selection follows the explicit H12 handoff: nine failed H11 cases plus every current
`Security & guardrails` case. This bounds this campaign; it is not a full-catalog PASS
under ADR 010. Scenario definitions and expectations are unchanged.

| Scenario ID | Why selected | Customer messages | Done / not done |
| --- | --- | --- | --- |
| `kb-unknown-yes` | G1: help offer and natural acceptance | 2 | NOT_RUN |
| `refund-confirmation-choices` | G1: state-owned refund choice and confirmation | 2 | NOT_RUN |
| `refund-confirmation-declined` | G1: decline causes no refund | 2 | NOT_RUN |
| `escalation-offer-declined` | G1: decline causes no ticket | 2 | NOT_RUN |
| `claim-slot-filling` | G2: complete claim after no-photo confirmation | 4 | NOT_RUN |
| `address-change-confirm` | G2: retain a valid proposal and Confirm | 3 | NOT_RUN |
| `refund-cancel-repeat` | G3: execute both cancellation attempts | 3 | NOT_RUN |
| `staff-handback-context` | G3: useful private guidance without exposing it | 1 | NOT_RUN |
| `damage-refund-human` | G2/G3: claim, refund approval/resume, human request | 4 | NOT_RUN |
| `injection-direct` | Full Security category: direct jailbreak | 1 | NOT_RUN |
| `injection-hidden` | Full Security category: hidden jailbreak | 1 | NOT_RUN |
| `foreign-order` | Full Security category: ownership | 1 | NOT_RUN |
| `prompt-extraction` | Full Security category: instruction/canary secrecy | 1 | NOT_RUN |
| `off-topic` | Full Security category: relevance | 1 | NOT_RUN |
| `card-number` | Full Security category: sensitive-input masking | 1 | NOT_RUN |
| `social-engineering` | Full Security category: claimed family relationship | 1 | NOT_RUN |
| `injection-order-note` | Full Security category: untrusted stored note | 1 | NOT_RUN |

17 unique IDs, 31 scripted customer messages, one expected approval resume and one
structured address confirmation. Code-only decisions need no model call; loops may add calls.
Models from `app/lib/config.ts`: `gpt-4.1`, `gpt-6-luna`, `text-embedding-3-small`.

Estimate: 96 agent calls (three per customer message plus three for the approval resume),
8,000 input / 350 output tokens each; 62 classifier calls at 1,200 input / 100 output
tokens each; 10,000 embedding input tokens. No cache discount assumed.
At [GPT-4.1 USD 2/8 per million input/output tokens](https://developers.openai.com/api/docs/models/gpt-4.1),
[Luna USD 0.10/0.50](https://developers.openai.com/api/docs/models/gpt-6-luna) and
[embeddings USD 0.02/million input](https://developers.openai.com/api/docs/models/text-embedding-3-small),
the estimate is USD 1.82, with USD 1–6 as an uncertainty range, not a spend authorization
or hard cap. Prices checked 2026-11-14; actual token usage/bill is unmeasured.

After coordinator confirmation only: environment-only `PUBLIC_DEMO=false` and
`PASSWORD_BROKER_SCRIPT=<path to your password broker script>`, then
the existing `just eval` recipe (which runs `node scripts/with-key.mjs`) with exactly
the 17 IDs above. No key was accessed or injected in this session. Preserve every real
FAIL and its evidence; no silent repair or repeat campaign is authorized here.

## Commits and handover

| Item | Commit | Lease after commit | Done / not done |
| --- | --- | --- | --- |
| F1 | `106356d` | Native release observed | Committed |
| F2 | `a108809` | Native release observed | Committed |
| G1 | `2e23a6f` | Native release observed | Committed |
| G2 | `e80acc1` | Native release observed | Committed |
| G3 | `3cc2108` | Native release observed | Committed |

The final evidence commit contains layout compatibility, captures, this report and state.
Next: coordinator reviews the source and actual-host screenshots against the approved
mockup, then confirms the gated eval spend. No push or publication in this session.

<details>
<summary>Retained failures, corrections and source diagnosis</summary>

Retained setup failures: initial pnpm command without CI stopped with NO_TTY; CI=true
typecheck succeeded. Initial Vitest startup in sandbox failed spawn EPERM; the same
test command was submitted through normal escalation. No controls/settings changed.
The first new test used a .tsx suffix outside the existing test include; renamed to
.test.ts (it uses createElement), then observed its execution. A variable-target
batch edit was NOT_RUN by HARNESS-LEASE-TARGETS-UNVERIFIED; the hook's explicit-path
Write/Edit recovery succeeded. No lease, hook or permissions were broadened.

The initial verification failures below were corrected before the final passing gates.
First full check: typecheck/lint PASS, 562 tests PASS and one old turn-flow assertion
FAILED because it expected the former agent role for a legal-rule receipt. Updated
that assertion to the new system contract; recheck recorded with the item/final gates.
Corrected turn-flow + producer renderer tests: 15/15 PASS. CodeTour initially found
three shifted lines; updated literal anchors before the F1 commit.
The first build's completion output was unavailable after context compaction; its artifact
alone was not counted as PASS. No matching build remained active; a second build with the
durable log above was observed exiting 0. Initial process inspection in the sandbox was
denied by the OS; native escalation allowed the necessary read. No permission widening.
The first layout run passed 276 checks but started before restart completion was observed;
its [log](../../research/H12-layout-r1.log) remains history. After the restart returned 0
and running/ready/live were confirmed, the final layout run also passed all 276 checks.
A diagnostic read initially guessed `standalone/app/server.js`; that path did not exist.
The configured build actually generated `app/.next/standalone/server.js`, verified above.

G2 investigation: H11's shared policy added a mandatory offer-tool step competing with
the existing claim/photo sequence (removed in G1). The photo tool always said to stop,
even on confirmed/no-photo continuations; it now handles decline/repeat explicitly.
The address tool cleared a proposal before every collection call and discarded its
completed draft; repeated/partial calls can now reuse the validated proposal and nonce.
Prompt/tool schemas clarify canonical item names, nullable country, existing drafts,
and immediate submission after confirmation; current ISO date is supplied by code.
These are source-confirmed conflicts/defects, not a claim to reconstruct unlogged H11
tool arguments or prove historical model causality. Paid regression verification is gated.
First G2 test run: 48 PASS/3 FAIL due to a missing sameAddress import in the new
proposal reuse branch; corrected before rerunning, without changing assertions.

G3: current owned explicit cancellation/confirmed refund starts the existing Orders
agent with SDK toolChoice, reset after one tool. Input and output guards remain;
refund needsApproval still pauses money creation. A real offline SDK test observed
zero refunds before approval and one afterwards; another executed repeat cancellation
and observed REFUND_ALREADY_CANCELLED. No scenario or expectation was changed.
Reply language now follows the current customer message before profile fallback.
Staff guidance previously entered the system-prompt seven-word detector, so its useful
delivery question overlapped the note. System-prompt/canary/data/PII detection remains;
staff guidance separately blocks substantial verbatim notes and attributed excerpts,
while allowing the intended question. Existing short-note and attributed-excerpt tests
remain unchanged and PASS. Actual H11 model causality remains an inference until eval.
First G3 typecheck rejected an extra annotations field in the offline provider fixture;
removed that fixture-only field before final typecheck. No model/network request ran.

</details>
