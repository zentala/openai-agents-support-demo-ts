# H04 — fixes from the independent visual and code review of H03

## TLDR

Two independent reviews of H03: visual review **FAIL** (the escalation moment —
the most important part of an interview demo — reads wrong) and code review
**FAIL** (one Medium eval regression). Fix in two parts, commit per item,
then new screenshots for a repeat visual review. Points: H04a {ok. 12p},
H04b {ok. 13p}. Importance: High. Effort: medium (H04a item 4: high care).

## H04a — must fix (do first)

| # | Imp. | Pts | Source | Fix |
|---|---|---|---|---|
| 1 | High | 3 | visual | Turn trace: when the escalation rule fired and a ticket exists, show an **amber** row "Waiting for a human · Ticket T-xxxx" (it may replace the grey "skipped" row; keep "model skipped" as secondary text). Never label the human hand-off "skipped". Test the selector. |
| 2 | High | 2 | visual | "Handled by" contradiction: decide from the actual runtime behaviour. With an open ticket and no takeover the agent still answers, so say so plainly: "Ticket T-xxxx open — the agent keeps answering until a consultant takes over". Same wording in the consultant conversation badge. After takeover: "Handled by <consultant>". |
| 3 | Medium | 3 | visual | Scenario menu: max ≈ 60% of the viewport height with internal scroll and a bottom shadow; it must not cover the chat header/customer selector (open downward or align so the header stays visible); all 6 groups reachable; group header 13px, darker, with a divider and spacing above; remove numeric prefixes from items and from the "Scenario:" chip. |
| 4 | Medium | 2 | code | `app/lib/eval/checks.ts:70-72` + `app/lib/runtime/turn.ts:53-57`: `normalization` is now emitted every turn, so `expect.normalized: true` always passes (`iphone-signature`, `card-number`, `iban-typed-in-chat` prove nothing). Compare against the event's `stripped.length > 0` (or equivalent). Unit test that a turn with nothing stripped fails `normalized: true`. Revert check required. Remove the bare `{ }` left at `turn.ts:53`. |
| 5 | Medium | 2 | visual | Consultant tab hierarchy: queue first and dominant — header with count ("3 need a human"), metrics below the queue or smaller; empty "Pending approvals" collapses to one line "Pending approvals: none". |

## H04b — should fix

| # | Imp. | Pts | Source | Fix |
|---|---|---|---|---|
| 6 | Medium | 2 | visual | Selected ticket: border + `aria-current`, ticket number in the conversation header, `scrollIntoView` to the conversation pane on open. Show resolved tickets in History (they vanished: `consultant-panel.tsx:60` filters `open`), and restore a real assertion in `scripts/smoke-console-flows.mjs:102` (resolved, not "detached"). |
| 7 | Medium | 2 | visual | How it works: centred connectors (line + arrowhead) between layer cards; a small tag on each card "AI model" or "Code"; one intro paragraph defining guardrail, jailbreak, triage, handoff, prompt in plain words. |
| 8 | Medium | 2 | visual | Legibility on video calls: nothing below 12px; code paths, agent descriptions and Conversation Context values at ≥13px and a darker grey (zinc-700). Measure in the DOM in the smoke test (font-size ≥ 12px for all visible text). |
| 9 | Medium | 2 | visual | Runner Output on narrow screens: wrap (`break-words`) or expandable rows instead of ellipsis below 1024px. |
| 10 | Medium | 1 | visual | Active tab: 3px underline, bold label, inactive tabs lighter (blue-100 text); keep the focus ring separate from the active style. |
| 11 | Medium | 1 | visual | Header at < 640px: "Nordic Home" must not wrap under the tabs (hide it or move it); tabs may scroll horizontally; spacing between "How it works" and "Open trace"; separator between "Open trace" and "Nordic Home" at all widths. |
| 12 | Low | 3 | both | Lows: agents as a compact strip (name chips; description on expand); stacked layout limits chat height (~60vh) so the panel is hinted; empty state "Open a ticket…" as a plain sentence like other empty states; History chevron like other sections; one content padding for all tabs; Retry ≥ 40px; badge not amber on first load when the queue already existed (amber only on increase after load); rejected turns (InvalidSelection/EmptyMessage) not counted as conversations in `metrics.ts`; `approvals.tsx` real `<button>` (or Link without role=button); DESIGN.md rows for `globals.css` hover/cursor rules and `/readme`; replace the literal `true` assertion at `scripts/smoke-layout.mjs:113` and strengthen the Retry check (108–109). |

## Constraints

Same as H03 (`.plan/handoffs/H03-single-page-tabs.md` → Constraints): DESIGN.md row
per new visual choice, existing tokens only, audience rule, lease hook,
`corepack pnpm`, `CI=true`, commit per item, no AI attribution, no `.tours/`
edits, no push, no `just eval` (no OpenAI credits).

## Acceptance

- `just check`, `just build`, `restart the server`, layout smoke through
  `PROXY_PAC=<your proxy PAC, if any>` against http://127.0.0.1:3100/ — all pass.
- New screenshots in `docs/screenshots/h04-*.png` at 1440×900 and 390×844, including:
  Agent tab right after an escalation (amber row visible), scenario menu open and
  scrolled to the bottom group, Consultant tab with a selected ticket and its
  conversation in view, How it works top section, a 768px-wide view.
- Report to `.plan/handoffs/H04-h03-review-fixes-report.md` (commits, results,
  revert check for item 4, NOT_CHECKED list).
