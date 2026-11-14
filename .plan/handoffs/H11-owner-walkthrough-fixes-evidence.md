# H11 delivery evidence appendix

Same campaign: [main H11 report](H11-owner-walkthrough-fixes-report.md). Numbered source review, item commits and retained diagnostics are deferred here; current outcome, known gaps, part gates and final eval table/cost stay in the main report.

## Preflight and milestones

- Repository root, main branch and clean initial tree observed. The plan is tracked
  in this repository. H10 confirms commit per numbered item and immediate lease release.
- DM and worker exposed workspace-write with the repository and temporary writable
  roots; Git metadata is read-only. Both were launched with on-request approval.
  Launch intent is distinct from filesystem enforcement. Ordinary product paths are
  compatible; Git writes require the tool escalation procedure where necessary.
- Live owning PO/DM verified. One visible implementation worker acknowledged the
  handoff and inspected actual sources. No product writes preceded its handshake.
- First PowerShell profile reads emitted global Git-config lock permission errors;
  non-login shell reads passed. No global configuration changed.
- Initial report write was refused by the single-writer lease hook because DM held
  no lease. No write occurred. Standard lease acquisition subsequently succeeded.

## Independent review

| Item / round | Done / not done | Source verdict and evidence |
| --- | --- | --- |
| A1 / 1 | Done | PASS, zero findings. Independent reviewer inspected shared current-address presenter, verified session and owner filtering in both tools, confirmed override fallback, guest/foreign/original/changed-address tests and scenario assertions. Independent focused tests: 37 passed, 2 files, exit 0. Implementer tests: 54 passed, 3 files, exit 0. |
| A2 / 1 | Done | FAIL: Medium, 2 points. Policy rejection at Confirm exposed model instructions rather than an actual escalation offer. Trusted order countries, shared proposal/Confirm validation and stored-invalid-draft checks otherwise passed source inspection. |
| A2 / 2 | Done | PASS, finding closed. Separate deterministic customer notices provide real PL/EN/DE offers; source/tests cover full reply, transcript, no model call and unchanged address. Focused tests 86 passed. Final just check exit 0: 407 tests in 49 files and 23 CodeTour anchors. |
| A3 / 1 | Done | SOURCE PASS. Filled slots retained with Saved outcome; required-only plain missing labels, optional claim photo excluded, semantic text states and DESIGN decision inspected. Implementer: 32 focused tests, lint and diff check passed. Actual render deferred until part-A build. |
| A4 / 1 | Done | SOURCE PASS. Conditional language suffix matches empty guest language fixture and preserves nonempty language labels. Single-line change; lint/diff check passed. Visual acceptance deferred to part A. |
| A5 / 1 | Done | SOURCE PASS. Public local article lookup, escaped React text, inert unknown citations, shared titled source buttons and named native dialog inspected. Eleven focused tests, typecheck, lint, diff check and 23 tour anchors passed. Escape/focus restoration and visual acceptance remain pending actual-browser review. |
| A6 / 1 | Done | SOURCE PASS. New/reused ticket returns exact next action and no scheduled outbound contact/time; PL/EN/DE deterministic notices and prompt align. Session identity, ticket deduplication and takeover rules unchanged. Final 88 focused tests/typecheck/lint/diff/tour checks passed. Model behavior pending combined eval. |
| A7 / 1 | Done | FAIL: High, 2 points. After cancelling one refund by ID, a repeat without ID could cancel another remaining pending refund. Explicit states/paid refusal/owners/totals/registration otherwise passed. |
| A7 / 2 | Done | SOURCE PASS; finding closed. All owned history participates in no-ID ambiguity, requiring explicit selection. Regressions cover repeat and newly created refunds, unchanged totals and paid history; real guest verification/cancellation path added. Final 98 focused tests, typecheck/lint/diff/tour passed. |
| B1 / 1 | Done | SOURCE PASS. New ticket/approval IDs trigger finite 700ms pulse even at stable count; initial hydration/removals/repeated IDs do not. Reduced-motion disables animation; unread/reader labels preserved. Four tests, typecheck/lint/diff check passed. Final actual visual review after D. |
| B2 / 1 | Done | SOURCE PASS. Single server action validates text/ownership before takeover and reply; cookie scope retained. Thread+consultant key resets draft; failures preserve it; stale selection views/responses hidden. Forty-six tests, typecheck/lint/diff/tour and changed smoke syntax passed. Actual draft-switch/failure/delayed-response behavior remains in part-B browser gate. |
| B3 / 1 | Done: finding recorded | SOURCE FAIL, Medium 2 points. Staff private-text matching from one word makes shared vocabulary such as delivery trigger the output guardrail. Independent reviewer confirmed actual detector and recommended existing seven-consecutive-word prompt excerpt protection; secret/foreign/card/IBAN/phone protections must remain. SDK context-reference/dynamic prompt inspection otherwise positive; remaining tests were not yet checked in this round. |
| B3 / 2 | Done | SOURCE PASS, finding closed. Existing seven-word excerpt detection replaces full short-note matching; independent protections unchanged. Real route/cookie/channel/forged-input tests and actual SDK update/deletion/resume tests inspected. Final 126 tests in 12 files, typecheck/lint/diff and 23 tour anchors passed. Form thread/consultant isolation and future-rating/export distinction preserved. |
| B4 / 1 | Done | SOURCE PASS. First warning has no takeover/send effects; acknowledgement is one-shot and binds thread, consultant, action and exact validated text. Cookie/ownership checks precede it; edits/keyed composers isolate consent. Audit excludes message copies and preserves approval metrics. Final 53 tests/7 files, typecheck/lint/diff, smoke syntax and 23 tour anchors passed. Actual UI behavior remains in part-B gate and final review. |
| B5 / 1 | Done: finding recorded | SOURCE FAIL, Medium 2 points. Real verify_customer → get_order(1004) updates identity/returns order but leaves active order unset, so projection shows order:null. Reviewer confirmed trusted binding gap; real-flow regression reproduces it (7 PASS/1 FAIL, exit 1). Projection/cookie ownership/explicit default/current address and stale-hook-response handling otherwise positive. |
| B5 / 2 | Done | SOURCE PASS, finding closed. Verified canonical order and owned get_order update current context and thread memory; failed/foreign reads and listing do not select. Actual guest verify→read→persist regression passes without manual selection. Final 72 tests/6 files, typecheck/lint/diff and 23 tour anchors passed. |
| B6 / 1 | Done: finding recorded | SOURCE FAIL, Medium 2 points. Paused turn-1 approval resumed after turn 2 was incorrectly grouped under the latest message. Masked headers and unchanged metrics otherwise passed. |
| B6 / 2 | Done | SOURCE PASS, finding closed. Async event scope preserves originating turn through pause/restore/decision/final push; unknown origins use Conversation updates and customer projection strips correlation. Real SDK interleaving regression inspected. Final 92 tests/9 files, typecheck/lint/diff and 23 anchors passed. |
| B smoke / 1 | Done: finding recorded | SOURCE FAIL, Medium 2 points. Generic same-URL response wait could be satisfied by polling before the deliberately held response. Other composer/privacy assertions accepted. |
| B smoke / 2 | Done | SOURCE PASS. Wait binds exact held request, awaits finished response and checks thread ID; expected 409 matching binds exact action/request/endpoint/type/count, retaining unexpected errors. Final r3 observed 170 PASS/0 FAIL, exit 0. |
| C1 / 1 | Done: finding recorded | SOURCE FAIL, Medium 1 point. Screencast retained an old starter text selector; stable highlighted ID is required because the new label is also in the category list. Three highlights/catalog/fixtures/icons/busy/rule classification and label/category-only fixture edits otherwise accepted. |
| C1 / 2 | Done | SOURCE PASS, finding closed. Exact highlighted starter ID and updated ratings-export category independently inspected. Final 53 tests/5 files, typecheck/lint/diff/script syntax passed; no screencast or model rerun. |
| C2 / 1 | Done: finding adjudicated | Initial reviewer SOURCE FAIL, Low 1 point, suggested useId for hypothetical reuse; no current collision was found. DM independently verified one ScenarioBar mount (customer-view.tsx:47), one root CustomerView (support-demo.tsx:41) and one matching ID/reference. Rejected as a current defect/nonblocking recommendation; no new admission condition or speculative change. Remaining source criteria PASS; typecheck/lint/diff passed. |
| C3 / 1 | Done: finding recorded | SOURCE FAIL, Medium 2 points: turn-finish can automatically escalate after tool errors, then publish a stale escalation offer. Error-limit regression required. Other ownership/cookie/expiry/least-privilege checks positive. Request for new offline SDK proof superseded by PO proportionality: reuse existing tests/source, final once eval proves real-model approval/resume; no new simulation framework/gate. |
| C3 / 2 | Done: finding recorded | SOURCE FAIL, Medium 2 points: correction blanket-blocked refund offers/consumption/publication whenever a ticket was open, even while agent remained active. Original automatic escalation finding closed; narrow the ticket condition to escalation offers and suppress current-turn automatic failure separately. |
| C3 / 3 | Done | SOURCE PASS; both findings closed. Current-turn automatic-escalation suppression, escalation-only existing-ticket guard and valid refund-with-open-ticket regression independently inspected. Existing needsApproval pipeline preserved. Final 117 tests/13 files, typecheck/lint/diff and 23 anchors passed. No repeated reviewer tests or model calls. |
| E1 / 1 | Done | SOURCE/static PASS. Dockerfile copies all three existing manifests before install; .dockerignore excludes none, allowBuilds.esbuild:false available. Diff check0. Container build NOT_RUN by bounded scope. Owner Render failure/publication fix explicitly owner-supplied evidence. |
| C4 / 1 | Done | SOURCE PASS: exact icon map/category reuse, decorative semantics, 40px controls, event grouping and synthetic reply preserved. 21 tests/4 files, typecheck/lint/diff and 23 anchors passed. |
| C5 / 1 | Done: finding recorded | SOURCE FAIL, Low1p: pr-8 moves native select text but cannot inset its native arrow; no arrow-positioning rule existed. |
| C5 / 2 | Done | SOURCE PASS: native select appearance-none and decorative pointer-events-none ChevronDown inset12px; wrapper preserves responsive geometry/name/40px. Existing smoke retains prior assertions and checks actual inset/height/click-through. Targeted lint/typecheck/script syntax/diff0. |
| C6 / 1 | Done | SOURCE PASS: existing UI exposes address/guest starters; actual1440/390 start clicks observe chat POST and server-owned identity, selected customer/label and unverified guest. Only chat response transport synthetic; cleanup restores own handler/viewport/page. 8 tests/2 files/script syntax/diff0; actual execution pending layout. |
| D1 / 1 | Done | SOURCE PASS: nine local WebP1546–39130B, all catalog names, licensed source URLs/README parentlink, decorative48px fallback, owned projections/older-picker compatibility, standard Docker public copy.39tests4files/static23anchorsPASS. Actual assets200/host appearance NOT_CHECKED until finalDgates; no Docker/cloud build claimed. |
| D2 / 1 | Done | SOURCE PASS: no heavy cards, title/one-line snippet/A5 chip/small gray score, grouping/empty/escaped text/unknown IDs/dialog preserved. D1 DESIGN row relocated identically.11tests2files/static23anchors0. |
| D3 / 1 | Done: findings recorded | SOURCE FAIL, two Low1p findings: damage story preconfirmed before agent summary; DESIGN decision was in color table. Four steps with separate claim confirmation before refund and pause index2; move row to Decisions. Other manual-send/cancellation/reduced-motion/thread-binding/waiting rules positive. Original61tests6files apply only before correction; corrected JSON/diff0, round2 and corrected tests pending. |
| D3 / 2 | Done | SOURCE PASS; four steps and pauseindex2, approval acceptance/rejection sequencing test, unchanged business assertions and correct Decisions placement inspected. Both Low1p findings closed; corrected tests still NOT_RUN during resource hold,61tests only prior source. |
| D4 / 1 | Done: source only | SOURCE PASS:1440/390 draft/step/no-autosend/edit/exact same-thread request/advance/customer-switch reset; exact response wait and own route/media/viewport cleanup. Prior checks preserved. Script/browser NOT_RUN; reduced motion does not prove animation or a separate Reset click. |
| Final fixtures / read-only | Done: findings confirmed | Medium2p generic widgetShown counts quick replies: false negatives for three address refusals and false positives for four required widgets. Low1p order-delivery-address requires get_order despite both owner-filtered tools/shared address presenter. Bounded correction after D/E2; no source/model/browser changes in this adjudication. |
| Fixture correction / 1 | Done: source only | SOURCE PASS; exact7 typed-widget migrations and address toolsCalledAny,49 fixtures/business/security assertions retained; tests NOT_RUN. Old after-D/E2 queue timing superseded by PO light-work sequencing. |
| Guest-language correction / 1 | Done: source only | SOURCE PASS; public metadata selected by trusted verified identity, no new event/API/channel contract; real-flow regression extended, tests and actual render pending. |
| E2 / 1 | Done: source/CLI | SOURCE PASS;49 metadata-only stories/9categories, five images/links preserved, honest safeguard/HITL descriptions, portable pathToFileURL, strict drift check in justcheck. Default/check expected stale exit1 without write; explicit write/check0. Final full gates pending. |

Part-A image round 1: PASS for inspected actual-app images, no image findings. Reviewer opened the initial six and all sixteen new/updated captures: guest at 1440/390; missing/saved slots; dialogs at 1440/1024/768/390; source chips in chat and KB panel, hover/focus/return states at wide/narrow sizes. Synthetic transport provides slot/citation data to the real built application; this is not model evidence. Independent final interaction assessment: PASS on the actual host at 1440/390. Reviewer confirmed keyboard opening, Close, Escape, source focus restoration, Tab/Shift+Tab and inaccessible interactive background. No open A findings.

## Item commits and retained failures

| Item | Done / not done | Commit / lease |
| --- | --- | --- |
| A1: owner's current delivery address | Done | `100560b`, four item files; successful immediate lease release observed |
| A2: trusted country and postcode policy | Done | `7b0cc9b`, policy/data/tests/tour/architecture files; successful immediate lease release observed |
| A3: saved slot state and plain missing labels | Done | `63eca75`, four item files; immediate successful lease release observed |
| A4: guest selector label | Done | `9667c03`, one file; immediate successful lease release observed |
| A5: citation chips and article dialog | Done | `587e91d`, shared source component, loader, integration and tests; immediate successful lease release observed |
| A6: accurate escalation next action | Done | `55f511e`, seven item files; immediate successful lease release observed |
| A7: safely cancel pending owned refunds | Done | `65bf2e9`, fifteen item files; immediate successful lease release observed |
| Part-A test correction | Done | `0e0d1ca`, session-secret test observes actual child flag independently of provider nesting; independent source PASS, immediate lease release observed |
| B1: finite consultant attention pulse | Done | `6eec4e2`, five item files; immediate successful lease release observed |
| B2: take over and reply from composer | Done | `dfc7849`, sixteen item files; immediate successful lease release observed |
| B3: private thread staff guidance | Done | `dc0c23e`, context, channel, UI, tests and architecture files; immediate successful lease release observed |
| B4: server-checked staff tone warning | Done | `c56d868`, twenty item files; lease released before next coordinated DM write |
| B5: trusted customer and active order panel | Done | `a189180`, eighteen item files; immediate successful lease release observed |
| B6: correlated all-turn run log | Done | `62cad9e`, masked grouping, pause/resume correlation and channel/tests/docs; immediate successful lease release observed |
| Part-B scripts and raw captures | Done | `5e1d757`, reviewed smoke correction plus six h11-b screenshots, final image assessment deferred; immediate lease release required and observed before C1 acquisition |
| C1: categorized scenario start screen | Done | `e4cb2ce`, fourteen item files; immediate successful lease release observed |
| C2: executable scenario count | Done | `bd79ff5`, DESIGN and trigger component; immediate successful lease release observed |
| E1: include workspace install policy | Done | `b840213`, Dockerfile only, one-line manifest COPY correction; immediate successful lease release observed |
| C3: structured reply choices | Done | `4a8c4c3`, 27 independently reviewed item files; immediate successful lease release observed |
| C4: shared product icon map | Done | `771cb96`, nine item files; immediate successful lease release observed |
| C5: inset selector chevron | Done | `17b8a16`, three item files; immediate successful lease release observed |
| C6: start address/guest reachability | Done | `35a624a`, existing smoke script only; immediate successful lease release observed |
| D1: bundled product thumbnails | Done | `7441540`,24 independently reviewed item files; immediate successful lease release observed |
| D2: lightweight KB source rows | Done | `182b432`,two item files; immediate successful lease release observed |
| D3: editable step suggestions | Done | `43261f6`,16 item files; corrected61tests6files/static23anchors0, immediate lease release observed |
| D4: suggestion smoke source | Done: source/syntax | `93de3dc`,two item files, syntax0, immediate lease release observed; actual browser execution pending |

- Worker lease acquisition first failed with `spawnSync git EPERM`; normal tool
  escalation succeeded. No alternate bypass was used.
- Worker focused tests and reviewer focused tests first failed exit 1 with `spawn EPERM`
  before tests executed in the sandbox. Approved escalated runs passed as recorded above.
- A milestone prompt to PO was not submitted because the terminal host reported `agent_blocked`;
  no interactive permission was answered by DM. This report preserves the milestone.
- A2 command using an unresolved shell-expanded write destination was blocked before
  execution. The hook explicitly directed a direct edit of an explicit path; that
  correction succeeded. No protection was disabled.
- First A2 full check exited 1 because its source edit moved a CodeTour anchor.
  The anchor was corrected; the final check passed. Earlier focused A2 run passed
  83 tests before the review correction; the corrected focused run passed 86.
- First A5 lint exited 1 for two test createElement calls; corrected focused lint,
  typecheck, tests and tour check passed before source acceptance and commit.
- First A6 focused run exited 1: 87 passed, one old deterministic-notice expectation
  failed. The expected text was updated to the new queue wording; final 88 passed.
- First A7 verification command exited 1 at the CodeTour checker after the new tool
  import moved the triage export. Corrected anchor subsequently passed all 23 checks.
- An A7 finding prompt was not submitted while the worker awaited tool approval.
  After that approval resolved, the finding was delivered and corrected; no approval
  UI was answered by DM and no denied execution was replayed.
- First part-A full check failed with three page-structure assertions in the session
  secret tests after the new KB provider. The independently reviewed correction
  preserves missing/default/private flags and non-disclosure checks.
- The initial modal-focus assertion remains a failed observation; subsequent diagnosis
  and successful behavior are recorded separately rather than erasing it.
- B4 first test startup failed with sandbox `spawn EPERM`; approved escalation passed.
  Initial lint exited 1 because a component mutated the ref returned by its hook;
  moving that operation into the owning hook corrected it. Final checks passed.
- B5 initial focused set passed 65 tests, with typecheck/lint/diff and 23 tour anchors
  passing. Added real guest verify→order regression then failed exit 1 (7 PASS/1 FAIL),
  reproducing the independently confirmed missing active-order binding. Correction pending.
  The corrected final run passed 72 tests; a shifted CodeTour anchor was also corrected.
- B6 initial focused run passed 74 tests before source review found the interleaving
  defect. Its correction shifted an approval CodeTour anchor (checker exit 1); final
  92 tests and all 23 anchors passed. Neither source FAIL nor the checker failure is erased.
- DM documentation lease acquisition during B6 was refused by the lease daemon
  because the implementer held it. No write occurred; documentation resumed only
  after the worker explicitly released its lease. No takeover or bypass was used.
- One DM report patch failed context matching before any write; rereading the current
  file and applying its actual text corrected the documentation update.
- Part-B initial layout log exited 1 (162 PASS/1 FAIL) due to intentional typed 409s
  counted as console failures. Intermediate PASS preceded the confirmed race-test fix;
  final H11b-layout-r3.log exited 0 with 170 PASS/0 FAIL and empty console errors.
  Earlier 173 reporting was corrected by independent anchored row counts; no rerun.
- C1 initial typecheck failed on the obsolete Basics category in ratings export;
  category/export regressions corrected it. Final focused 53 tests/5 files and static
  checks passed. A correction attempt without a lease was blocked before writing;
  normal lease acquisition allowed the scoped work, and the lease was released.
- C3 initial CodeTour check failed on three shifted anchors; all 23 subsequently passed.
  Round2 broad-ticket regression reproduced 1 FAIL/17 SKIP, exit1 before correction;
  final selected suite117PASS/13files. Both source FAILs remain above. E1 integration
  did not stage any C3 or DM documentation changes; its lease was immediately released.
- C4 first CodeTour check failed on a shifted workspace anchor, corrected before
  final21tests/static23anchorsPASS. C5 initial padding-only candidate was not committed.
- Part-C diagnostic CIM read returned Access denied; normal approved escalation
  returned no matching Node process. This is diagnostic evidence, not a product-test failure.
- Part-C screenshot backup using $captureBackup was stopped before execution:
  "Write blocked because command targets could not be verified (write destination uses
  unresolved shell expansion). Use a direct Write/Edit or Git invocation with explicit
  paths." No rule ID supplied. Before the later hold, explicit literal-path creation/
  copy succeeded exit0 under unchanged controls: only docs/screenshots/*, nonrecursive,
  task-owned temporary directory,179source/179backupfiles. PO/DM verified scope/directory
  and explicitly resolved parser uncertainty for existing preservation/restoration only.
  No broader hold lifted, repair, widening or replay required; exact commands remain
  in native history, private paths omitted here.
- First part-C layout attempt was stopped before execution by the existing single-writer
  lease hook (worker held no lease). Layout NOT_RUN; ordinary acquisition required.
  Later check515tests61files/23anchors/build/restart all0; no screenshot or layout PASS yet.
- DM part-C documentation patch stopped before writing when its short lease expired.
  Standard supported hold reacquisition succeeded; no hook/settings changed.
- Actual first part-C layout exited1:0PASS/3FAIL, HTTP502 at thread creation,
  error cards/console. Service changed PID; later backend200/ready/live observed,
  exact transient cause unknown (old missing-build logs are not proof). Bounded
  retry H11c-layout-r2.log exited0:200PASS/0FAIL, console[], independently counted.
  Old captures restored excludingh11-*; new start1440/390 captures retained.
- D1 temporary photo preparation first failed MODULE_NOT_FOUND:sharp exit1; resolving
  the existing dependency corrected it, no install. Initial test typecheck TS2769
  exit2 corrected literal result type; final39tests4files/static23anchorsPASS.
  PO noted rug/wardrobe loose crops; recropped same licensed sources, worker inspected48px.
- D3 preparation composite read was stopped by the existing lease hook before execution;
  ordinary lease acquisition allowed the read, no hook/settings changed. Later original
  candidate61tests6files/static23anchors0; review found two Low1p corrections above.
- Shared resource coordination,2026-11-11: finite healthy test ended normally, its
  process exited; worker confirmed no remaining heavy child/browser. DM independently
  observed no task Vitest/typecheck/build/lint process. Next heavy commands held for
  peer owner's actual handback; light source/review/preparation continues. No kills,
  settings changes, new framework or global admission condition.

Final typed-widget fixture IDs: address-delivered-refused, address-country-postcode-refused, address-country-change-refused (forbid address-confirm, allow legitimate quick replies); order-picker (require order-picker), iban-typed-in-chat and cod-refund-needs-iban (require secure-form), address-change-confirm (require address-confirm). Keep quickRepliesShown separate, strict schema validation, addressStatus/ownership/no-picker and all other assertions. Address tool choice: only order-delivery-address changes to toolsCalledAny with get_order/list_my_orders, retaining exact address and show_order_picker prohibition.

The earlier NOT_STARTED/unused-resource receipt became stale after native approval; actual finite D3 command later completed0,61tests6files,23anchors, targeted staticPASS. Worker and DM observed no remaining task children, lease93released, direct actual handback sent; no blind interruption or follow-on heavy command. Both observations retained. E2 TEMP verification first failed exit1, spawnSync git EPERM(-4048), pid0 before git show HEAD:README.md started; no rule ID. Normal approved escalation of the same command passed0 without script/hook/settings changes. Expected stale CLI negatives are separate successful checks, not that setup failure. Draft file-URL portability finding Medium2p corrected using existing pathToFileURL pattern before integration.

## Historical A focus evidence and current integration

The approved browser_evaluate permission resolved the pending read. Implementer resumed in the same session; no worker, profile or runtime was replaced. Retained failure: the first keyboard assertion reported `Modal focus escaped 1440`. Actual active-element diagnosis distinguished browser chrome from interactive page background; later checks reported background controls inaccessible and Close/Escape restoring the source focus at 1440/1024/768/390. Independent checks at 1440/390 confirmed the diagnosis: document.hasFocus() was false when focus was outside the document, and no background control received focus. Initial reviewer keyboard sequence timed out; retained as an unsuccessful attempt before subsequent PASS. Twenty unique h11-a captures and later final interaction evidence remain preserved; original overwritten legacy captures were restored. B/C later captures remain separate. Final integration source round1 FAIL,Medium2p: approval_decision precedes resumed completion, so old waiting text could trigger the next suggestion. Worker correction uses existing correlated events and authoritative private-feed enrichment for both customer-first and inspector-first same-ID delivery; customer filtering stays unchanged. Later source round2 failed and round3 passed, as recorded below; tests remain pending. Other reviewed integrations had no new findings. Scope review recommended all49 IDs/72textturns/3approvalstories/1addressclick; claim reasons clarified as shared-prompt regressions. Lockout-event and outbound-boolean assertion limits remain visible in the main report, without claiming broader PASS.

Final integration round2 SOURCE FAIL retained the same Medium2p finding: a customer reply preceding the inspector decision remained before it after in-place enrichment, so an index-only completion scan never cleared the wait. Round3 must cover exactly customer reply -> inspector decision -> full same-ID reply with authoritative inspector order and no duplicate bubble/event. No new server/API/clock provenance permitted.

Final integration round3 SOURCE PASS closed the same Medium2p finding: relocate the one enriched event to authoritative inspector arrival order, exact crossed delivery/ acceptance/rejection/repeated-pause regressions, unchanged customer filtering. Tests NOT_RUN; actual runtime/image review still pending.

 ## Final capture and resource disposition

Capture round1 SOURCE FAIL, Low1p: raw first-nonempty-line snippet was frontmatter, not representative policy content. Round2 SOURCE PASS at16:52 uses existing parseArticle/chunkBody, retaining accepted fixture paths and assertions. No browser, model or heavy command ran for that review; actual images/runtime remain NOT_RUN. The previous compatible heavy handback was superseded by an actual foreign finite check running16:52. H11 final chain HAS NOT STARTED. Same worker waits actual final exit/owned cleanup/direct handback plus fresh compatible resources, then ONE check -> success-only build -> existing restart -> ONE headless/no-model gate, stopping at first failure without automatic retry. This changes scheduling, not acceptance scope.


At16:56 the foreign finite check actually ended exit1; own-child cleanup and direct heavy handback received. H11 had not started. Foreign failure is not an H11 test result; fresh compatible resource verification remains before the accepted chain, with no CDP handover.

## Final offline chain attempt1

Actual start observed from approved command output tsc --noEmit, after fresh5505640KiB free RAM and no scoped matching heavy process. ONE just check with task-local CI=true/VITEST_MAX_WORKERS=1 failed exit1: TS2322 at app/tests/scenario-progress.test.ts17, approval_decision fixture missing required decidedBy (typecheck exit2). Durable log: research/H11-final-check-r1.log. Unit tests, build, restart and headless NOT_RUN; no automatic retry. Scoped own Node-child read was empty, lease106 released and direct heavy handback sent. Worker then changed only the fixture's missing field to the existing consultant name; event contract and regression ordering assertions unchanged. Diffcheck0, lease107 released; independent bounded source reread pending. Documentation review16:58 PASS verified all49 IDs/all8 Security/72turns/cost assumptions and retained FAIL/NOT_RUN distinctions.

## Corrective final gates and integration

Missing-field reread17:02 SOURCE PASS. Fresh4723196KiB/no scoped heavy process preceded actual corrective start in acknowledged next slot. research/H11-final-check-r2.log EXIT0:558tests/64files,23anchors,catalog49. research/H11-final-build-r2.log EXIT0, current app/.next/BUILD_ID,server/app/page.js,build-manifest.json observed. Existing local service manager restart EXIT0/ready/live, research/H11-final-restart-r2.log. These successful app gates are reusable after script-only corrections.

research/H11-final-layout-r2.log EXIT1: DM anchored65PASS1FAIL,console[]. All9actual-hostWebPHTTP200/<=60KB and normal typing/edit cancellation/no-autosend passed. Shared select timed out waiting for ?tab=agent while Agent was already default-selected; installed Radix emits change only for a new value. No product defect inferred. Image visibility/final containing-panel captures NOT_CHECKED. Own children ended, legacycaptures restored preservingh11, lease109released/directhandback17:13; no automatic retry.

Capture-navigation R1 confirmed Medium1p; R2 SOURCE FAIL retained: partial fix still accepted arbitrary tabpanel. R3 adds final aria-selected and visible associated aria-controls panel while preserving changed-tab URL and keyboard/Back assertions; syntax/diff0,lease114released, reread pending. Three reviewed/test-backed commits b43fdef/81477fb/fd7cd89 each immediately released leases111/112/113. No push. Guest-language real offline verification and synthetic UI rendering remain separate; owned Anna profile is not proof of a rendered guest transition.

## Corrected headless attempt3 and unresolved image state

Navigation R3 SOURCE PASS17:18 closed Medium1p; guest UI transport R1 SOURCE PASS17:23 uses one intercepted request, existing verification/context events and public metadata, no server verification/model call; routes/viewport cleaned. Actual17:22 peer handback/nextgap acknowledged, fresh4.96GiB/scoped no test/type/build preceded ONE headless start. Dedicated foreign Chrome left untouched; own headless only.

research/H11-final-layout-r3.log EXIT1,65PASS1FAIL/console[]: navigation passed; img[src=/products/chair.webp] missing in Customer & order timed out before decode. All9 assets HTTP200/WebP/<=60KB again, motion/edit/no-autosend passed. Image visibility, remaining KB/choice/profile/guest captures NOT_CHECKED. Source maps exact Oslo name to chair.webp and projection preserves item name; onError fallback or another loaded bundle are hypotheses, not proven causes. research/v1-failure.png is after finally-reset and cannot show failed owned DOM. Need actual pre-reset DOM/text/img src/currentSrc/fallback and existing launch/static-path evidence before correction. Own processes ended, legacycaptures restored/allh11 preserved, lease117released/directhandback17:27; no automatic retry, eval NOT_RUN.

## Actual image diagnostic disposition

local service manager launch next start from app confirmed; hostHTML/relevantclient returned200 and contained thumbnail/mapping/Customer & order code. No product change/rebuild justified. Same reviewer SOURCE PASS for bounded existing-helper on-error DOM/screenshot-before-reset and original-error rethrow; file246lines,lease119released. Fresh5183280KiB/no scopedheavy preceded next acknowledged ONE diagnostic allocation.

research/H11-final-layout-r4-diagnostic.log EXIT1/65PASS1FAIL retained. Line64 captures correct Anna/order1001/Oslo profile,1thumbnail,fallbackfalse,complete320x320; literal src attribute/currentSrc both <local app origin>/products/chair.webp. Actual pre-reset docs/screenshots/h11-d-owned-profile-failure-1440.png retained. Relative-onlyCSS selector was the cause, independently confirmed Medium1p. AssetHTTP and decodedpresence now proven; final48px/containingpanel/wide+narrow images remain pending. Owncleanup/legacyrestoration/lease120release/directhandback17:35, no automaticretry/model/CDP.

Worker removed unnecessary active diagnostic catch after preserving evidence and prepared exact relative/actual-host-absolute URL matching for profile/consultant/all9picker with origin+pathname/decoded48px/panel constraints. Syntax/diff0,file235lines,lease121released, bounded reread pending. Current actual foreign shortslot is respected; nextheadless waits actualhandover/sourcePASS/freshresources, reusing unchanged successful appcheck/build/restart.

## Final passing runtime, image review and eval preparation

NormalizedURL selector reread R2 SOURCE PASS17:38 closed Medium1p: exact relative or actual-host absolute URL, actual origin/pathname, decode/complete48px/panel fit retained for profile/consultant/all9picker. No product change or repeated build. Actual shortslot22/22/owncleanup/directhandback received before fresh4807180KiB/scoped compatible resource read. ONE research/H11-final-layout-r5.log EXIT0: DM anchored266PASS0FAIL/console[], all9HTTP200/decoded48px/visiblepanel, normal/reducedmotion edit cancellation/noautosend and labelled guest-language UI transition passed. Ownchildren absent, legacycaptures restored preservingh11, lease123released/directheavyhandback17:41.

Same independent reviewer final B/C IMAGE PASS opened eight frames: h11-b-{take-over-reply,staff-warning,hand-back-note}-{1440,390}.png and h11-c-start-{1440,390}.png. Final D IMAGE PASS17:43, concise recap17:45, no findings/openimageitems; actually opened23 frames under docs/screenshots: h11-d-owned-profile{,-focus}-{1440,390},owned-consultant-{1440,390},picker-preview-{hover,focus}-{1440,390},kb-{hover,focus}-{1440,390},quick-replies-{hover,focus}-{1440,390},guest-language-synthetic-{1440,390},suggestion-{1440,390},suggestion-motion-1440 (all with h11-d- prefix/.png). Real containing columns/neighbouring panels inspected; no clipping/occlusion/readability/control-fit finding. Real owned profile/consultant is distinct from labelled synthetic picker/KB/choices/guest. No new D keyboard interactions: focus images/functional log assertions separate; unchanged A actual image/keyboard PASS reused.

Exactly three capture scripts committed2bed439 and lease124 immediately released. Metadata-only model read first failed sandbox spawnEPERM, then normal escalated attempt exposed quoting error before model invocation; corrected loader read exit0 confirmed gpt-4.1/gpt-6-luna/text-embedding-3-small. No envfile/secret content printed, model call or service change. Existing just eval exact49 selection/72textturns/3approvalstories/1addressclick prepared with task-local PUBLIC_DEMO=false, NOT_RUN pending current finite resource job's actual cleanup/directhandback. One campaign only, no repeat/extra paid browser turn.

## Final evaluation disposition and actual results

Initial research/H11-final-eval.log EXIT1/4PASS45FAIL was configuration-blocked: with-key had no key and no configured broker binding; the loader reported .env.local missing. Owncleanup/lease127released, sourceclean. Operator explicitly ruled it was not the approved evaluation and amended ONEactual49campaign with environment-only existingbroker/H10binding; old log preserved, no source/newgate/build/check or paidprobe. Supported exact-name broker has returnedSET only; key value never read/printed/stored by agents.

After currentactualpeer allocation/fresh~4.41GiB/no matchingheavy, proper with-key/inject campaign research/H11-final-eval-r2.log actually ran18:14:47–18:20:55 (local log metadata), EXIT1/40PASS9FAIL, full49 rows/ms/exactnotes+originalreasons in main report, Security8/8PASS. Sumscenarioelapsed364762ms; no token/billing measurement. Owncampaignprocessreadempty/lease128released/directhandback observed; gitclean/no productchange or repeatedactualcampaign. Independent same-reviewer finalnineclassification complete18:23/compact18:24: unmetactions distinguished from fixture rigidity/unknown, cancellation not proven secondcanceldefect, outputblock not leak/falsepositive proof, offercall not successfulwidget proof. ExactallFAILs retained; no waiver/fix/rerun. PlannedcostUSD4.25488/about4.3/range2–14 remains an estimate, not billedcost. ModelacceptanceFAIL staysopen forPO/operator disposition.
