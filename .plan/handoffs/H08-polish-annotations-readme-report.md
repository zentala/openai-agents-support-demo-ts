# H08 implementation report — 2026-11-10

Contract: [handoff](H08-polish-annotations-readme.md), [DESIGN.md](../../DESIGN.md). No push. Parts executed in order. Independent acceptance is separate from implementer checks.

## H08a — review fixes and eval runner

N1/N2: customer selector has a 190px minimum and a 224px cap from 768px, sharing the header. At 1024px the title may wrap to keep reset on the same row. N3: correction is 14px with a short placeholder. N4: handler note wraps in a 6px rectangle. N5: History uses local YYYY-MM-DD HH:mm:ss. N6: documented grey count badge. N7: standard secondary Retry and suppressed stale unprotected labels/caveat on authentication refusal.

E1: an exception inside a scenario becomes a FAIL row with its type/message and tool evidence, then the CLI continues. Importing the runner in offline tests does not execute its CLI. A regression runs a missing-proposal scenario followed by another scenario and verifies FAIL then PASS.

Only permitted model run: `just eval address-change-confirm address-delivered-refused`, invoked once, exit 0. No full eval.

| Scenario | Result | ms |
|---|---|---|
| address-change-confirm | PASS | 16474 |
| address-delivered-refused | PASS | 5675 |

`just check`: exit 0, 40 files / 342 tests and 23 tour anchors. `just build`: exit 0; artifacts `app/.next/BUILD_ID` and `app/.next/server/app/`. server restart and final smoke results follow below.

Initial smoke failed one assertion because its rendered-colour assertion assumed a fixed RGB representation for a Tailwind v4 token; replaced that assertion with a theme-independent rendered contrast distinction. Screenshot inspection also found reset alone on a second row at 1024px and stale unprotected caveat during a synthetic 401; both were corrected and the final checks/build repeated. Earlier failures remain in [first log](../../research/H08a-layout.log).

## Annotation mode decision

The owner selected manual copy/paste, without an additional server. Read the complete agentation skill before implementation. No MCP or live agent synchronization is requested or claimed.

H08a final acceptance: check/build/restart/layout smoke all exit 0. [Final layout log](../../research/H08a-layout-final.log). Screenshots use h08 names, including chat-start-1024, chat-start-768, consultant-selected-390 and password-notice-390. No full eval or additional model turns.

## H08b — manual developer annotations

Installed agentation 3.1.2 using corepack pnpm and preserved its license in NOTICE/docs/licenses. No duplicate mount. Header Settings and the root share a browser store. Build-time flag or persistent explicit URL grant permits access; switch preference persists separately. Default page has no gear, toolbar or Agentation payload request. No endpoint/MCP server. Read/write storage failures have a visible typed error. [ADR 012](../ADR/012-opt-in-developer-annotations.md) records the client boundary.

Acceptance: build exit 0; restart exit 0; final check exit 0 (41 files / 346 tests, 23 anchors) after an initial stale workspace CodeTour anchor failure (exit 1). Browser smoke exit 0, including no default payload, flag on, off persistence, on reload and an actual annotation copied through the real clipboard fallback. Exact copied synthetic comment: `H08 smoke: keep this heading readable.` with the Current turn heading. Screenshots: settings-on-1440, settings-off-1440, annotation-copied-1440. [Smoke log](../../research/H08b-layout.log). The package's desktop feedback flow was exercised; no live agent sync is claimed.

## H08c — README and reproducible screencast

README is 190 lines: one-line pitch, hero GIF/WebM, explicit original-demo credit and additions, screenshot feature tour, key setup, commands, architecture/ADRs/instructions, eval-driven models, annotations, proposed hosting, preserved Security section, license/NOTICE. Local Markdown/media links resolve. Security's rules, hardening history and demo limits remain intact; /readme still renders this source.

Playwright is now a locked project dev dependency, replacing the smoke's dependency on a private temp installation. `just screencast <base-url>` invokes the existing smoke's --screencast branch with recordVideo. The actual deterministic flow opens a ticket, takes over and pushes a consultant reply to customer chat. ffmpeg creates optimized GIF and VP9 WebM. No server reset or model turn is used. [Regeneration/timeline](../../docs/media/README.md), [recording script](../../scripts/record-screencast.mjs).

First conversion returned exit 0 but ffmpeg warned `File ended prematurely`; the 4.4s output was treated as a failed artifact, not accepted. Explicitly closing the Playwright context before closing the browser flushed the complete recording. Re-recording passed without that warning. The corrected final frame visibly contains the customer's received consultant reply.

| Artifact | Duration (ffprobe) | Bytes | Done |
|---|---|---|---|
| [support-demo.gif](../../docs/media/support-demo.gif) | 8.01 s | 2,376,699 | yes, below 20 s / 3 MB |
| [support-demo.webm](../../docs/media/support-demo.webm) | 7.95 s | 291,983 | yes |
| [Final video frame](../../docs/screenshots/h08-screencast-final.png) | extracted 0.4s before end | — | yes, customer reply visible |

[Screencast corrected run](../../research/H08c-screencast-r2.log); [first failed artifact run](../../research/H08c-screencast.log). The script creates synthetic in-memory tickets/takeover while recording; the required later server restart clears that demo state. Browser checks also create synthetic tickets and notes in isolated contexts, leaving unrelated feedback untouched.

## Acceptance per part

| Check | H08a | H08b | H08c | Done |
|---|---|---|---|---|
| just check | exit 0, 342 tests | exit 0, 346 tests | exit 0, 346 tests | yes |
| just build | exit 0 | exit 0 | exit 0 | yes |
| restart the server | exit 0 | exit 0 | exit 0 | yes |
| Layout smoke on demo.example | exit 0, 144 PASS | exit 0, 149 PASS | exit 0, 151 PASS | yes |
| Address eval (one invocation) | exit 0, 2/2 | not repeated | not repeated | yes |
| Full just eval | not run | not run | not run | excluded by instruction |
| Independent source/visual review | pending | pending | pending | no; next review stage |

Every owning build produced `app/.next/BUILD_ID` and `app/.next/server/app/`. Final [layout log](../../research/H08c-layout-final.log) includes ISO History dates and reachable Settings at 390px. The existing [annotation smoke](../../scripts/smoke-annotations.mjs) verifies actual copy text, no default Agentation payload, explicit URL permission, persisted off/on preference, reload and a narrow viewport. The build-time grant is wired through NEXT_PUBLIC_DEV_ANNOTATIONS and covered in the access-policy unit test; a separate env=true production build was not run.

## Rendered evidence

| Finding / surface | Actual-host screenshot | Done |
|---|---|---|
| N1: 1024px selector and aligned reset | [1024](../../docs/screenshots/h08-chat-start-1024.png) | yes |
| N2: capped selector sharing the header | [768](../../docs/screenshots/h08-chat-start-768.png) | yes |
| N3/N4: correction and wrapping handler note | [390](../../docs/screenshots/h08-consultant-selected-390.png) | yes |
| N5: History date | [History](../../docs/screenshots/h08-resolved-history-768.png) | yes |
| N7: authentication refusal and secondary Retry | [401 at 390](../../docs/screenshots/h08-password-notice-390.png) | yes |
| Settings on | [1440](../../docs/screenshots/h08-settings-on-1440.png), [390](../../docs/screenshots/h08-settings-on-390.png) | yes |
| Settings off | [1440](../../docs/screenshots/h08-settings-off-1440.png), [390](../../docs/screenshots/h08-settings-off-390.png) | yes |
| Real annotation copy | [desktop](../../docs/screenshots/h08-annotation-copied-1440.png) | yes |

Implementer inspected the 1024px header, synthetic 401, selected Consultant at 390px, Settings at 1440/390 and final video frame. The first header/caveat findings were corrected before final captures. No clipping or unreachable action was observed in inspected corrected states. These are implementer checks, not independent visual acceptance.

Not checked in this campaign: full model/browser flow, public hosting/BYOK, MCP sync (not requested), other browsers, screen reader or compressed-video legibility. No API, business-rule, prompt or model default changed. Supporting skills used: agentation (manual mode), process-manager and harness-command-bindings. No push.

Next action: independent reviewer checks the source, screenshot links and complete GIF/WebM, then records acceptance or confirmed fixes in this campaign.
