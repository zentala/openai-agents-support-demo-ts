# H14 scenario gallery delivery report

Current acceptance is in the final private-session-secret correction section; earlier figures and images
are retained as the initial delivery history.

Scope: G1 (8 points), G2 (8 points), G3 (5 points), High importance; 21 points total.
The coordinator implements and verifies directly in this session, as explicitly requested.
No DM, implementer or reviewer agents. No push, remote-machine contact or report publication.
This serves the vision of making the TypeScript agent's behavior visible before setup.

## G1: recorded gallery artifacts

Fourteen curated scenarios (25 frames) use English customer input and the English-speaking
demo customer, with guest scenarios using the guest identity. Gallery-specific English
messages live in the shared scenario JSON without changing the existing eval messages.
Real Playwright screenshots retain the complete 1440 × 900 app viewport; ffmpeg converts
PNG captures to WebP. Focus bounds come from the real selected DOM element.

The human-request recording separates actual takeover from the subsequent reply through
the existing `take_over` API, because the current UI combines them in its first reply
button. The third frame therefore proves human ownership before the fourth shows a reply.
This rule-only recording was refreshed without an API key or model calls.

Coordinator image inspection: real refund approval/resume, completed claim submission,
guest verification and address confirmation frames inspected. The address proposal run
also shows an output leak-guardrail refusal; the structured proposal remains present and
the Confirm click visibly applies the address. This is retained as the actual model
outcome, not edited out or reported as a full eval PASS. No model/prompt change is made.

`just gallery local` starts a short-lived isolated production app with synthetic resets.
The optional broker path is read from the local `broker path variable` environment and bound
to `PASSWORD_BROKER_SCRIPT` before `node scripts/with-key.mjs`. No key is printed, saved
or included in metadata. Complete unchanged recordings are cached without model calls.

## Retained execution failures

- Initial shell startup tried to lock the user's Git config outside the sandbox. Subsequent
  shell commands use no login profile; no Git config was changed.
- A metadata preparation command used three nonexistent scenario IDs and stopped before
  writing. The catalog's actual IDs were inspected and the metadata command corrected.
- The first local browser launch returned `browserType.launch: spawn EPERM` in the sandbox.
  The supported escalated execution succeeded. No model turn ran before that failure.
- The first the local service manager read returned `connect EPERM` on its local pipe; supported escalation
  succeeded. The existing managed app was not reset, restarted or modified for recording.
- First complete recording run captured six scenarios, then timed out (exit 1) on the
  prompt-extraction focus selector: a guardrail refusal is an automatic step, not an AI
  assistant bubble. Changed that scenario's focus metadata to the guardrail card; cached
  complete scenarios are reused. This single changed scenario requires another model turn.
- Early `just check` failed (exit 1): 663 passed, one catalog-completeness test failed while
  only six of fourteen recordings existed. The failure is retained; run the final check
  after the remaining artifacts exist. Typecheck and lint had passed.

G1 acceptance: final `just check` PASS, exit 0 (664 tests in 77 files; typecheck,
lint, 23 CodeTour anchors, 49-scenario README catalog, icon boundary/export checks).
`just build` PASS, exit 0; production artifacts exist at `app/.next/BUILD_ID` and
`app/.next/standalone/server.js`. Coordinator inspected the real takeover frame and
confirmed a human handler before the separate reply. G1 is complete; commit and immediate
lease release follow.

G1 committed as `1303c36`; lease release returned `release: ok` immediately afterwards.

## G2: static page and browser player

Implemented the approved composition in plain HTML/CSS/JavaScript. Full-screen recorded
frames use measured focus bounds, a dim surround, highlight ring and gentle per-step zoom.
Plain mode disables both dimming and zoom; reduced motion disables animation. Controls
include previous/next, play/pause/replay, clickable step track/list, 0.5/1/1.5/2× speeds,
Arrow keys and Space. Playback holds on the last frame, stops and never loops.
All three playback glyphs remain mounted; exactly one is visible after every transition.

Shared registry extended to 67 unique meanings; `just icons` generates identical app and
gallery sprite/JSON. README and app header link to the prepared GitHub Pages destination.
The workflow uploads only `site/` from `main`; no CI model calls, push, remote Pages
configuration or deployment was performed.

Browser verification PASS: 743 assertions, all 14 scenarios manually stepped and fully
played/replayed at both 1440 and 390. Checked the recorded-focus geometry for every frame,
one visible playback icon after every transition, no looping, speed, keyboard, deep-link
reload, reduced motion, plain mode, no page overflow and >=24px controls. All visible
sprite symbols render actual geometry. No browser console/page errors or failed assets;
external requests were blocked. Evidence: `research/H14-gallery-browser.txt` and
`docs/screenshots/h14-gallery-{1440,390}.png`, plus the corresponding plain-frame captures.

Built-app header verification PASS at 1440/390 in an isolated local production process,
without model calls. Evidence: `docs/screenshots/h14-app-header-{1440,390}.png`.
The app build passed (exit 0); artifacts remain `app/.next/BUILD_ID` and
`app/.next/standalone/server.js`. No live managed service restart was needed.

Coordinator image review (explicit user-requested substitute for separate reviewers):
inspected full wide/narrow rendered gallery, plain mobile viewport and actual-app headers.
The gallery retains the approved visual family, player precedes the list on mobile,
controls are reachable, full app context is visible, captions/steps remain readable and
the spotlight aligns with the automatic ticket notice. No clipping or occlusion found.
Actual app text inside a 390px full-screen recording is necessarily small; captions and
plain-frame toggle retain the owner-approved whole-screen presentation.

Initial destination gap (resolved by the owner on 2026-11-16): the repository originally
contained no public live-demo URL, so the first version used a clearly labelled local-run
fallback. The owner subsequently supplied https://openai-agents-support-demo.onrender.com/;
the gallery now says “Open the live demo” and links there. Publication and public runtime
availability remain outside this local link update's verification.

Retained G2 failures: `just icons` first returned esbuild `spawn EPERM` in the sandbox;
supported escalation then exposed an unavailable Lucide `Github` export. Replaced it in
the registry with the installed `GitFork` glyph and regenerated successfully. The first
browser run timed out before the missing assets existed. The next reported zero geometry
for intentionally hidden playback icons; corrected the check to inspect visible symbols.
The final 743-assertion browser run passed. These were setup/test failures, not model retries.

G2 final integrated `just check` PASS, exit 0: 664 tests / 77 files, all existing checks,
67-key generated icon exports and the 743-assertion static browser suite. The built app
source is unchanged since its successful production build and header checks. G2 source,
assets and local acceptance are complete; the owner-supplied live destination is configured.

## G3: captioned README media

`just screencast` now reads the existing four `human-request` frames, burns 24px English
captions into an 88px dark strip and writes the existing README GIF and WebM paths. It
needs no browser, app server, API key or model calls. Local font discovery supports
Windows/Linux/macOS and a `SCREENCAST_FONT` override. The media README documents the path.

PASS `just screencast`, exit 0: GIF 524862 bytes, WebM 330998 bytes. ffprobe observes four
encoded GIF frames, 12.52s total, with an exact 4s last-frame duration. The 3 MB ceiling is
checked by the command. The coordinator inspected the captioned final frame in
`docs/screenshots/h14-screencast-last.png`: the customer sees the real named consultant
reply and the full application context remains visible. Evidence: `research/H14-screencast.txt`.

Retained G3 failures: an initial patch attempted delete/add on the same path and was
rejected without edits. The first encoding command returned sandbox `spawnSync ffmpeg
EPERM`; supported escalation ran. A first 10fps GIF encoded the right total duration
but its last packet lasted 0.1s, failing the explicit hold check. Changed only the GIF
encoding to four variable-duration frames and `final_delay=400`; the final output passes.
A report patch with unmatched context was rejected without edits. No model reruns occurred.

## Final verification and handover

| Item | Done / not done | Evidence / remaining action |
| --- | --- | --- |
| G1 (8 points): recorder, metadata and real frames | Done | 14 scenarios, 25 frames, catalog/icon tests and actual-frame review |
| G2 (8 points): static page, player, links, Pages workflow | Local implementation done | 743 browser assertions at 1440/390, coordinator image/source review; owner-supplied public URLs configured |
| G3 (5 points): captioned README GIF/WebM | Done | 524862-byte GIF, 4s final hold, ffprobe and image inspection |
| Production build | Done | Exit 0; `app/.next/BUILD_ID`, `app/.next/standalone/server.js`; final relevant app source unchanged since build |
| Final owning check | Done | Exit 0: 664 tests / 77 files, typecheck, lint, 23 tour anchors, 49-scenario catalog, 67-icon boundary/export checks and 743 browser assertions |
| Public Pages/live-site verification | Not done | Publication coordinator owns push, Pages source configuration and public runtime verification |
| Separate reviewer agents | Not run by explicit instruction | Coordinator performs source and actual-context image review in this session |

G2 committed as `84be2db`; immediate lease release returned `release: ok`.
G3 includes the media, documentation, final state and this completed verification report
in its own final commit. The session's final operation is immediate lease release; no
push follows. The production build is reused because G3 changes no app source.
The owner supplied the live demo, repository, booking, contact, OpenAI key and spend-limit
destinations on 2026-11-16. The site uses those destinations; the README top and existing
app header gallery link use https://zentala.github.io/openai-agents-support-demo-ts/.
The spend-limit text links to the supplied account-limits page. DECIDE has no open item.
No external report page was created, no other machine
was contacted, and no push was performed. The one-time model recording work is complete;
future recording commands reuse complete unchanged scenarios.

Public-URL follow-up verification (2026-11-16): `just check` PASS, exit 0, including
664 tests / 77 files and all 743 gallery browser assertions at 1440/390. A focused local
HTML/source inspection confirms all six supplied public destinations and the confirmed
gallery URL in the README and app header. Public hosts were not contacted; no model
calls, push or deployment were performed. The URL update is delivered in one commit.

## Coordinator review round 1 (2026-11-16)

The accepted decisions were recorded in DESIGN.md before implementation. Each of the
twelve requested items has a separate commit, with its lease released after that commit.
The coordinator implements and verifies directly; no other agents or model calls run.
This round supersedes the initial gallery's mobile presentation and icon assignments.

| Item | Importance | Points | Done / not done | Delivered change |
| --- | --- | --- | --- | --- |
| 1 | High | 2 | Done | Focus-centred mobile zoom up to 1.8×; wide focus rectangles fit their text; Plain mode retained |
| 2 | High | 2 | Done | 0.28 dimming and 6px rendered focus padding |
| 3 | High | 2 | Done | Only human-request re-recorded, without a key; step 2 targets the measured Agent View waiting row and asserts model-skipped evidence |
| 4 | High | 3 | Done | Scale/translation cover every stage edge throughout animation; ResizeObserver recalculates on viewport/column changes |
| 5 | Medium | 2 | Done | Equal-height flex cards, bottom-aligned buttons, blue icon tiles, account-limit link under its button |
| 6 | Medium | 2 | Done | Shared shows metadata and dedicated ScanEye chip; existing AI frames reused unchanged |
| 7 | Medium | 3 | Done | steps/ListOrdered, liveDemo/MonitorPlay, player-only play; official filled GitHub mark is the single documented custom glyph |
| 8 | Medium | 1 | Done | Two separate badge/explanation pairs |
| 9 | Medium | 2 | Done | 40px segmented radiogroup, keyboard selection and 40px brand link |
| 10 | Medium | 1 | Done | Two-sentence mobile hero |
| F1 | High | 1 | Done | Explicit contents: read permission on the Pages job |
| F2 | Medium | 2 | Done | Space toggles playback only on the focused player or body; other buttons retain native actions |

Total reviewed scope: 23 points. The refreshed free recording also regenerates README
media: GIF 497900 bytes, 12.52s total, exactly 4s final hold; no AI scenario re-recorded.
The custom mark uses the unchanged official Primer/Octicons mark-github-24.svg path;
docs/icons.md and generated JSON retain its source and separate GitHub brand notice.

First integrated check PASS (exit 0): 665 tests / 77 files and 909 browser assertions.
The geometry regression file initially used JavaScript, which the existing TypeScript-only
Vitest include did not discover (NOT_CHECKED). Extended the existing include to both test
extensions; the final check must include those two geometry regressions before acceptance.
Production `just build` PASS, exit 0: `app/.next/BUILD_ID` and
`app/.next/standalone/server.js` observed. Subsequent changes touch only static gallery
CSS and its browser checks; the built app source is unchanged and the build is reused.
The final focused gallery smoke PASS, exit 0: 941 assertions, all 14 recordings at
1440/390, including real resize checks at 819 and 820px and a full deep-link reload.

Retained round failures: the branch-lease hook rejected one multi-file patch before edits
because checkout inspection timed out (HARNESS-LEASE-CHECKOUT-TIMEOUT, spawnSync git
ETIMEDOUT). Verified Git responsiveness/root and retried through the hook's stated recovery;
the same patch succeeded. The first custom-mark export failed with React is not defined
(exit 1); adding the explicit React import fixed the root-level JSX exporter (70 icons).
An unmatched report patch was rejected without edits. No controls or permissions changed.
The expanded breakpoint run then failed (exit 1) on focus-ring position while the test
read dimensions before ResizeObserver settled. Waiting for the actual measured origin
to match the resized stage resolved the stale read; the same real geometry assertions
then passed at both widths (941 assertions). No geometric assertion was removed.

Final round verification and the refreshed image-review verdict are recorded below.

Final owning `just check` PASS, exit 0: 667 tests / 78 files, typecheck, lint, CodeTour,
README catalog, 70-key icon boundary/export checks and 941 browser assertions. The focused
post-build smoke also passed with 941 assertions. The smoke now performs an actual reload
for deep links and waits for each image to decode before captures. No browser errors,
missing assets, model calls or external browser requests occurred. The production build
remains valid for the final unchanged app source; static gallery files need no bundle.

Coordinator image verdict: PASS. Inspected all eight actual-host viewport screenshots
below. Wide captures include the containing column and neighbouring list/details. Narrow
captures show the focus magnified with no empty stage edges, reachable 40px speed choices,
native-size captions/steps, a two-sentence hero and stacked live cards. The mid-step ring
surrounds the Agent View waiting/model-skipped evidence with clear padding; the last step
shows the consultant reply and Replay. Card buttons align on desktop and the spend-limit
link stays below its button. Plain mode and reduced motion also pass browser checks.

| View | Done / not done | 1440px | 390px |
| --- | --- | --- | --- |
| Top | Done | [capture](../../docs/screenshots/h14-top-1440.png) | [capture](../../docs/screenshots/h14-top-390.png) |
| Player mid-step | Done | [capture](../../docs/screenshots/h14-player-mid-1440.png) | [capture](../../docs/screenshots/h14-player-mid-390.png) |
| Player last step | Done | [capture](../../docs/screenshots/h14-player-last-1440.png) | [capture](../../docs/screenshots/h14-player-last-390.png) |
| Try it live | Done | [capture](../../docs/screenshots/h14-live-1440.png) | [capture](../../docs/screenshots/h14-live-390.png) |

Only `docs/screenshots/h14-*.png` changed; no other screenshot needed restoration. The
initial dirty H14 plain-frame capture was refreshed within the explicitly requested scope.
The final verification commit includes regression checks, captures, report and current
state. Release the final lease after committing. No push, deployment, report publication,
other agent invocation or infrastructure-machine contact was performed. The sole public
source read was the requested official GitHub brand geometry; all scenario work was local.

## Private-session-secret correction (2026-11-16)

Owner-visible defect: earlier frames exposed the Agent View warning about the public
default session-signing secret. The prior recording setup had omitted a private secret;
earlier visual acceptance missed the notice. The owner explicitly approved a corrective
re-run of the same 14 scenarios, including their AI cost. No scenario/model/prompt changed.

| Item | Importance | Points | Done / not done | Evidence |
| --- | --- | --- | --- | --- |
| Recording server and capture guard | High | 3 | Done | Fresh crypto.randomBytes(32) secret passed only in the isolated child's environment; no persistence/logging; visible warning refuses startup recording and every capture |
| All gallery recordings | High | 3 | Done | Full --rerecord command exit 0; 14 scenarios, 25 replaced WebP frames and measured bounds; all 25 pre-capture safety checks passed; no cached frames reused |
| README media and final verification | High | 2 | Done | GIF 522187 bytes, WebM 325614 bytes, 12.52s, exact 4s final hold; final just check exit 0 |

The OpenAI key was injected through the local broker and scripts/with-key.mjs, without
printing or saving it. The independent random session secret is generated inside the
recording process and never inspected by the coordinator. The app's real warning remains
unchanged; no CSS hiding or screenshot editing was used. Every old frame was replaced,
including rule-only scenarios. See research/H14-private-recording.txt for the 25 captures.

Focused no-model safety verification PASS (exit 0): the actual private app has no warning
at 1440/390; a visible-warning browser fixture is refused, a hidden fixture accepted.
The same guard regression is now included in the existing gallery smoke, including the
no-notice case. Coordinator inspected actual human-request and input-guardrail frames,
plus the refreshed captioned final frame; the public-default notice is absent.

Source fix committed as 8fc0dcf and complete recordings as a3f29fc, each followed by a
successful lease release. The first source patch was NOT_RUN by the branch-lease hook's
checkout-inspection timeout (HARNESS-LEASE-CHECKOUT-TIMEOUT, spawnSync git ETIMEDOUT).
Verified Git root/responsiveness, followed the supplied recovery and applied the patch;
no secret or provider invocation happened before that correction. The full recording
completed on its first model run, without corrective scenario/model retries.

Final verification PASS, exit 0: `just check` includes 667 tests / 78 files, typecheck,
lint, existing documentation/icon checks and the gallery smoke's 944 assertions. The
smoke covers all 14 scenarios at 1440/390, playback, measured focus, keyboard, responsive
geometry and three capture-guard visibility cases. The refreshed wide/narrow gallery
screenshots and README final frame were inspected with the corrected recordings; no
public-default-secret notice remains. Only H14 screenshots changed. No full app rebuild
was needed: app source is unchanged from the observed successful production build, and
the real isolated app correctly reads its private runtime environment.

The secret value never appears in source, artifacts, commands or logs; only its runtime
environment binding exists. The recording log contains scenario/step progress only.
All 25 replacement frames and their metadata are committed; the final item commits media,
refreshed gallery captures, guard regression and this report. Release the lease after it.
No push, deployment, external report publication or other-machine operation was performed.
The published gallery is not changed by these local commits; publication remains with
the coordinator. No further model work is pending for this correction.
