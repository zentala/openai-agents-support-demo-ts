# H14 — scenario gallery landing page (GitHub Pages) and a captioned README screencast

## TLDR

Execution evidence: [repository-local report](H14-scenario-gallery-site-report.md).

Recruiters and potential clients will not paste an API key or read the README. A static landing page
explains the demo and lets them click through recorded scenarios step by step, then shows how to try
it live and how to hire the author. Approved mockup:
[.plan/mockups/2026-11-15-gallery-landing.png](../mockups/2026-11-15-gallery-landing.png) (HTML next
to it, mobile `-390.png`). Depends on H13 (icon registry). Points: {ok. 21p} → split below into
three tasks. Importance: High. Owner approved the one-time model cost of recording AI scenarios.

## Approved design decisions (owner, 2026-11-15)

- Layout as in the mockup: top bar (How it works, GitHub, Book a call, Try it live — all with icons),
  hero, scenario explorer (grouped, numbered list with `rule` / `AI` badges and a legend; player;
  step list with icons; "Why it matters"), "Try it live" in three steps with buttons, tech chips,
  agency CTA (Book a call → https://cal.com/zentala, Contact → https://zentala.agency/contact),
  footer "Built by Zentala Innovation Agency · Unofficial, not affiliated with OpenAI".
- Never claim "no API key needed" for a scenario; badges say `rule` (code decides) or `AI`.
- **Frames show the whole app screen with the relevant area emphasised** (owner rejected tight
  crops and blind zoom): dim everything except the step's focus rectangle, draw a highlight ring
  around it, and animate a gentle zoom toward it; a toggle shows the plain full frame. The focus
  rectangle comes from the real element's bounding box captured by Playwright, never hand-typed.
- Player: icon controls (previous, play/pause/replay, next), clickable step track, speed 0.5×/1×/1.5×/2×,
  stops on the last step and offers Replay, never loops. **Bug in the mockup to avoid:** the play
  button sometimes renders empty after Next — render all three icons and toggle visibility; test that
  the button always contains exactly one visible icon.
- Customers in recordings write English (use the English-speaking demo customer).
- Icons only through the H13 registry (exported sprite), one meaning per icon.

## Tasks

| # | Pts | Task |
|---|---|---|
| G1 | 8 | `scripts/record-gallery.mjs` + `just gallery <base-url>`: for a curated list of ~14 scenarios (2–3 per category, mostly from `app/data/scenarios.json`, incl. multi-step stories with follow-ups and a consultant takeover), drive the running app with Playwright at 1440×900, capture one PNG→WebP frame per step, the focus element's bounding box, and write `site/data/scenarios.json` (id, category, title, lead, badges, steps: caption, icon key, frame, focus rect, hold ms). Titles/leads/captions come from scenario metadata (add fields to scenarios.json where missing). Rule scenarios cost nothing; AI scenarios use the broker-injected key (`PASSWORD_BROKER_SCRIPT` + `scripts/with-key.mjs`), each recorded once; re-record only changed ones. |
| G2 | 8 | `site/` static page (plain HTML/CSS/JS, no framework) implementing the mockup with real data, spotlight frames, keyboard support (←/→/space), deep links `#scenario-id`, responsive (player above the list on mobile), focus-visible states, ≥24px targets. GitHub Actions workflow deploying `site/` to GitHub Pages from `main`. Link the page from README top and from the app header ("Watch scenarios"). |
| G3 | 5 | README hero GIF regenerated from the gallery frames of "Talk to a person" with captions burned in ("Customer asks for a person → a rule opens a ticket → consultant takes over → reply") and a 4 s hold on the last frame; keep ≤ 3 MB; `just screencast` uses this path. Replace the old GIF. |

## Constraints and acceptance

DESIGN.md decision rows for the gallery look; commit per task; lease released after each commit;
no push (the coordinator publishes). `just check` (add a no-network test that `site/data` matches
scenarios and every icon key exists in the registry), `just build`. Browser check of `site/` at
1440 and 390: every scenario plays to the end, stops, Replay works, play button never empty,
spotlight sits on the right element. Independent image review follows. Report:
`.plan/handoffs/H14-scenario-gallery-site-report.md`.
