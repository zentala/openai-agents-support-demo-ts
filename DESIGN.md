# DESIGN — Nordic Home support agent demo

## TLDR

The demo keeps the look of OpenAI's `openai-cs-agents-demo`: two white panels on a
light grey page, blue panel headers, white cards, Inter, lucide icons. We extend that
look for the things the TypeScript port adds (tabs, turn trace, consultant queue,
scenarios, chat widgets); we do not design a second skin. The owner accepted every B recommendation in the
[2026-11-10 review](.plan/reports/2026-11-10-design-ux-review.md).
**Target** rules describe the implementation contract.

## Authority and status

- This file is the only design source. Read it before any visual change; a look it
  does not cover is a decision: add a row to [decision log](.plan/design-decisions.md) first.
- Reference look: `examples/openai-cs-agents-demo/ui` and
  `research/smoke-python-demo.png`. Layout decision:
  [ADR 008](.plan/ADR/008-single-page-with-tabs.md).
- Stack: Next.js, Tailwind v4 palette with original v3 blue-500/600/700 pinned, Radix Tabs and
  Dropdown Menu, lucide-react. Shared primitives: `app/components/ui/card.tsx`,
  `ui/badge.tsx`, `panel-section.tsx`. Everything else is a product composition.
- Status words: **Inherited** (same as the OpenAI demo), **Added** (TS demo only,
  accepted), **Target** (accepted, pending code), **Proposed** (needs owner answer).

## Product and visual intent
The owner shares this screen in job interviews and will publish the repo. Viewers
watch a compressed video stream and read along while he talks. Order of attention:

1. the customer chat (what was asked and answered),
2. the current turn in the Agent tab (what the system did),
3. human work in the Consultant tab,
4. reference detail (context, knowledge hits, runner log, explainer).
The look is calm and neutral so that status colour (green, amber, red) is the only
thing that shouts. Blue marks chrome, selection and the primary action, never status.

## Inherited from the OpenAI demo, and what the TS demo adds

| Element | Inherited rule | TS demo addition |
| --- | --- | --- |
| Page | `bg-gray-100`, panels `gap-2 p-2`, left 3/5, right 2/5 | Stacks below 1024px, chat first |
| Panel | `bg-white rounded-xl shadow-sm` | — |
| Panel header | `bg-blue-600 text-white`, 48px, 20px icon, `text-lg font-semibold` title, small brand text on the right | Tabs, Open trace link, customer selector, reset button |
| Content area | `bg-gray-50/50`, scrolls inside the panel | Padding 16px (was 24px) to fit narrow panels |
| Section header | Icon chip `bg-blue-600/10 p-1.5 rounded-md` with 16px blue-600 icon, semibold zinc-900 title, chevron | Real `<button>` with `aria-expanded`; 16px title (was 18px); nested sections 14px |
| Card | `rounded-lg border border-gray-200 bg-white shadow-sm`, padding 12px | Selected card: `border-blue-500 ring-1 ring-blue-500` |
| Text | zinc-900 titles, zinc-500 light captions, Inter | Captions darkened and never light weight (video legibility) |
| Status badges | Solid emerald-500 / red-500 pills with white text | Pale pills with dark text (AA contrast); amber and grey states |
| Agents | 3-column cards with description, solid blue `Active` badge | Compact expandable chips |
| Runner Output | Grey well, white cards, grey pill label, mono summary | More event kinds; status tone on the summary |
| Customer chat | ChatKit widget: grey user bubble on the right, plain assistant text, start screen with prompts | Own bubbles, widgets, scenarios menu |
| New surfaces | — | Current turn trace, Consultant tab, How it works tab |

## Tokens
Tokens are Tailwind classes; there is no second palette. "Rendered" is the value the
browser computed on 2026-11-10 (`*` = Tailwind v4 default, not measured).
### Colour

| Role | Class | Rendered | Use |
| --- | --- | --- | --- |
| Page | `bg-gray-100` | `#f3f4f6` | Behind the two panels |
| Panel, card | `bg-white` | `#ffffff` | Panels, cards, menus, inputs |
| Content well | `bg-gray-50` (`/50` in Agent tab) | `#f9fafb` | Scroll area inside the left panel |
| Sunken well | `bg-gray-100` | `#f3f4f6` | Runner Output list, code blocks, assistant bubble |
| Accent | `bg-blue-600` / `text-blue-600` | `#2563eb` | Headers, primary button, icons. Pinned to the original palette (review B2) |
| Accent hover | `bg-blue-700` | `#1d4ed8` | Primary button hover, link text |
| Accent tint | `bg-blue-50`, `bg-blue-100`, `bg-blue-600/10` | `#eff6ff`, `#dbeafe` | Menu highlight, AI-model tag, icon chip |
| Selection | `border-blue-500 ring-1 ring-blue-500` | `#3b82f6` | Active agent, selected ticket, changed context field |
| Text 1 | `text-zinc-900` | `#18181b` | Titles, body |
| Text 2 | `text-zinc-700` | `#3f3f46*` | Secondary body, descriptions |
| Text 3 | `text-zinc-600` | `#52525b` | Metadata, captions, empty states. Floor: nothing lighter carries meaning |
| Placeholder, disabled | `text-gray-400`, `opacity-50` | `#99a1af*` | Input placeholders and disabled controls only |
| Border | `border-gray-200` | `#e5e7eb` | Cards, dividers (decorative) |
| Control border | `border-gray-300` | `#d1d5dc*` | Inputs, selects, secondary buttons, chips |
| On accent | `text-white`; quieter: `text-blue-50` | `#ffffff`, `#eff6ff` | Text on blue headers. Not `blue-100` (4.3:1) |
Status always comes as a pair with a word or icon, never colour alone:

| Status | Row / notice | Badge | Text on white | Meaning |
| --- | --- | --- | --- | --- |
| Passed | `border-green-300 bg-green-50 text-green-900` | `bg-green-100 text-green-900` | `text-emerald-700` | Check passed, saved, approved |
| Failed | `border-red-300 bg-red-50 text-red-900` | `bg-red-100 text-red-900` | `text-red-700` | Guardrail tripped, error, rejected |
| Waiting | `border-amber-300 bg-amber-50 text-amber-900` | `bg-amber-100 text-amber-900` | `text-amber-700` | Needs a human, pending approval |
| Idle / skipped | `border-gray-300 bg-gray-100 text-gray-700` | `bg-gray-200 text-gray-700` | `text-zinc-600` | Not run, skipped |
| Human | `bg-emerald-100 text-zinc-900` bubble, `text-emerald-700` label | — | — | A consultant speaks |
Solid colour buttons: Approve `bg-emerald-700` (5.4:1; `emerald-600` is 3.7:1 and
fails), Reject `bg-red-600` (4.8:1).
### Typography
Font: Inter, self-hosted with `next/font` as the OpenAI demo does. Mono:
`font-mono` (system stack). Weights: 400 body, 500 labels and buttons, 600 headings.
No weight below 400 at any size under 16px. No bold (700).

| Step | Size / weight | Class | Use |
| --- | --- | --- | --- |
| Metric | 24 / 600 | `text-2xl font-semibold` | Metric tiles only |
| Panel title, tab heading | 18 / 600 | `text-lg font-semibold` | `Customer View`; one `h2` at the top of each tab |
| Section title | 16 / 600 | `text-base font-semibold` | PanelSection headers |
| Nested title, card title | 14 / 600 | `text-sm font-semibold` | Sections inside History, card titles |
| Body, controls | 14 / 400–500 | `text-sm` | Default in the workspace |
| Chat message | 16 / 400 | `text-base` | Customer chat messages |
| Code | 13 / 400 mono | `font-mono text-[13px]` | Paths, tool calls, ids |
| Metadata | 12 / 400 | `text-xs` | Timestamps, badges, captions |
Minimum sizes for video calls: 12px is the floor and is for metadata only. Anything
the presenter points at while talking (trace rows, chat, ticket summaries, button
labels) is 14px or more. Numbers that line up use `tabular-nums`.
### Spacing, radius, elevation, icons

- Spacing unit 4px. Page gutter and panel gap 8. Panel content padding 16. Card
  padding 12. Section to section 20 (`mb-5`). Title to content 12. Stacked rows 8.
  Grid gap 8–12. Controls in one row share one height (40px).
- Radius: panel 12 (`rounded-xl`), card and menu 8 (`rounded-lg`), control, row and
  notice 6 (`rounded-md`), badge and pill full, chat bubble 16 (`rounded-2xl`).
  Plain `rounded` (4px) is not part of the scale.
- Elevation: `shadow-sm` on panels and cards; `shadow-xl shadow-gray-400/40` on the
  floating menu only. Rows, buttons and badges have no shadow.
- Icons: lucide-react, default stroke. 20px in panel headers, 16px in section chips
  and buttons, 12–14px inline. Section icons are `text-blue-600`; status icons take
  the status colour. Decorative icons are `aria-hidden`; an icon-only button has an
  `aria-label` and a 40px box.
- Motion: none beyond the chevron rotation and browser defaults. Do not add entrance
  animation; streamed events arriving is the motion.

## Screens and layout
Routes: `/` (tabs `?tab=agent|consultant|how`), `/readme` (security text),
`/admin` (redirects to the Consultant tab).

| Width | Layout |
| --- | --- |
| ≥1440 | Two panels, workspace 3/5 and chat 2/5, full viewport height, each panel scrolls inside. Guardrails 3 columns, metrics 4 columns |
| 1024–1439 | Same two panels. Metrics 2 columns. Runner summaries may truncate to one line |
| 768–1023 | Stacked: chat first at about 60svh (min 320px), workspace below with the page scrolling. Runner summaries wrap |
| 390–767 | Stacked. Customer selector on its own header row; brand text hidden below 640px; tabs scroll sideways below the header; guardrails 1 column; context stays 2 columns |
No horizontal page scroll at any width. Menus stay inside the viewport and below the
customer header. The scenario menu is at most 60svh and scrolls inside.

## Components and states
Shared states, used by every component unless it says otherwise:

- **Hover:** secondary and chips `hover:bg-gray-100`; primary `hover:bg-blue-700`;
  menu items `bg-blue-50`; on a blue header `hover:bg-white/10`. Hover never looks
  like selection and never changes size or weight.
- **Focus:** `:focus-visible` 2px outline, 2px offset, `blue-600` on light surfaces
  and white on blue surfaces (every control in either header). Never
  `outline-none` without a replacement.
- **Selected / current:** blue-500 border plus ring on cards and chips, plus
  `aria-current` or `aria-pressed`. In tabs: underline (see below).
- **Disabled:** `opacity-50`, `cursor-not-allowed`, no hover. Say why nearby when it
  is not obvious (`Take over the conversation to reply`).
- **Loading:** a short sentence or `…` in place of the value; no spinner, no layout
  jump when the value arrives.
- **Empty:** one sentence in `text-sm text-zinc-600`, no card, no icon. It says what
  to do next (`Send a message to follow its path through the agent.`).
- **Error:** `role="alert"`, red notice (`border-red-300 bg-red-50 text-red-800`),
  the real error type and message, and a Retry button when retry can help.

| Component (owner file) | Geometry and hierarchy | States and semantics |
| --- | --- | --- |
| Panel header (`workspace.tsx`, `customer-view.tsx`) | Blue, min 48px, 12px side padding, `rounded-t-xl`. Left: identity. Right: utilities, then brand in `text-xs` | Header controls are 40px tall, white focus outline. Flagged developers get a gear button and a white Settings menu with an Annotations switch; toolbar is lazy-loaded and hidden by default |
| Tabs (`workspace.tsx`) | Every label `text-sm font-semibold`, same weight in all states. On a separate white bar below Agent View: active `text-blue-700` plus a 3px blue-600 underline. Inactive: `text-zinc-700`, transparent underline. Count badge: `rounded-full px-1.5 tabular-nums`, `bg-gray-100 text-zinc-700`, amber-100/amber-900 while unseen | Weight never changes with state, so no label moves when the tab changes. Hover `bg-gray-100`. Radix tabs: arrows, Home/End; focus is a blue outline, distinct from the underline. The badge has a spoken label. Accepted layout: review B1 |
| Tab heading | One `h2` `text-lg font-semibold` per tab (`Current turn`, `N needs a human`, `How it works`), no icon | Names the tab's main job |
| Section header (`panel-section.tsx`) | Icon chip, 16px title, chevron right; whole row is a 40px button | `aria-expanded`; hover `text-blue-700`; open by default |
| Card (`ui/card.tsx`) | One border per item. Do not put a bordered card inside a bordered card, except the inherited Conversation Context grid | Selected, failed (`border-red-400 bg-red-50`), idle (`opacity-60`) |
| Badge (`ui/badge.tsx`) | `rounded-full px-2.5 py-0.5 text-xs`. Solid blue is for the active agent and current handler only; statuses use the pale pairs | A badge carries a state, not a noun: no `Ticket` badge beside a ticket id |
| Turn trace row (`turn-trace.tsx`) | White rows in one card, 14px label/detail and 12px tabular time | Pale status badge; tint only for waiting and failed |
| Agent chip (`agents-list.tsx`) | 40px `rounded-lg border-gray-300 bg-white` chip, name `font-medium`, chevron; opens a description | Active agent: selection ring plus a solid blue `Active` badge |
| Context field (`conversation-context.tsx`) | Inherited 2-column grid of small bordered fields with a blue dot | Changed: blue-500 border, `bg-blue-50`, green dot, `updated`. Empty value: italic zinc-600 `null` |
| Runner event (`runner-output.tsx`) | White card in the grey well: agent name `text-xs`, grey pill with icon and label, mono summary | Row expands to JSON; status tone on the summary text |
| Chat bubble (`message-list.tsx`) | `max-w-[85%] text-base`. Customer grey-100 bubble right, agent plain text left, consultant emerald-100 bubble left with name label | System notes: centred `text-xs italic zinc-600`. Working line while busy. ChatKit-like treatment. Empty chat has a centered greeting and three existing scenario buttons, including the free human-request rule |
| Chat widget (`order-picker`, `secure-form`, `photo-upload`, `address-confirm`) | Card under the message, `max-w-[85%]`, caption `text-xs font-semibold uppercase tracking-wide` | Only the newest message's widget is live; older ones are disabled. Refused options say why in red text. Secure form is emerald to signal "outside the model" |
| Composer (`composer.tsx`) | 40px input `rounded-md border-gray-300`, primary icon button and Scenarios trigger | Disabled while busy; Enter sends |
| Scenario menu (`scenario-bar.tsx`, `scenario-options.tsx`) | 40px secondary trigger; menu 320px, `rounded-lg`, groups with 13px semibold labels and a divider between groups; items 40px | Radix menu keys, focus returns to the trigger; grey edge fades only where more content scrolls; running scenario is a system line above messages; trigger inside composer, icon-only below 640px |
| Consultant queue (`consultant-panel.tsx`, `approval-queue.tsx`, `ticket-queue.tsx`) | Counted heading, then approval cards (amber border), then ticket cards: mono id, status badge, time right, summary, meta line, actions | Selected ticket: selection ring, `aria-current`. Primary action is a 40px button, not a 12px link |
| Conversation pane (`conversation-pane.tsx`) | White `rounded-xl` block: header row with customer, ticket, handler note (`rounded-md`, wrapping body text), Take over / Hand back; transcript on `bg-gray-50/50`; reply box | Customer left, staff right (agent grey, consultant emerald). Queue → conversation → metrics → history. Reply disabled until takeover |
| Metric tile (`metrics-strip.tsx`) | Card: uppercase 12px label, 24px value, 12px hint | Read-only |
| Notice (`session-secret-notice`, `inspector-notice`, console notices) | `rounded-md border p-3 text-sm`. Standing demo caveat: neutral grey with a small amber icon. Something the user must act on: amber | `role="status"` or `note`; errors use the error state |
| Form controls | Input and select: 40px, `rounded-md border-gray-300 bg-white px-3 text-sm`. On a blue header: `bg-blue-700 text-white`, no border; capped at `md:max-w-56`, minimum 190px from 768px | Label or `aria-label` on every control |
| Button | 40px, `rounded-md px-3 text-sm font-medium`. Primary `bg-blue-600 text-white`. Secondary `border border-gray-300 bg-white`. Accent outline `border-blue-300 text-blue-800 hover:bg-blue-50`. Approve / Reject as above. Inside chat widgets 32px | Shared states. One primary button per card |
| Link | `text-blue-700 underline`; on blue: white, underlined. External links carry a 12px `ExternalLink` icon | Clickable height at least 24px; a link that is a card's main action becomes a button |
| Explainer (`how-it-works.tsx`) | Numbered white cards joined by 1px blue-600 arrows; tag right (`AI model` blue-100/blue-900, `Code` gray-100/gray-800); mono path | Try-it buttons sit inside their layer card, use accent outline and are disabled while busy |

## Content and copy

- English UI, sentence case, plain words. Name the thing and its state:
  `AI agent · ticket open`, `Pending approvals: none`.
- Explain a term the first time an interviewer would ask about it (the explainer
  does this once; do not repeat it in tooltips).
- Field names from the runtime stay as they are in code (`active_order_id`), in the
  inherited snake_case, because the presenter maps them to source.
- Separators: ` · ` between a label and its state; `→` for a handoff.
- Times: one format everywhere, 24-hour `HH:mm:ss`; ISO local dates only in History (`YYYY-MM-DD HH:mm:ss`).
- No exclamation marks, no emoji, no marketing words. Errors say what failed and
  where.

## Accessibility

Target WCAG 2.2 AA. Measured in the rendered page on 2026-11-10:

| Pair | Ratio | Verdict |
| --- | --- | --- |
| white on blue-600 (header, primary button, customer bubble) | 5.25 | Pass |
| blue-100 on blue-600 (inactive tab today) | 4.30 | Fail for 14px text; use blue-50 (about 4.8) |
| white on emerald-600 (Approve today) | 3.65 | Fail; use emerald-700 (5.36) |
| white on red-600 (Reject) | 4.77 | Pass |
| blue-700 on white (links) | 6.83 | Pass |
| blue-800 on blue-50 (scenario pill) | 8.11 | Pass |
| gray-200 border on white | 1.24 | Decorative only; control borders use gray-300 plus a label |

- Text 3 (`zinc-600`) is the lightest text that carries meaning. `gray-400` is for
  placeholders and disabled controls.
- Hit areas: 40px for buttons, tabs, chips, selects, menu items; 24px minimum for
  inline links; 32px inside chat widgets.
- Keyboard: every action reachable by Tab; tabs and menu follow Radix patterns;
  focus returns to the trigger when a menu closes; opening a ticket moves the view to
  its conversation.
- Status is never colour alone: each state has a word (`passed`, `Failed`,
  `open`) or an icon.
- Not claimed: screen-reader passes, reduced motion and zoom at 200% are unchecked.

## Do / Don't

| Do | Don't |
| --- | --- |
| Start from the OpenAI demo component and add the least that the feature needs | Introduce a new surface colour, gradient, shadow or radius |
| Mark the active tab with colour and underline at one fixed weight | Change font weight, size or padding between states |
| Keep blue for chrome, selection and the primary action | Use solid blue badges for nouns, or blue for status |
| Use the pale status pairs with a word or icon | Fill whole lists with tinted boxes when everything passed |
| Keep one border per item and one primary button per card | Nest bordered cards or stack three bordered strips |
| Use 14px or more for anything discussed on a call | Use 12px light or grey-400 text for information |
| Give every control a 40px box and a visible focus ring | Ship 16px-tall text links as the main action |
| Reuse `Card`, `Badge`, `PanelSection` and the button recipes | Restyle a control locally or patch colours in `globals.css` |
| Record a new look here before coding it | Let the code be the only place a decision lives |

## Implementation drift and evidence

The code does not yet match every rule above. The scoped review with evidence,
importance and points is
[.plan/reports/2026-11-10-design-ux-review.md](.plan/reports/2026-11-10-design-ux-review.md).
Implementation and pending independent visual review: [H07 report](.plan/handoffs/H07-design-review-implementation-report.md).

## Verification and maintenance

- After a visual change: `just check`, then look at the changed surface in a real
  browser at 1440, 1024, 768 and 390, with keyboard focus visible, and compare with
  `research/smoke-python-demo.png` for family resemblance.
- A substantial UI change needs an independent visual review of rendered
  screenshots before delivery.
- Update this file in the same change: token or component rule first, decision row
  second, code third.

## Decisions

| Date | Decision | Replaces | Reason |
| --- | --- | --- | --- |
| 2026-11-11 | Stacked public-demo chat has a 44rem minimum height while the key form is present; desktop remains viewport-bounded. Smoke checks a 160px message viewport at 390×844 as well as taller layouts. | Fixed 60svh panel compressed by the added HTTPS notice. | Keep complete replies readable and the composer reachable beside the key controls. |
| 2026-11-11 | On HTTP, the visitor-key form shows the existing amber notice style with a plain HTTPS warning. Key transport refuses non-loopback HTTP; loopback remains a stated development exception. | HTTPS caveat only in surrounding prose. | Warn at the point of entry and prevent sending a secret over an insecure shared connection. |
| 2026-11-11 | Public demo key input below the customer header: native password field and Clear button, both 40px; white surface, gray-300 borders, 14px text, existing blue links, 4px spacing scale. Explanation and links wrap below. | No visitor key control. | Visitors supply a tab-only key without obscuring chat or changing the visual language. |

The dated [decision log](.plan/design-decisions.md) records accepted and superseded treatments.
