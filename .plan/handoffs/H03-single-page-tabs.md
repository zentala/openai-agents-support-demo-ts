# H03 — one page with tabs (UX redesign, same OpenAI-inspired look)

## TLDR

Merge the separate consultant console (`/admin`) into the main page. Left panel
gets three tabs: **Agent** (today's Agent View), **Consultant** (today's /admin),
**How it works** (new explainer). Add a "turn trace" at the top of the Agent tab
and replace the 38-button scenario bar with a grouped scenario menu. Keep the
current visual language (blue panel headers, white cards on grey, compact type).
Points: {ok. 13p}, split into H03a (8p) and H03b (5p), commit per item.
Importance: High (the demo is shown live in job interviews). Effort: medium.

## Who uses it and why (design intent)

- **Interviewer** watching a shared screen for 5–10 minutes while the candidate
  talks. Must see, without reading code: message in → guardrails → which agent →
  which tools → human approval → answer. Text must be legible on a video call
  (body 14px, nothing below 12px, AA contrast).
- **Developer** reading the published repo: must understand the architecture from
  the "How it works" tab and find the code behind each layer.
- **Focal point** of the Agent tab is the current turn (what just happened), not the
  history. The Consultant tab's focal point is "what needs a human now".

## Decisions (record each as a row in DESIGN.md before implementing)

1. **Layout.** Keep two columns: left panel ≈ 3/5, chat ≈ 2/5 (as today). The left
   panel's blue header holds the tablist instead of the "Agent View" title; keep
   "Open trace" and the "Nordic Home" label on the right of that header; remove the
   "Consultant console" link. Below 1024px stack: chat first, panel below.
2. **Tabs.** Accessible tabs (role=tablist/tab/tabpanel, arrow keys, Home/End,
   visible focus ring). Use `@radix-ui/react-tabs` (new dependency, accepted) styled
   to the existing look. Active tab: white underline/indicator on the blue header.
   Tab state lives in the URL (`?tab=agent|consultant|how`), default `agent`.
3. **Consultant badge.** The Consultant tab shows a count badge = pending approvals +
   open tickets. When it increases while another tab is active, the badge turns amber
   (existing amber tokens) until the Consultant tab is opened. Never auto-switch tabs.
4. **Agent tab order:** turn trace (new) → errors (only when present, pinned high) →
   agents strip (compact) + handler status → guardrails → conversation context →
   claim slots (only when active) → knowledge-base hits → approvals (read-only, with a
   button "Open in Consultant tab") → runner output (full log, last). Sections with no
   data show a one-line empty state, not an empty card.
5. **Turn trace (signature element).** A vertical list for the LATEST turn only, built
   from existing events via a new pure selector: input cleanup (what was masked/stripped)
   → each input guardrail (pass/fail + one-line reason on fail) → escalation rule (if it
   fired, model skipped) → active agent and handoffs → each tool call with a short status
   (`REFUND_CREATED`, `ORDER_NOT_FOUND`, `TOOL_ERROR …`) → approval pending (amber) →
   output guardrail → reply sent / error. Green = passed, red = blocked/failed, amber =
   waiting for a human, grey = skipped. Each row: time (tabular-nums), label, detail.
   Steps appear as events arrive. Unit-test the selector (happy, empty, error, takeover).
6. **Consultant tab.** Reuse `components/admin/*` and `useAdminConsole`. Tab header row:
   consultant selector + protection status. Body (narrower than /admin, so stacked):
   metrics strip → one "Needs a human" queue (approvals first, then tickets, each with a
   type badge) → the selected conversation pane below the queue → audit log + ratings
   export in a collapsible "History" section at the bottom.
   If any `/api/admin/*` call returns 401, show an inline notice: "The consultant console
   is password-protected (ADMIN_PASSWORD). Your browser will ask for the password." with
   a Retry button. CSRF/auth behaviour stays as is.
7. **How it works tab.** Static, no model calls: (a) a pipeline diagram in HTML/CSS
   (boxes + arrows) of the layers in order — input cleanup, escalation rules, input
   guardrails, Triage + handoffs, tools with code-enforced rules, human approval,
   output guardrail, tracing — each box with one plain sentence and the repo path of
   its code; (b) "Try it" list mapping each concept to 1–2 scenario buttons that run
   the scenario; (c) short security model summary linking to README#security.
8. **Scenario menu.** Replace the button bar under the chat with one "Scenarios" button
   that opens a grouped menu (Radix popover or dropdown-menu, keyboard accessible).
   Add a `category` field to every scenario in `app/data/scenarios.json`: Basics,
   Security & guardrails, Refunds & approvals, Human handoff, Data collection, Guest
   mode. Eval-only (seeded) scenarios stay hidden from the menu. After a click, show the
   running scenario's label as a small chip above the composer. Keep "Reset demo data"
   inside the menu. Update the scenarios zod schema and its test.
9. **/admin.** Replace the page with a redirect to `/?tab=consultant` (keep the API
   routes and their protection unchanged).

## Split

- **H03a {8p}:** decisions 1, 2, 3, 6, 9 (+ DESIGN.md rows, smoke selector updates).
- **H03b {5p}:** decisions 4, 5, 7, 8.

## Constraints

- Read `DESIGN.md`, `docs/BUILD-v1.md` (audience rule: TSDoc headers, comments on
  library calls, `// SECURITY:` / `// INTERVIEW:`, files ≤ 250 lines, functions ≤ 50),
  the existing components and `app/app/globals.css` before coding. Reuse existing
  components and tokens; no new colors except existing Tailwind blue/gray/amber/green/red.
- Controls in one row have equal height. All interactive elements have hover, focus,
  disabled states; 40px minimum hit area for tab and menu triggers.
- Same repo rules as H01 (lease hook, `corepack pnpm`, `CI=true`, one commit per
  item, no AI attribution, do not edit `.tours/`, no push).
- The OpenAI account has no credits: do not run `just eval`. Browser checks that need
  a model answer are NOT_CHECKED; checks that do not (page renders, tabs switch, URL
  state, badge, redirect, menu opens and groups, How-it-works content, 401 notice) must
  pass.

## Acceptance (report exit codes and evidence)

- `just check` and `just build` pass; new unit tests for the turn-trace selector,
  badge counting and scenario categories.
- `restart the server`, then Playwright through
  `PROXY_PAC=<your proxy PAC, if any>` against http://127.0.0.1:3100/:
  update `scripts/smoke-v1.mjs` for the new tabs and add a no-model "layout" flow
  covering the checks listed above, plus keyboard navigation of the tabs.
- Screenshots of each tab at 1440×900 and the stacked layout at 390×844 saved to
  `docs/screenshots/h03-*.png` (an independent visual review follows).
- Report to `.plan/handoffs/H03-single-page-tabs-report.md`: commits, results,
  NOT_CHECKED list.
