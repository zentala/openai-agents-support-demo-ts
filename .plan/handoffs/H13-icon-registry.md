# H13 — icon registry: one meaning per icon, icons by key

## TLDR

Icons are imported straight from `lucide-react` in about 30 components, so nothing stops one icon
from meaning two things or one meaning from getting two icons. The owner wants a rich, consistent
icon language in the app and in the upcoming scenario gallery (H14), loaded by semantic key from one
registry. Points: {ok. 8p}. Importance: High (H14 records the app, so this lands first). Effort: high.

## Tasks

| # | Pts | Task |
|---|---|---|
| I1 | 3 | `app/lib/ui/icons.ts`: one registry `ICONS: Record<IconKey, LucideIcon>` with semantic keys (`agent`, `consultant`, `howItWorks`, `takeOver`, `handBack`, `send`, `ticket`, `automaticStep`, `aiAssistant`, `human`, `guardrail`, `approval`, `refund`, `tool`, `handoff`, `knowledge`, `error`, `address`, `guest`, `dataCollection`, `language`, `scenario`, `play`, `pause`, `replay`, …). `<Icon name="ticket" />` component (size, label, `aria-hidden` by default). Start from the existing map in DESIGN.md and current usages. |
| I2 | 3 | Replace every direct `lucide-react` import in `app/components/**` with `<Icon name=…>`. Add a check to `just check` that fails when a file outside the registry imports `lucide-react`, and a unit test that no lucide component is registered under two keys (one icon = one meaning). |
| I3 | 2 | Icon coverage pass, owner asked for "icons everywhere they help scanning": tabs, every button with an action (incl. Reset, Clear, Close, Scenarios, Confirm/Cancel cards), section headers, badges (ticket, automatic step, status), scenario categories and the scenario menu items. Update the DESIGN.md icon map table from the registry (or generate it) and add a decision row. Export the registry as an SVG sprite + JSON (`scripts/export-icons.mjs`, `just icons`) so H14's static site uses the same icons. |

## Constraints and acceptance

DESIGN.md first; commit per item; lease released after each commit; no push; no eval (no prompt
change). `just check`, `just build`, restart the local service, layout smoke; screenshots
`docs/screenshots/h13-*.png` at 1440 and 390 (start screen, consultant console, a conversation with
an automatic step and an AI answer). Report: [implementation checkpoint](H13-icon-registry-report.md).
