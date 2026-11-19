# H13 — icon registry implementation report

Scope: [accepted handoff](H13-icon-registry.md), 8 points, Importance High.
Direct implementation in the existing session under the owner's explicit instruction.
No DM, implementer or reviewer agents; independent verification belongs to the coordinator.
No push or eval. H14 must wait for H13 verification.

## Coordinator review round 2 corrections

One commit for the three small corrections; no screenshots, build, restart or browser
run requested in this round. Earlier runtime/image results remain round-1 evidence.

| Item | Importance | Points | Done / not done | Evidence |
| --- | --- | --- | --- | --- |
| 1: exact reset glyph | Low | 1 | Implemented | Registry now uses RefreshCcw; retry stays RotateCw and replay RotateCcw. `just icons` regenerated SVG, JSON and DESIGN map (61 keys); affected browser selector updated to lucide-refresh-ccw for future runs. |
| 2: remaining historical assignments | Low | 1 | Implemented | DESIGN.md:336 (human/UserRound) and DESIGN.md:345 (No AI needed) explicitly marked superseded; other geometry preserved. |
| 3: report row references | Low | 1 | Implemented | Final DESIGN.md row numbers verified: 336 staff mapping, 341 selector, 342 product map, 345 rule-only note, 346 category map. References below use these final row numbers. |

Round-2 estimate: 3 points; cumulative recorded scope: 21 points (original 8 + round 1 10 + round 2 3).
The round-1 design wording already named RefreshCcw, but the actual registry/export and
browser selector still used RefreshCw. This round corrects that source/document mismatch;
it does not retroactively claim the old screenshot or browser result proved RefreshCcw.
Final `just check`: PASS, observed exit 0 — 662 tests / 76 files, typecheck/lint,
23 CodeTour anchors, README catalog 49, icon import boundary and 61-key export freshness.
Local log: `research/H13-review-r2-check.log` (git-ignored). Five explicit line-reference
checks also PASS against the final DESIGN file. No screenshots, build, restart, browser,
model calls, push or publication in this round; stop for coordinator verification.

## Coordinator review round 1 corrections

The owner accepted the coordinator's six decisions. All six corrections are implemented
in this session, one commit and immediate lease release per item. Final local gates and
fresh captures PASS for the corrected source. Independent coordinator verification is next;
the earlier acceptance below is historical. No H14 work, model calls, push or publication.

| Item | Importance | Points | Done / not done | Evidence |
| --- | --- | --- | --- | --- |
| 1: one staff identity icon | Medium | 2 | Implemented | DESIGN first; all staff identity labels/notices/handler summaries and selector use consultant/Headset; human icon key removed, customer data kinds unchanged. 61 unique export keys. |
| 2: recognizable reset | Low | 1 | Implemented, exact glyph corrected in round 2 | Round 1 retained Reset conversation tooltip, replay/RotateCcw and contextUpdate/FilePenLine, but implemented RefreshCw for reset; round 2 changes it to the specified RefreshCcw. |
| 3: metric and agent-chip icons | Low | 2 | Implemented | DESIGN first; four metric labels reuse ticket/guardrail/approval/error; all three agent chips use agent. |
| 4: rule badge | Low | 1 | Implemented | DESIGN first; shared gray rule badge with automaticStep/Cog in starter buttons and scenario menu. Tooltip explains code decides. |
| 5: superseded design rows | Low | 1 | Implemented | Current DESIGN.md:341 (selector), :342 (product map) and :346 (category map) explicitly defer glyph selection to the registry and review amendments. Selector geometry/accessibility retained. |
| 6: additional rendered states and final gates | Medium | 3 | Implemented; coordinator review pending | 662 tests, production build, restart, 303 layout checks and 9 isolated public-key checks PASS; 20 screenshots at 1440/390. |

Review-correction estimate: 10 points; original implementation: 8 points.

Review correction commits 1–5: `679d73c`, `2ee2b6e`, `b5e876f`, `a325c51`,
`29475df`, respectively. A native lease release was observed immediately after each.
Item 6 uses the existing no-model layout smoke plus the existing isolated public-mode
harness's new `--icons-only` branch. That branch does not access a real key or send chat;
it captures and exercises the real Clear control with a synthetic marker only.

### Corrected-source verification

| Gate | Done / not done | Evidence |
| --- | --- | --- |
| `just check` | Done | Exit 0: 662 tests / 76 files, typecheck/lint, 23 tour anchors, catalog 49, import guard, 61 unique glyphs and fresh SVG/JSON/DESIGN exports. `research/H13-review-r1-check.log`. |
| `just build` | Done | Exit 0; artifacts `app/.next/BUILD_ID` and `app/.next/standalone/server.js`. `research/H13-review-r1-build.log`. |
| Managed local restart | Done | a restart of the local app service exit 0, running/ready/live observed before layout. `research/H13-review-r1-restart.log`. |
| Local layout with icons | Done | Exit 0, 303 PASS / 0 FAIL, console `[]`; actual sprite, reset tooltip, rule badge, both address/approval buttons, metric meanings and real dialog Close/focus checked. `research/H13-review-r1-layout.log`. |
| Isolated public-mode Clear | Done | `node scripts/smoke-public-demo.mjs --icons-only`, exit 0, 9 PASS; password input, correct icon, aligned 40px controls, real clearing, no overflow. `research/H13-review-r1-key-r2.log`. |
| Requested images | Done | All five requested additional states at 1440×900 / 390×844, plus metrics; eight earlier H13 frames refreshed, for 20 H13 PNGs total. All non-H13 screenshots restored. |
| Independent source/image acceptance | Not done | Coordinator owns re-review. The implementer inspected the rendered images but does not certify independent acceptance. |

The public-only run first passed all nine control checks, but its images still showed
initial thread loading. The capture helper then waited for the existing scenario trigger
to become ready and recaptured only those two frames (again 9 PASS). Both local logs
remain history. No app source changed after the successful full check/build; this was a
capture-timing correction only. The isolated browser and its temporary server were closed
by the existing harness's finally block before its observed exit 0. No real key was read,
typed or sent, and no chat/model turn ran in that harness. The the local service manager service configuration
and public/private mode were unchanged.

### Additional evidence for coordinator re-review

| Surface | 1440 px | 390 px | Scope |
| --- | --- | --- | --- |
| How it works | [wide](../../docs/screenshots/h13-how-it-works-1440.png) | [narrow](../../docs/screenshots/h13-how-it-works-390.png) | Actual tab, containing workspace, runnable action icons. |
| Address Confirm/Cancel | [wide](../../docs/screenshots/h13-address-confirm-1440.png) | [narrow](../../docs/screenshots/h13-address-confirm-390.png) | Labelled HTTP display fixture; buttons enabled/focusable with confirm/cancel icons. No address mutation attempted. |
| Consultant Approve/Reject | [wide](../../docs/screenshots/h13-approval-1440.png) | [narrow](../../docs/screenshots/h13-approval-390.png) | Labelled console-state display fixture; real card component, wrapping controls, Headset selector label. No approval or refund executed. |
| KB article dialog / Close | [wide](../../docs/screenshots/h13-kb-dialog-1440.png) | [narrow](../../docs/screenshots/h13-kb-dialog-390.png) | Actual repository article and native dialog; Close clicked, focus returned to citation. |
| Visitor key / Clear | [wide](../../docs/screenshots/h13-key-clear-1440.png) | [narrow](../../docs/screenshots/h13-key-clear-390.png) | Real public-mode app in the existing isolated local harness, synthetic marker cleared before capture. |
| Metric icons | [wide](../../docs/screenshots/h13-metrics-1440.png) | [narrow](../../docs/screenshots/h13-metrics-390.png) | Correct existing semantic keys; the pending-approval counter is part of the explicitly labelled display fixture. |

These captures establish presentation and the explicitly exercised UI controls, not SDK
approval execution, address authorization, model behavior or a new eval result. Existing
business rules and scenario expectations were unchanged. No independent reviewer agents
or other machines were used. The coordinator presents this repository report to the owner.

## Original implementation

| Item | Points | Done / not done | Evidence |
| --- | --- | --- | --- |
| I1: typed registry and renderer | 3 | Implemented | Design decision recorded before code; typed registry and accessible renderer. Two renderer tests and typecheck PASS (exit 0). |
| I2: migrate imports and enforce uniqueness | 3 | Implemented | All 30 direct-import components now use the shared renderer. Nine renderer/message tests and typecheck PASS (exit 0); uniqueness and AST import guard PASS, including import/re-export/dynamic/require negative probes. |
| I3: coverage, generated map and sprite | 2 | Implemented; independent coordinator review pending | Actions, categories, rows and status badges use semantic icons. `just icons`: 62 unique keys exported to SVG/JSON and DESIGN map; final local layout PASS below. |

## Original local acceptance — 2026-11-15, before review round 1

The owner authorized completing restart, layout and captures after the earlier stop.
All local technical gates now PASS; independent source/image acceptance remains with
the coordinator. No application source changed during this final acceptance, so the
already successful full check and production build apply without being repeated.

| Verification | Done / not done | Observed result |
| --- | --- | --- |
| `just check` | Done | Exit 0, 662 tests / 76 files, typecheck/lint, 23 tour anchors, catalog 49, icon import and export freshness checks. `research/H13-check-r1.log`. |
| Production `just build` | Done | Exit 0, `app/.next/BUILD_ID` and `app/.next/standalone/server.js` exist. `research/H13-build-r1.log`. |
| Existing local service restart | Done | a restart of the local app service exit 0; running/ready/live observed before the test. `research/H13-restart-r2.log`. |
| Layout smoke with icons | Done | `node scripts/smoke-v1.mjs <local app origin>/ --layout --icons`, final exit 0; 287 PASS / 0 FAIL, no console errors `[]`. `research/H13-layout-r2.log`. |
| Actual-host icon assets | Done | SVG/JSON HTTP success, every symbol matches a registry key, external sprite symbol renders real geometry; registered decorative non-shrinking action/category icons checked at both widths. |
| Required screenshots | Done | Eight PNGs, 1440×900 / 390×844, linked below. All other tracked screenshots restored with `git restore -- docs/screenshots ':(exclude)docs/screenshots/h13-*'`. |
| Independent coordinator verification | Not done | Source/image review explicitly belongs to the coordinator; implementer inspection is not independent acceptance. |
| H14 | Not started | Waiting for coordinator verification. No model recording, eval or report publication; no push. |

The first layout attempt remains FAILED: exit 1, three FAIL rows, with
`ThreadCreateFailed / HTTP 502 / browser / start conversation` and a 30-second wait
timeout (`research/H13-layout-r1.log`). the local service manager then showed a different process starting;
the cause of that process change is UNKNOWN. After that process became running/ready/live
and its local HTTP HEAD returned 200, one bounded retry passed all 287 checks.
No source/configuration changes, additional manual restart or assertion weakening occurred.
Local `.log` files are git-ignored; these exact outcomes remain recorded in this committed report.

| Captured surface | 1440 px | 390 px | Evidence boundary |
| --- | --- | --- | --- |
| Start screen | [wide](../../docs/screenshots/h13-start-1440.png) | [narrow](../../docs/screenshots/h13-start-390.png) | Real app, category/action icons and neighboring inspector. |
| Consultant console | [wide](../../docs/screenshots/h13-consultant-1440.png) | [narrow](../../docs/screenshots/h13-consultant-390.png) | Real rule-created ticket and transcript in the containing console. |
| Conversation and AI-labelled answer | [wide](../../docs/screenshots/h13-conversation-1440.png) | [narrow](../../docs/screenshots/h13-conversation-390.png) | Real rule/staff messages plus explicitly labelled intercepted AI display fixture; no model ran. Narrow chat is scrolled to the AI answer. |
| Automatic step in that conversation | [wide](../../docs/screenshots/h13-automatic-1440.png) | [narrow](../../docs/screenshots/h13-automatic-390.png) | Actual early-rule receipt; the additional narrow capture shows the complete automatic card before scrolling to the AI answer. |

Implementer inspected all eight images in their actual host context. They show the
changed icon language with readable labels, preserved surrounding panels and no observed
clipping; coordinator review is still pending. The eight captures came from the same
passing layout run; historical screenshots were restored only after its copy step finished.

I3 source commit: `deaf1a4`, with immediate native lease release observed. The final
acceptance commit adds only screenshots and documentation/state. No other machine was
contacted, no Harness Plans page was created, no agents were started and no model calls ran.

Additional retained diagnostic failures: initial sandbox the local service manager status read returned
`connect EPERM` on its local pipe; normal native escalation succeeded. A the local service manager log search
with a pipe-separated regex was misparsed by the Windows command launcher (`'error' is
not recognized`); a simple `--search Error` read succeeded. Neither changed the service.

<details>
<summary>Earlier owner stop checkpoint and implementation history (superseded by the final local acceptance above)</summary>

## Checkpoint at the owner's stop instruction

| Verification | Done / not done | Observed result |
| --- | --- | --- |
| Final `just check` | Done | Exit 0: 662 tests / 76 files, typecheck, lint, 23 tour anchors, README catalog 49, icon import boundary and generated-export freshness PASS. Local log: `research/H13-check-r1.log`. |
| Production `just build` | Done | Exit 0. Artifacts: `app/.next/BUILD_ID`, `app/.next/standalone/server.js`. Local log: `research/H13-build-r1.log`. |
| Restart | Not verified | Request was interrupted before any result returned; completion is UNKNOWN. No retry at this checkpoint. |
| Layout smoke and actual-host sprite rendering | Not done | NOT_RUN. The existing layout command has a prepared `--icons` extension; no runtime/visual PASS is claimed. |
| `docs/screenshots/h13-*.png` | Not done | None captured. Existing H12/history screenshots do not prove H13 visual acceptance. |
| Independent source/image review | Not done | Coordinator owns verification. |
| H14 | Not started | Explicitly waiting for H13 verification; no scenario recording or model/key access. |

Per the owner's stop instruction, the report stays in this repository. No Harness Plans
page was published. The interrupted command sequence returned neither a restart result
nor an SSH result; no remote connection or command execution was observed. Do not infer
either success or a remote failure from the interruption. No further machine contact.
The third source item is preserved in its own commit, with incomplete runtime/visual
acceptance explicit here. Native lease release follows the commit immediately.

I1 committed as `c4a323b`; native lease release observed immediately afterwards.
I2 committed as `c7b3553`; native lease release observed immediately afterwards.
Retained tooling failures: a source collection exceeded its output budget (no edits);
one multi-file patch failed its expected-line check (no edits). An auxiliary read after
release was NOT_RUN by HARNESS-LEASE-NOT-HELD; the hook's supported recovery was to
acquire the next item's lease before retrying. A later patch was NOT_RUN by
HARNESS-LEASE-CHECKOUT-TIMEOUT (Git inspection timeout); a separate Git read confirmed
the owning checkout responded, then the supported patch retry succeeded. No controls changed.

</details>
