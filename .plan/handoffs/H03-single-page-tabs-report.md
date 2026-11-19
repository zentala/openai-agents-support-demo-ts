# H03 delivery report — single-page workspace tabs

Date: 2026-11-09. Repository: agent-demo. Branch: main. No push performed.

Implementation, offline checks, production build and no-model browser acceptance are complete.
Model-dependent acceptance is **NOT_CHECKED** because the OpenAI account has no credits.
Independent visual/source acceptance remains for the follow-up reviewer, as requested in the handoff.

## Scope and commits

The two H02 Low fixes were committed first, then every H03a item, then H03b.
Each numbered design decision was recorded in DESIGN.md before its implementation.

| Item | Importance | Points | Done / not done | Commit | Result |
|---|---|---|---|---|---|
| H02 Low: invisible formatting | Low | 1 | Done | e658d9f | Strip U+00AD, U+034F, U+061C, U+180E and every U+FE00–FE0F selector before masking/output checks. |
| H02 Low: thread error display | Low | 1 | Done | ff2cf90 | Error.message is the server sentence; Error.name retains its type. No JSON wrapper in the visible message. |
| H03a decision 1 | High | Part of 8 | Done | 3a49100 | Shared 3/5 workspace and 2/5 chat; below 1024px chat precedes the panel. |
| H03a decision 2 | High | Part of 8 | Done | b192869 | Radix tabs, URL state, active indicator and keyboard focus. |
| H03a decision 3 | High | Part of 8 | Done | 2f27151 | Pending approvals plus open tickets; amber on unseen increases; opening Consultant acknowledges them. |
| H03a decision 6 | High | Part of 8 | Done | 988543b | Embedded consultant selector/protection, metrics, Needs a human queue, conversation and collapsible History. |
| H03a decision 9 | High | Part of 8 | Done | 3285159 | /admin redirects to /?tab=consultant; admin API/proxy protection retained. |
| H03b decision 4 | High | Part of 5 | Done | 66425dc | Reordered Agent sections, compact agents, sentence empty states, read-only approval link to Consultant. |
| H03b decision 5 | High | Part of 5 | Done | 5411322 | Pure latest-turn selector and timed status rows for cleanup, guardrails, routing, tools, approvals and reply/errors. |
| H03b decision 7 | High | Part of 5 | Done | 0bc9e02 | Static pipeline, code paths, Try it actions and security documentation. |
| H03b decision 8 | High | Part of 5 | Done | 18905c1 | Six scenario categories, Radix menu, hidden eval seeds, running chip and reset within menu. |
| Integration and visual corrections | Medium | Included | Done | 0e3a6fd | Mobile header/control geometry, AA status colors, hash updates, resolved approval/tool state and type/lint fixes. |
| Browser coverage | High | Included | Done | caee0fd | No-model layout flow and model-suite selector updates. |
| Usage documentation/focus synchronization | Low | Included | Done | f796069 | Updated README/app guide; wait for Radix focus restoration rather than racing its closing frame. |

H03 total: 13 points (8 + 5); the two preceding Low fixes add 2 points.
The final evidence commit adds this report, screenshots, final keyboard checks and documentation cleanup.
No .tours files were changed. No remote was configured, and no push was attempted.

## Final acceptance evidence

| Check | Exit | Done / not done | Observed result |
|---|---|---|---|
| Invisible-format regression | 0 | Done | 20 codepoints tested through input masking, sanitized preview and output leak detection. |
| Thread-creation error regression | 0 | Done | Two cases: readable HTTP 429 server message and non-JSON HTTP fallback. |
| Badge tests | 0 | Done | Counts approvals/open tickets, ignores closed tickets, tracks unseen increases, clears on opening. |
| Turn-trace tests | 0 | Done | Empty/happy/error/takeover, same-turn approval resume and generic SDK tool output failures. |
| Scenario/category and ratings tests | 0 | Done | All six categories, invalid/missing category rejection, seed hiding and compatible exported scenarios. |
| Admin-response tests | 0 | Done | Plain-text 401 challenge, specific JSON refusal and success parsing. |
| Final just check | 0 | Done | Typecheck, lint, 35 Vitest files and 327 tests passed. |
| Final just build | 0 | Done | Next.js 16.4.5 compiled and checked types; eight static pages generated. |
| restart the server | 0 | Done | Final restart returned running; subsequent status confirmed ready=true and live=true from agent-demo/app. |
| Playwright no-model layout | 0 | Done | 36 PASS, zero FAIL; production host through the requested PAC. |
| just eval | Not run | Not done / NOT_CHECKED | Explicitly excluded; no model credits. |
| Independent visual/source review | Not run | Not done / NOT_CHECKED | Follow-up reviewer owns this stage; implementation-side screenshot inspection is not independent acceptance. |

Final build artifacts observed:

- agent-demo/app/.next/BUILD_ID (21 bytes, 2026-11-09 20:52:54 local time).
- agent-demo/app/.next/server/app/page.js (870 bytes, 20:52:50).
- Compiled page/API artifacts under agent-demo/app/.next/server/app/.

The existing your process manager service loads that production .next output on port 4336.
Browser checks used **http://127.0.0.1:3100/**, not a raw-port substitute.
Only documentation, browser checks and screenshots changed after the final product build;
README's rendered Security section did not change, so another build was unnecessary.

## Browser evidence

Command (exit 0):

```powershell
$env:PROXY_PAC='<your proxy PAC, if any>'
node scripts/smoke-v1.mjs http://127.0.0.1:3100/ --layout
```

All 36 final checks passed:

- Page/default Agent render; ArrowRight, ArrowLeft, Home and End activate the expected tab.
- URL state and browser Back restore the selected view.
- Eight explainer layers, Try it actions and the README security link/document render.
- All six scenario groups render; seeded scenarios stay hidden; reset is inside the menu.
- Escape returns focus; Enter opens the menu; ArrowDown focuses a menu item.
- A real human-request scenario shows its chip, raises the badge amber and keeps Agent selected.
- The current trace explains that the model was skipped; opening Consultant clears attention.
- A real queued ticket opens its transcript below the queue.
- All three views fit 390px without horizontal overflow; chat is first in the stacked layout.
- Composer field/button heights and top edges align.
- /admin returns HTTP 307 and opens the Consultant tab.
- A **synthetic plain-text 401 interception** renders the actual password notice and Retry control;
  removing the interception and retrying restores real console data. The host's password was not changed.
- No inspector error cards and no unexpected browser console/page errors.

The human-request case is handled by deterministic escalation rules in turn.ts before any model call.
The smoke did not run model-answer scenarios or change provider/billing settings.
Local raw output: agent-demo/research/H03-layout.log (gitignored); the earlier failed run is
agent-demo/research/H03-layout-round2.log. The report contains the acceptance results independently of those local logs.

## Screenshots and implementation-side visual inspection

Desktop captures use a 1440×900 viewport. Mobile captures use 390×844:

| Evidence | Done / not done | File |
|---|---|---|
| Agent, desktop | Done | [h03-agent-1440.png](../../docs/screenshots/h03-agent-1440.png) |
| Consultant queue, desktop | Done | [h03-consultant-1440.png](../../docs/screenshots/h03-consultant-1440.png) |
| Selected conversation in the containing panel | Done | [h03-consultant-conversation-1440.png](../../docs/screenshots/h03-consultant-conversation-1440.png) |
| How it works, desktop | Done | [h03-how-1440.png](../../docs/screenshots/h03-how-1440.png) |
| Stacked viewport, exactly 390×844 | Done | [h03-stacked-390.png](../../docs/screenshots/h03-stacked-390.png) |
| Agent, mobile full page | Done | [h03-agent-390.png](../../docs/screenshots/h03-agent-390.png) |
| Consultant, mobile full page | Done | [h03-consultant-390.png](../../docs/screenshots/h03-consultant-390.png) |
| How it works, mobile full page | Done | [h03-how-390.png](../../docs/screenshots/h03-how-390.png) |
| Grouped scenario menu | Done | [h03-scenario-menu-1440.png](../../docs/screenshots/h03-scenario-menu-1440.png) |
| Synthetic password notice | Done | [h03-password-notice-390.png](../../docs/screenshots/h03-password-notice-390.png) |

Implementation-side inspection covered the actual host, adjacent chat, queue, selected conversation,
mobile stacking and explainer. It found an orphaned mobile reset button and inherited low-contrast
status pills; both were corrected before the final build/captures. Independent review still follows.

## Earlier failures and their disposition

- The first login-shell reads emitted user .gitconfig lock permission errors. Non-login commands
  were used afterwards; repository reads and commits succeeded.
- The single-writer lease hook refused expired/no-lease writes before execution. Its exact supplied
  acquire command was run separately before permitted retries. A computed Set-Content destination
  was refused as unresolved shell expansion; the explicitly requested literal destination succeeded.
- Git index writes were denied by the filesystem sandbox; approved outside-sandbox commits succeeded.
- Initial Vite startup failed with spawn EPERM (exit 1) inside the sandbox. Approved execution
  outside it passed; this was not a test assertion failure.
- Dependency installation first failed with ERR_PNPM_UNEXPECTED_STORE. The existing store's base
  directory was selected explicitly (not its already-versioned v11 subdirectory), then both accepted
  Radix dependencies installed successfully. No global pnpm configuration was changed.
- Typecheck exited 2 for findLastIndex under the existing library target. Replaced with map/lastIndexOf.
- An intermediate just check exited 1 for a Next internal-link lint error; Link fixed it. An unused
  category destructuring warning was also removed. Final check passed all 327 tests.
- The initial default-sandbox server restart produced no diagnostic and was interrupted (exit 1).
  Its cause is unknown. Explicit approved outside-sandbox restarts each returned exit 0; final service
  status and the public-route browser checks establish the running result. No daemon was replaced.
- First layout attempt exited 1: an exact Consultant locator omitted the accessible badge count.
  Corrected the locator to match the tab name including its count; subsequent checks passed.
- An expanded layout run exited 1 on immediate focus return after Escape. Radix restores focus
  after the closing frame; a bounded wait now checks the actual focus restoration. The final run
  also exercised keyboard menu entry and both tab arrows, and exited 0 with 36 PASS.

## NOT_CHECKED and next action

- Real-model happy paths: specialist selection, input/output guardrail verdicts, KB search,
  tool calls, approval pause/resume/refund result, guest verification, claims and address collection.
- Real password-challenge/browser credential entry: the 401 UI was verified with interception,
  not by setting or disclosing ADMIN_PASSWORD.
- Model-derived pending-approval rendering in the live browser (selector states are unit-tested).
- Independent source and screenshot review, explicitly scheduled after this implementer handoff.

Next: the independent reviewer should inspect the committed source and these actual-host screenshots.
Model-dependent browser acceptance remains NOT_CHECKED until credits are restored; do not run evals
under this task's current restriction. No publication or push is authorized here.
