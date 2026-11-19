# H05 delivery report — polish after H04 reviews

Date: 2026-11-09. Repository: agent-demo, branch main. No push performed.

All 11 items are implemented in separate commits. Final checks, production build/restart and browser acceptance pass.
The final source passed 341 tests and 120 no-model browser checks; all 28 screenshots were refreshed from that build.
Model-dependent checks remain NOT_CHECKED because the account has no OpenAI credits.

## Items and commits

The full H05 handoff was read before editing. All items have Importance Low and 1 point each (11 points total).
Visual choices were recorded in DESIGN.md before implementation.

| Item | Done / not done | Commit | Result |
|---|---|---|---|
| 1: selected ticket | Done | 9d1c744 | Pure selector prefers the open ticket, else the newest timestamp/id, independent of list order; does not mutate input. Unit tests and a repeated-escalation browser flow cover it. |
| 2: first menu divider | Done | bfed094 | No divider or extra top margin above Basics; later groups retain separators. |
| 3: queue grammar | Done | 2ce40b3 | 1 needs a human; zero and plural counts use need. Three unit cases. |
| 4: scroll hints | Done | 0140086 | Fixed edge gradients around a separate scrolling menu; top appears after scrolling, bottom indicates more content below; overlays do not intercept pointers. |
| 5: waiting suffix | Done | e24c9f6 | The amber ticket label omits the redundant waiting suffix. |
| 6: History hierarchy | Done | a79eb88 | History shares the standard icon/title/chevron component and 16px header treatment; nested headers are 14px h3 elements. Native details retained. |
| 7: queue framing | Done | d2f93ca | Removed the redundant outer card/border and trailing section margin. Individual actionable cards retain their borders. |
| 8: layer tags | Done | c75e23b | AI model is blue-100/blue-900; Code is gray-100/gray-800. |
| 9: handler badge | Done | acab2c9 | Amber AI agent · ticket open while awaiting takeover. |
| 10: inactive chip hover | Done | 20360dc | Neutral gray hover; the real active-agent value alone controls the active ring/label. |
| 11: protection notice | Done | ed8f73c | Neutral gray notice with a small amber warning icon; the warning text remains visible. |

Additional commits:

- 2518317: extend the existing layout smoke with polish measurements, required screenshots and a real repeated-escalation flow.
- e195734: ResizeObserver refreshes the scroll hints after Radix sets the available height; React ref cleanup disconnects it when the menu closes.
- 6b65789: use a subtle gray fade so the gradient remains visible over blank row spacing, following screenshot inspection.
- Final evidence commit: this report, journal and refreshed screenshots.

No .tours edits, eval, push, provider/billing changes or publication were performed.

## Verification

| Check | Exit | Done / not done | Evidence |
|---|---|---|---|
| Selected-ticket unit tests | 0 | Done | Three tests: open first despite list order/newer resolved ticket; newest resolved including equal-time ids; no match/unselected; original array order preserved. |
| Queue-label unit tests | 0 | Done | Counts 0, 1 and 2. |
| Final just check | 0 | Done | Typecheck, lint without warnings, 39 Vitest files / 341 tests. |
| Final just build | 0 | Done | Next.js 16.4.5 compiled, checked TypeScript and generated eight static pages. |
| Final restart the server | 0 | Done | Running; subsequent status confirmed ready=true/live=true from agent-demo/app. |
| Final layout smoke | 0 | Done | 120 PASS, zero FAIL; no unexpected console/page errors. |
| git diff --check | 0 | Done | No whitespace errors. |
| just eval | Not run | Not done / NOT_CHECKED | Explicitly excluded; no OpenAI credits. |

Owning build output: agent-demo/app/.next/BUILD_ID, agent-demo/app/.next/server/app/page.js,
and compiled pages/API routes in agent-demo/app/.next/server/app/.
The final BUILD_ID is 21 bytes (2026-11-09 21:52:39 local time); page.js is 870 bytes (21:52:34).
your process manager runs that production output from agent-demo/app. The required browser host is
http://127.0.0.1:3100/, through PROXY_PAC=<your proxy PAC, if any>.

## Browser evidence

Final command (exit 0):

```powershell
$env:PROXY_PAC='<your proxy PAC, if any>'
node scripts/smoke-v1.mjs http://127.0.0.1:3100/ --layout
```

The extended smoke retains the earlier 100 checks and adds 20 polish checks:

- A second explicit request for a human in the same conversation after hand-back opens a new ticket.
  The conversation header selects the new open ticket; after resolving it again the header keeps the
  newest resolved ticket. Both stages use real code paths without a model call.
- First group has no divider at 1440, 390 and 768px. At the top only the bottom scroll hint appears;
  at the middle both non-blocking gradient hints appear. All six groups remain scroll-reachable.
- Null active_agent plus pointer hover shows gray, with no falsely active chip. Moving the pointer
  away before captures avoids presenting hover as runtime state.
- Ticket trace label has no duplicate status suffix, and the handler badge is amber with explicit text.
- Singular/plural queue heading, no outer border/empty bottom band, neutral notice and warning icon.
- Two model tags and six code tags have different computed background colors; History is 16px with
  icon/chevron and both nested headings are smaller.
- Runner Output at 768px wraps without horizontal text overflow.

Existing coverage includes keyboard tabs/menu, URL history, authentication notice/Retry interception,
real takeover/hand-back/history, DOM typography, mobile geometry, badge attention and rejected-turn metrics.
The 401 notice is tested with interception, without modifying or disclosing ADMIN_PASSWORD.

Local raw logs are gitignored: agent-demo/research/H05-layout-round1.log and
agent-demo/research/H05-layout-final.log. The report records their results independently of local logs.

## Required screenshots

All paths are in agent-demo/docs/screenshots/. Exact dimensions are checked from the PNG headers.

| State | Done / not done | Screenshot |
|---|---|---|
| Agent after escalation, 1440×900 | Done | [Agent desktop](../../docs/screenshots/h05-agent-1440.png) |
| Agent after escalation, 390×844 | Done | [Agent phone](../../docs/screenshots/h05-agent-escalation-390.png) |
| Scenario menu at the middle, 1440×900 | Done | [Middle menu](../../docs/screenshots/h05-scenario-menu-middle-1440.png) |
| Consultant with selected ticket, 1440×900 | Done | [Selected conversation](../../docs/screenshots/h05-consultant-conversation-1440.png) |
| How it works, 1440×900 | Done | [Explainer](../../docs/screenshots/h05-how-1440.png) |
| Runner Output, 768×844 | Done | [Runner](../../docs/screenshots/h05-runner-768.png) |

The full smoke also produces supplemental h05 captures at 390/768px, menu top/bottom/middle,
resolved History, password notice and full-page mobile views. Earlier h03/h04 screenshots are preserved.
Implementation-side image inspection covered the affected real host states, adjacent chat and containing panels.
It found two scroll-hint issues, corrected before final delivery (below).

## Earlier failures and corrections

- Initial lease acquisition was refused because another session held the checkout (52 seconds remaining).
  Components were inspected without writing; normal acquisition succeeded after expiry. No forced takeover
  or alternate writer route was used. Later expired leases were renewed before permitted writes.
- The first browser run exited 1 with 117 PASS / 3 FAIL: at all three widths the bottom hint was missing
  immediately after opening. The mount measurement preceded Radix's final available-height calculation.
  ResizeObserver now remeasures that size, and cleanup removes the observer on close. The next full run
  passed 120/120. The final gray-gradient refresh is recorded in the verification table.
- White fades were hard to see between rows in the screenshots. The final gray-200/90 fade preserves
  the same edge behavior and makes the hint visible even over blank spacing. DESIGN.md records the choice.

## NOT_CHECKED

- just eval and model-dependent agent answers, input/output verdicts, tools/KB, approval resume,
  guest verification, claims and address-collection flows.
- Live positive active-agent transitions requiring a model answer. The unchanged active-state condition
  was inspected in source; the null/hover case was checked in the actual browser.
- Real password entry, as opposed to the intercepted refusal/Retry renderer.
- A new independent H05 review. This implementation-side inspection is not an independent verdict.

Next: review the committed report and the six required actual-host captures. Keep model-dependent
acceptance NOT_CHECKED under the task's no-credit/no-eval restriction.
