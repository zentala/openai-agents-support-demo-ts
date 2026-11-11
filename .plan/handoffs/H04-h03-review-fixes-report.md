# H04 delivery report — H03 independent-review fixes

Date: 2026-11-09. Repository: agent-demo, branch main. No push performed.

All 12 implementation items are complete, in the requested order, with one commit per item.
Final offline checks/build and the no-model layout smoke pass. The item 4 revert check detects the regression.
Fresh actual-host screenshots are committed for repeat independent review; model-dependent behavior is NOT_CHECKED.

## Scope, order and commits

The complete H04 handoff and its embedded visual/code findings were read before editing.
DESIGN.md was updated before each new visual choice. H04a was completed before H04b.

| Item | Importance | Points | Done / not done | Commit | Result |
|---|---|---|---|---|---|
| H04a 1: escalation trace | High | 3 | Done | 237828c | Amber Waiting for a human row names the ticket; model skipped remains secondary text. Human routing is not labeled skipped support. Selector regression added. |
| H04a 2: handler wording | High | 2 | Done | 857b422 | Shared description in Agent and Consultant: an open ticket leaves the agent answering until takeover; takeover names the consultant. Hand-back stops describing the preceding ticket as open. |
| H04a 3: scenario menu | Medium | 3 | Done | ee7686f | Maximum 60svh/available height, internal scrolling, bottom shadow and collision padding below the customer header. Dark 13px divided group labels; numeric fixture prefixes removed from all UI scenario labels and the chip. |
| H04a 4: normalization eval | Medium | 2 | Done | b8f7076 | normalized=true requires a normalization event with nonempty stripped notes. Bare block removed from turn.ts. Regression test and required revert check passed. |
| H04a 5: consultant priority | Medium | 2 | Done | 8db2494 | Counted human queue precedes metrics. Empty approvals use a single sentence. |
| H04b 6: ticket selection/history | Medium | 2 | Done | 9c63ea5 | Selected border/ring plus aria-current; ticket number in transcript header; automatic scrolling after the chosen transcript arrives; resolved tickets retained in History and real resolved assertion restored. |
| H04b 7: explainer | Medium | 2 | Done | 599f4cc | Centered line/arrow connectors, AI model/Code tags and one paragraph defining prompt, jailbreak, guardrail, triage and handoff. |
| H04b 8: legibility | Medium | 2 | Done | 5470fbe | Minimum 12px text; code paths, agent descriptions and context values use 13px zinc-700. Browser measures actual rendered text. |
| H04b 9: narrow runner | Medium | 2 | Done | 2a0e48d | Summaries wrap below 1024px; expanded JSON remains available. |
| H04b 10: active tab | Medium | 1 | Done | 546e6ae | 3px white underline, bold active label, lighter inactive labels and independent focus outline. |
| H04b 11: header | Medium | 1 | Done | 714a261 | One mobile row, scrollable tabs, trace spacing/separator and hidden brand below 640px; brand has its own separator when visible. |
| H04b 12: Low findings | Low | 3 | Done | 7191cf1 | Expandable agent chips, 60svh stacked chat, plain empty state, History chevron, shared 16px padding, quiet initial badge, rejected-turn metrics, natural navigation link, stronger Retry/recovery checks and missing design rows. |

H04a: 12 points. H04b: 13 points. Total: 25 points.

Additional corrective/evidence commits:

- e73b4b6: fix the effect dependency warning while keeping polling from stealing conversation scroll.
- 6219222: browser coverage for the review findings, including real deterministic takeover/resolution and rejected-turn metrics.
- 06e91d5: browser measurements found the shared Card's gray border overriding selection; selected border now explicitly overrides the default.
- 8bf9640: bounded browser helper functions and explicit screenshot dimensions.
- The final evidence commit adds this report, the journal, 24 screenshots and the explicit 768px History capture setting.

No .tours files changed. No eval, provider/billing changes or push was attempted.

## Final checks and build

| Check | Exit | Done / not done | Evidence |
|---|---|---|---|
| Escalation selector tests | 0 | Done | 7 tests, including waiting ticket label/status and secondary model-skipped detail. |
| Shared handler tests | 0 | Done | Agent/open-ticket/takeover wording and hand-back ticket state. |
| Combined targeted suites | 0 | Done | 19 tests across badge, metrics, handler wording, normalization expectations and scenario labels/categories. |
| Final just check | 0 | Done | Typecheck, lint with no warnings, 37 Vitest files / 335 tests. |
| Final just build | 0 | Done | Next.js 16.4.5 compiled, checked TypeScript and generated eight static pages. |
| Final restart the server | 0 | Done | Running; follow-up status confirmed ready=true/live=true, cwd agent-demo/app. |
| Final layout smoke | 0 | Done | 100 PASS, zero FAIL, no unexpected browser console/page errors. |
| git diff --check | 0 | Done | No whitespace errors. |
| just eval | Not run | Not done / NOT_CHECKED | Explicitly excluded: no OpenAI credits. |
| Repeat independent review | Not run here | Not done / NOT_CHECKED | These new screenshots and source are ready for the follow-up reviewer. Implementation-side inspection is not independent acceptance. |

Final production artifacts observed:

- agent-demo/app/.next/BUILD_ID — 21 bytes, 2026-11-09 21:24:24 local time.
- agent-demo/app/.next/server/app/page.js — 870 bytes, 21:24:18.
- Compiled pages and API routes under agent-demo/app/.next/server/app/.

your process manager loads that production .next output. The final browser checks used **http://127.0.0.1:3100/**
through the requested PAC, with the service ready/live after the final restart. Only browser scripts,
reporting and screenshots changed after the final product build, so another build was unnecessary.

## Item 4 revert check

Target: app/tests/normalized-expectation.test.ts, run with corepack pnpm --dir app test.
No model, network, whole-file Git reset or unrelated source reversion was used.

| Stage | Exit | Done / not done | Result |
|---|---|---|---|
| Fixed condition: normalization and stripped.length > 0 | 0 | Done | 2/2 tests pass. Empty cleanup fails normalized=true and passes normalized=false. Nonempty notes have the opposite result. |
| Reverted only the nonempty-notes predicate | 1, expected | Done | 1 test fails: an unchanged turn incorrectly satisfies normalized=true; expected normalization event mismatch, received no failures. |
| Restored the saved fixed source | 0 | Done | 2/2 tests pass again. The final full check also includes them. |

The fixed source was saved temporarily, only the predicate was reverted, then the exact fixed source
was restored before committing. The normalized schema comment now explains the semantic expectation.

## Browser coverage and measurements

Final command (exit 0):

```powershell
$env:PROXY_PAC='<your proxy PAC, if any>'
node scripts/smoke-v1.mjs http://127.0.0.1:3100/ --layout
```

The 100 checks include:

- Both tab arrows, Home/End, URL state/Back, pipeline content and README security navigation.
- Six scenario groups scroll-reachable at 1440, 768 and 390px; hidden eval seeds; menu keyboard entry,
  item focus and Escape return; reset reachable at the bottom; numeric prefixes absent.
- Menu geometry: 540px high in the 900px desktop viewport, with its top at 227px below the 56px customer
  header. At 390/768px, about 418.6px high in 844px and its top at 413px below the 104px customer header.
- Actual deterministic escalation, amber ticket row, matching handler description, scenario chip,
  attention only after an increase and no amber attention when reloading an already populated queue.
- Queue above metrics, counted heading, sentence-only empty approvals/conversation placeholder.
- Selected aria-current and computed border distinct from neutral cards, numbered conversation header,
  automatic conversation visibility, real takeover naming the consultant, and real hand-back retaining
  the resolved ticket in History. The model-dependent smoke also again asserts resolved rather than detached.
- DOM text measurements for every displayed tab, menu and expanded agent description: all visible text
  at least 12px, with code paths/descriptions/context values at least 13px.
- Three views without horizontal overflow at 390px; narrow Runner Output wraps; aligned composer heights;
  mobile header 48px high with 12px tab/trace spacing, 3px active underline and font-weight 700.
- Stacked chat stays about 60% of viewport height, revealing the workspace below.
- Plain-text **synthetic 401 interception** renders the real notice; Retry triggers a new refused request,
  remains at least 40px tall and preserves the notice. Removing interception and retrying returns actual
  200 state with the selected consultant and visible metrics, rather than a literal true assertion.
- Two real rejected turns (signature-only EmptyMessage and foreign-order InvalidSelection) leave the
  conversation count unchanged: before=2, after=2 in the final run. Neither reaches the model.

Local raw logs (gitignored): agent-demo/research/H04-layout-round1.log and
agent-demo/research/H04-layout-final.log. The earlier run retained 97 PASS / 3 FAIL for the selected
border at three widths/contexts. After the source correction, two full runs passed 100/100; the last
also explicitly captured History at 768px. The report contains the results independently of local logs.

## Screenshot evidence for repeat visual review

All files below are committed under agent-demo/docs/screenshots/. Desktop captures are 1440×900;
phone viewport captures are 390×844; intermediate captures are 768×844. Full-page files are supplemental.

| State | Done / not done | Desktop | Phone | Intermediate |
|---|---|---|---|---|
| Agent immediately after escalation | Done | [Agent](../../docs/screenshots/h04-agent-1440.png) | [Amber escalation](../../docs/screenshots/h04-agent-escalation-390.png) | [768px](../../docs/screenshots/h04-agent-escalation-768.png) |
| Scenario menu, top | Done | [Top](../../docs/screenshots/h04-scenario-menu-top-1440.png) | [Top](../../docs/screenshots/h04-scenario-menu-top-390.png) | [768px](../../docs/screenshots/h04-scenario-menu-top-768.png) |
| Scenario menu, bottom Guest group | Done | [Bottom](../../docs/screenshots/h04-scenario-menu-bottom-1440.png) | [Bottom](../../docs/screenshots/h04-scenario-menu-bottom-390.png) | [768px](../../docs/screenshots/h04-scenario-menu-bottom-768.png) |
| Selected ticket and conversation | Done | [Conversation](../../docs/screenshots/h04-consultant-conversation-1440.png) | [Selected](../../docs/screenshots/h04-consultant-selected-390.png) | [768px](../../docs/screenshots/h04-consultant-selected-768.png) |
| How it works, top | Done | [Explainer](../../docs/screenshots/h04-how-1440.png) | [Top](../../docs/screenshots/h04-how-top-390.png) | [768px](../../docs/screenshots/h04-how-top-768.png) |
| Stacked chat/panel | Done | — | [Stacked](../../docs/screenshots/h04-stacked-390.png) | [768px](../../docs/screenshots/h04-stacked-768.png) |
| Resolved ticket in History | Done | — | — | [History](../../docs/screenshots/h04-resolved-history-768.png) |

Supplemental captures: h04-consultant-1440.png, h04-scenario-menu-1440.png, full-page
h04-agent-390.png / h04-consultant-390.png / h04-how-390.png and h04-password-notice-390.png.
Implementation-side image inspection covered the actual two-column host, adjacent chat, amber escalation,
selected conversation on phone, menu bottom, centered pipeline and stacked/intermediate views.

## Earlier failures and disposition

- The first lease acquisitions were refused by the lease daemon because another session held this
  checkout (expiry was reported). No file was changed; after the stated expiry the normal acquisition
  succeeded. No forced takeover or alternate writer route was used. Later expired leases were renewed
  with the hook-supplied command before permitted writes.
- One patch failed verification against an incomplete JSX line; it made no changes and was corrected
  using the exact existing source line.
- The first full check exited 0 with one hook dependency warning. The effect now depends on the selected
  thread id, not each polled thread object; final lint has no warnings.
- A read-only function-length inspection failed with spawnSync git EPERM inside the sandbox (exit 1).
  Approved outside-sandbox inspection succeeded; changed TypeScript functions meet the 50-line audience limit.
  Browser helper functions were kept within that limit too. No new validation framework was introduced.
- First layout smoke exited 1 with three selected-border failures. The visible ring was blue, but the
  shared Card's gray border won the CSS cascade. An explicit selected-border override corrected the
  actual source; computed browser colors now differ, and the final smoke passes.

## NOT_CHECKED and next action

- just eval and all model-dependent answer/guardrail/tool/KB/approval-resume/guest/claim/address flows.
- Actual browser password entry: the refusal notice/retry was tested via interception without changing
  or disclosing ADMIN_PASSWORD. Authentication and CSRF code were not changed.
- A renewed independent visual/code verdict. This implementer has inspected screenshots and fixed
  observed failures, but has not certified its own work as an independent review.

Next: repeat the independent review against the committed source and these new actual-host screenshots.
Keep model-dependent acceptance NOT_CHECKED under the current no-eval/no-credit restriction.
