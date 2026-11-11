# H07 — implement the design review (A fixes + owner-approved B decisions)

## TLDR

The design lead (Claude Fable) rewrote `DESIGN.md` and reviewed the app:
`.plan/reports/2026-11-10-design-ux-review.md` lists 21 obvious fixes (A1–A21) and
11 questions (B1–B11). The owner accepted **all B recommendations**. Implement
them in three parts, plus the guardrail model switch and README link fixes.
Points: H07a {ok. 16p}, H07b {ok. 15p}, H07c {ok. 17p}. Importance: High (the
owner said the current look drifted into "our own skin"; the goal is to evolve the
original OpenAI demo look). Effort: medium.

## Read first

`DESIGN.md` (the contract — every visual change follows it; add a decision row for
anything it does not cover), the review report (exact evidence and fix per item),
`AGENTS.md`, `docs/BUILD-v1.md` (audience rule), `.plan/ADR/002-*.md` and
`.plan/ADR/008-*.md`.

## H07a {16p} — foundations and the header

- **Model (1p):** `app/lib/config.ts` default `GUARDRAIL_MODEL` → `gpt-6-luna`, update the
  comment (ADR-002: agents stay on gpt-4.1; luna passed 38/38 as guardrail model).
  Close `.plan/backlog/switch-guardrail-model-to-luna.md` and update STATE/ARCH.
- **A1 + A4 + A5** tabs: one weight, white text + 3px underline for active,
  `text-blue-50` inactive, hover `bg-white/10` (combine with B1 below).
- **B1 (3p):** restore the panel header with icon + "Agent View" title + brand; tabs on a
  white bar below it (blue-600 underline, zinc text). Both panel headers match.
- **B2 (1p):** pin Tailwind blue-500/600/700 to the original v3 values (`#2563eb` etc.)
  in `@theme`.
- **A3** load Inter with `next/font`. **A2** white focus outline on blue surfaces.
- **A7 + A8** the four button recipes, 40px (32px in chat widgets), `rounded-md`;
  "Open conversation" becomes a 40px secondary button; inline links ≥24px tall.
- **A6** Approve `bg-emerald-700`.
- **README (1p):** fix `docs/JOURNAL.md` → `.plan/JOURNAL.md` and add links to
  `AGENTS.md`, `.plan/ARCH.md`, `.plan/ADR/`, `.plan/BACKLOG.md`.

## H07b {15p} — agent tab and chat

- **B3 (3p):** turn trace as white rows in one card with pale status badges; only waiting
  and failed rows keep a tinted box.
- **B4 (2p):** chat like the original: customer in a `gray-100` bubble on the right,
  agent as plain text on white, consultant keeps the emerald bubble, 16px text.
- **B5 (2p):** empty chat start screen: centred greeting + three starter buttons from
  existing scenarios (one rule-based, so the first click costs nothing).
- **B6 (2p):** Scenarios trigger inside the composer row (icon button at 390px);
  running-scenario label as a system line at the top of the conversation.
- **A9, A10, A11, A14, A15, A16, A18, A20.**

## H07c {17p} — consultant, explainer, cleanup

- **B7:** keep agent chips (with A11 badge). **B8 (1p):** consultant order queue →
  conversation → metrics → history. **B9 (1p):** consultant transcript: customer left,
  staff (agent grey, consultant emerald) right. **B10 (2p):** Try-it buttons inside each
  layer card in How it works; remove the duplicate list. **B11 (1p):** one neutral notice
  style; amber only for something the user must act on now.
- **A12, A13, A17, A19, A21** (A21: link DESIGN.md from `AGENTS.md`).
- `DESIGN.md` is 301 lines (limit 250): move the decision log to `.plan/design-decisions.md`
  and link it.

## Constraints

Same as earlier handoffs: lease hook (run the printed `lease acquire …` when blocked),
`corepack pnpm`, `CI=true`, commit per item (group items touching one file), no AI
attribution, no push. `.tours/` is guarded by `scripts/check-tour.mjs` in `just check`:
if you move code, update the tour anchors so `just check` passes. Do not run
`just eval` except once at the end of H07a (guardrail model switch) — it costs money;
report the table.

## Acceptance (per part, report exit codes)

`just check`, `just build`, `restart the server`, layout smoke via
`PROXY_PAC=<your proxy PAC, if any>` against http://127.0.0.1:3100/;
H07a also `just eval` (expect 38/38 with gpt-6-luna guardrails). After H07c: new
screenshots `docs/screenshots/h07-*.png` at 1440, 768 and 390 (Agent tab with an
escalation, chat start screen, Consultant with a selected ticket, How it works,
scenario menu open). Report to `.plan/handoffs/H07-design-review-implementation-report.md`.
An independent visual review follows.
