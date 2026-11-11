# H05 — polish after H04 reviews

## TLDR

H04 passed the independent visual review and the code review found no failing
criterion. This handoff collects the remaining Low findings (one code defect and
ten visual details). Points: {ok. 11p}. Importance: Low. Effort: low.

## Tasks (commit per item; group tiny CSS items if they touch one file)

| # | Pts | Source | Fix |
|---|---|---|---|
| 1 | 1 | code | `app/components/admin/consultant-panel.tsx:75` picks the first (oldest) ticket of a thread. After hand-back and a new escalation, the header shows the resolved ticket. Pick the open ticket, else the newest. Unit test the selector. |
| 2 | 1 | visual | Scenario menu: no divider above the first group. |
| 3 | 1 | visual | "1 need a human" → "1 needs a human" (plural only for counts ≠ 1). Test. |
| 4 | 1 | visual | Scenario menu: visible scroll hint (bottom gradient, top gradient after scrolling). |
| 5 | 1 | visual | Amber trace row repeats "waiting" ("· Ticket T-2002 · waiting") and wraps badly on 390px: drop the status suffix on that row or keep it on the same line. |
| 6 | 1 | visual | "History" section header uses the same section-header style (icon, size, chevron) as the other panel sections; nested headers smaller than it. |
| 7 | 1 | visual | Queue card: remove the empty bottom band and the card-in-card double border. |
| 8 | 1 | visual | How it works: "AI model" tag in a different tint from "Code" (existing palette; add a DESIGN.md row). |
| 9 | 1 | visual | "Handled by" badge while a ticket is open: amber "AI agent · ticket open" instead of the dark-blue "AI agent". |
| 10 | 1 | visual | Agent chip with a bluish background while `active_agent` is null on 1440 (check it is only hover; active styling must follow the real active agent). |
| 11 | 1 | visual | "Unprotected demo console" banner competes with the amber queue: tone it down (neutral/grey with an amber icon) or move it under the queue. |

## Constraints and acceptance

Same constraints as `.plan/handoffs/H04-h03-review-fixes.md`. No `just eval` (no
OpenAI credits), no `.tours/` edits, no push. At the end: `just check`,
`just build`, `restart the server`, layout smoke via PROXY_PAC, and
screenshots `docs/screenshots/h05-*.png`: Agent tab after escalation (1440, 390),
scenario menu scrolled to the middle (1440), Consultant tab with a selected
ticket (1440), How it works (1440), Runner Output at 768. Report to
`.plan/handoffs/H05-polish-report.md`.
