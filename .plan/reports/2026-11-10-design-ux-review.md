# Design and UX review against DESIGN.md — 2026-11-10

## TLDR

The app still has the OpenAI demo's frame (grey page, two white panels, blue
headers, white cards), but three things read as a separate skin: the font is not
Inter, the blue is a brighter Tailwind v4 blue, and the "Current turn" trace and
the chat use full-colour blocks the original never had. The bold active tab is a
measured layout shift, not only a taste issue. This report lists **21 obvious
fixes** (28 points) and **11 questions** for the owner. No application code was
changed. Contract: [DESIGN.md](../../DESIGN.md).

## Method

- **Sources read:** the original UI in `examples/openai-cs-agents-demo/ui`
  (components, `globals.css`, Tailwind config, `layout.tsx`); the current
  `app/app/globals.css`, `app/app/layout.tsx` and every file in
  `app/components/**`; handoffs H03–H05 in `.plan/handoffs/`.
- **Screenshots read:** `research/smoke-python-demo.png` (original),
  `research/v1-c1-approval-card.png`, `research/v1-e-order-picker.png`,
  `docs/screenshots/h05-{agent,consultant,how,scenario-menu,consultant-conversation}-1440.png`,
  `h05-agent-390.png`, `h05-runner-768.png`.
- **Live run:** machine the development machine, `http://127.0.0.1:3100/` (local dev build),
  headless Chromium through the local proxy, widths 1440×900, 1024×768, 768×1024,
  390×844. Per width: empty Agent tab, scenario menu, the "Asks for a human"
  scenario, Consultant tab with keyboard focus, an opened ticket, How it works with
  a hovered tab. The script measured tab widths, font weights, control sizes, text
  sizes and computed colours. Console errors: none. Horizontal page scroll: none.
- **Cost:** four runs of the rule-based "Asks for a human" scenario (the trace says
  `model skipped`, so no model call was expected). No typed chat messages.
- **Side effect:** the four runs left four open tickets (T-2002 to T-2005) in the
  demo's in-memory state. I did not reset the demo data.
- Live captures were written to a temp folder and are not in the repo; findings
  that rest on them quote the measured number and name the repo screenshot that
  shows the same thing where one exists.

### Not checked

| Area | Why |
| --- | --- |
| Approval flow, guardrail failure, order picker, secure form, photo upload, address card, takeover chat, rating controls, live | Each needs paid model turns; judged from source and `research/v1-*.png` only |
| Error states (401 notice, console error, Errors section), `/readme` page | Not triggered; source only |
| Focus ring on the customer selector, reset button and Open trace link (A2) | Derived from CSS; the tab focus ring was rendered and is fine |
| Firefox, Safari, macOS font rendering, 200% zoom, screen reader, reduced motion | Out of reach in this run |
| How the page looks inside a compressed video call | Judged by size and contrast rules only |

## Original OpenAI demo vs current

| Element | Original | Current | Drift justified? |
| --- | --- | --- | --- |
| Page and panels | `gray-100` page, white `rounded-xl shadow-sm` panels, 3/5 + 2/5 | Same | No drift |
| Font | Inter via `next/font` | CSS names Inter but no font file ships; Windows renders Segoe UI | No. Fix A3 |
| Header blue | Tailwind v3 `blue-600` `#2563eb` | Tailwind v4 `blue-600` `#155dfc`, visibly more saturated | Accidental (framework upgrade). Question B2 |
| Left header | Bot icon, "Agent View" 18px title, brand right | Three tabs at 14px, Open trace link, brand; no icon, no title | Tabs are justified (ADR 008). Losing the title makes the two headers unequal. Question B1 |
| Active marker | — (no tabs) | Bold label + underline; hover is a solid darker block | No. Fixes A1, A4, A5 |
| Section headers | Icon chip, 18px semibold, chevron | Same chip, 16px | Yes: narrower panel, more sections |
| Agents | 3-column cards, description, solid blue `Active` badge, unreachable agents dimmed | Expandable chips; `Active` is plain 12px blue text | Chips justified (space). Plain text marker is not. Fix A11, question B7 |
| Guardrails | White cards, solid emerald/red badge, light grey description | Same cards, pale badges, reasoning text | Pale badges justified (contrast). Light 12px text is not. Fix A9 |
| Conversation Context | Gradient card, grid of dotted fields, `null` in grey italic | Same; `null` looks like a real value | Fix A14 |
| Runner Output | Grey well, white cards, pill label, mono text | Same | No drift |
| Current turn | Does not exist | Stack of fully tinted green/amber boxes, the first thing on screen | New surface, own look: seven green boxes fill half the panel (`research/v1-e-order-picker.png`). Question B3 |
| Customer chat | ChatKit: grey user bubble right, assistant as plain text, 16px, start screen with three prompts | Solid blue user bubble, grey assistant bubble, 14px, one grey sentence when empty | Own skin. ChatKit itself cannot be reused, its look can. Questions B4, B5 |
| Customer header | Title only | Title, a selector that fills the rest of the header in dark blue, reset icon | Controls justified; the wide dark block is not. Fix A16 |
| Below the chat | Composer only | Scenarios strip, scenario pill, composer: three stacked strips | Question B6 |
| Status colours | Solid emerald-500 / red-500, white text | Pale pairs with dark text, plus amber and grey | Yes: original white-on-emerald fails AA |
| Buttons | One (ChatKit send) | Five local styles, heights 28–40px, radii 4/6/8px | No. Fix A7 |
| Consultant tab | Does not exist | Queue, metric tiles with uppercase labels, conversation, history | Built from inherited cards; order and transcript are open. Questions B8, B9 |
| How it works | Does not exist | White cards with arrows, tags, mono paths | Fits the family. Question B10 |
| Responsive | Desktop only | Stacks below 1024px | Yes |

## A. Obvious fixes (no owner decision needed)

Points: 1 trivial, 2 small, 3 a few files, 5 medium. Total **28 points**.

| # | Importance | Points | File / component | Evidence | Fix (DESIGN.md rule) |
| --- | --- | --- | --- | --- | --- |
| A1 | High | 2 | `workspace.tsx:38` tabs | Active tab is `font-bold`, inactive `font-medium`. Measured at all four widths: Agent 54.50→56.02px, Consultant 108.47→111.34px, How it works 99.13→102.81px; neighbours move up to 2.9px on every switch. Visible between `h05-agent-1440.png` and `h05-consultant-1440.png` | One weight for all states (`font-semibold`); active = white text + 3px white underline (Components → Tabs; Decisions 2026-11-10) |
| A2 | High | 1 | `globals.css:11-16`, `customer-view.tsx:59-72`, `workspace.tsx:43` | Global focus outline is `#2563eb`; only `.workspace-tab` switches to white. Customer selector, reset button and Open trace sit on the blue header, so their focus ring is blue on blue. Source only | White outline for every control on a blue surface (Shared states → Focus) |
| A3 | High | 2 | `app/app/layout.tsx`, `globals.css:7` | `document.fonts` is empty on the live page; glyphs in every h05 screenshot are Segoe UI, the original screenshot is Inter | Load Inter with `next/font` as the original does (Tokens → Typography) |
| A4 | Medium | 1 | `workspace.tsx:38` | Inactive label `text-blue-100` on `bg-blue-600`: measured 4.30:1 at 14px | `text-blue-50` (about 4.8:1) (Accessibility table) |
| A5 | Medium | 1 | `workspace.tsx:38` | Hover is `bg-blue-700`, a full-height dark block. In `h05-consultant-1440.png` and `h05-how-1440.png` the pointer rests on the tab and it reads as a second "selected" style | `hover:bg-white/10`; hover never looks like selection (Shared states → Hover) |
| A6 | Medium | 1 | `admin/approval-queue.tsx:19,44` | Approve is white on `emerald-600`: measured 3.65:1 for 14px text | `bg-emerald-700` (5.36:1) (Tokens → status) |
| A7 | Medium | 3 | `approval-queue.tsx:19,43`, `conversation-pane.tsx:54,80,83`, `consultant-panel.tsx:23,48`, `address-confirm.tsx:40,43`, `secure-form.tsx:75`, `how-it-works.tsx:35`, selects and notices using `rounded` | Take over / Hand back measure 34px beside 40px controls; widget buttons are about 28px; radii mix 4, 6 and 8px; two buttons have `border` with no colour class (`approval-queue.tsx:43`, `consultant-panel.tsx:23`) | The four button recipes, 40px (32px in chat widgets), `rounded-md` (Components → Button; Radius) |
| A8 | Medium | 2 | `ticket-queue.tsx:41-52`, `approval-queue.tsx:38`, `workspace.tsx:43`, `runner-output.tsx:78`, `admin/rating-controls.tsx:17` | Measured: Open trace 72×16px, Open conversation 103×16px, OpenAI trace 86×16px, runner row button 20px tall. "Open conversation" is the ticket's main action and is a 12px link (`h05-consultant-1440.png`) | Main action becomes a 40px secondary button; inline links get 24px height; icon buttons 40px (Accessibility → hit areas; Components → Link) |
| A9 | Medium | 1 | `guardrails.tsx:38`, `conversation-context.tsx:34`, `knowledge-hits.tsx:26` | 14 text nodes render at 12px weight 300 in the Agent tab; thin strokes at the smallest size are the first thing a video codec loses | Drop `font-light`; no weight under 400 below 16px (Tokens → Typography) |
| A10 | Medium | 2 | `globals.css:21-23` | `.text-zinc-500` is overridden to zinc-600 inside the workspace only, so the class name lies and the chat column still renders real zinc-500. A blanket `filter: brightness(0.97)` is the hover for every button, including tabs | Use `text-zinc-600` in the components and explicit hover classes; delete both overrides (Do / Don't: no colour patches in `globals.css`) |
| A11 | Medium | 1 | `agents-list.tsx:14` | Active agent is marked by a ring and the word `Active` in 12px blue text (`research/v1-e-order-picker.png`); the original uses a solid blue badge | `<Badge tone="blue">Active</Badge>` (Components → Agent chip) |
| A12 | Medium | 1 | `admin/ticket-queue.tsx:32` | Each ticket shows `T-2002` followed by a solid blue `Ticket` badge (`h05-consultant-1440.png`). The badge repeats the id's meaning and spends the accent colour on a noun | Remove the badge; keep the status badge (Components → Badge) |
| A13 | Medium | 2 | `admin/conversation-pane.tsx:27-35` or the transcript role it receives | In the opened ticket the agent's reply ("I have passed your case to a human colleague…") is a centred grey italic line with no "Agent" label and no rating controls (`h05-consultant-conversation-1440.png`). It reads as a system note, not as the answer the customer got. Hypothesis: rule-generated replies are stored with role `system` | Show every customer-visible reply as an agent bubble with its label; keep the italic line for events such as takeover (Components → Chat bubble) |
| A14 | Low | 1 | `conversation-context.tsx:38` | `null` uses the same style as real values (`h05-agent-1440.png`: three `null` fields look filled) | Italic `text-zinc-600` for empty values (Components → Context field) |
| A15 | Low | 1 | `slots-section.tsx:38` | Missing slot value is `italic text-gray-400` at 12px, about 2.6:1 on white. Source only | `text-zinc-600` (Accessibility: grey-400 is for placeholders only) |
| A16 | Low | 1 | `customer-view.tsx:64` | At 1440px the selector stretches about 330px across the header as a dark `blue-700` block, heavier than the title (`h05-agent-1440.png`) | Cap the width (`lg:max-w-56`) and keep it right-aligned (Components → Form controls) |
| A17 | Low | 1 | `workspace.tsx:39` | The tab's text content is `Consultant1`; the count has no spoken label | Add visually hidden text, e.g. "1 needs a human" (Components → Tabs) |
| A18 | Low | 1 | `workspace.tsx:43` | Before any turn, Open trace links to the generic `platform.openai.com/traces` page and looks identical to a real trace link | Disabled look and `aria-disabled` until a trace exists (Shared states → Disabled) |
| A19 | Low | 1 | `admin/console-header.tsx` | No file imports it; it still carries the old full amber banner and a different header | Delete the file (one look per component) |
| A20 | Low | 1 | `turn-trace.tsx:15`, `ticket-queue.tsx:35`, `audit-log.tsx:22`, `conversation-pane.tsx:91` | Mixed `toLocaleTimeString()` and `toLocaleString()`: `5:12:12 AM` in the trace, `11/10/2026, 5:12:07 AM` on tickets; output changes with the viewer's locale | One formatter, 24-hour `HH:mm:ss`, dates only in History (Content and copy) |
| A21 | Low | 1 | repo root | No `AGENTS.md`; DESIGN.md is linked only from `README.md:277` | Link DESIGN.md from the repository agent instructions when that file is created |

Suggested order: A1 + A4 + A5 together (one line in `workspace.tsx`), then A3, A2,
A7 + A8, the rest.

## B. Questions for the owner

### B1. Where do the tabs live?

Today the left header has no title; the right one says "Customer View" at 18px.

```
(a) now, fixed per A1          (b) title + tab bar            (c) folder tabs
[ Agent  Consultant 1  How ]   [ # Agent View    Nordic Home] [ /Agent\ Consultant How ]
  -----                        | Agent  Consultant 1  How    |  white tab joins content
                                 -----   (white bar, blue underline)
```

**Recommendation: (b).** It restores the original header (icon, title, brand), makes
both panel headers match, and puts the tabs on white where blue-600 underline and
zinc text have strong contrast. Cost: about 40px of height and 3 points. If height
matters more on your laptop, stay with (a); A1 fixes the bold either way.

### B2. Which blue?

The original is `#2563eb`; the app renders `#155dfc` because Tailwind v4 changed its
palette. Options: (a) pin `blue-500/600/700` to the v3 values in `@theme`, (b) keep
v4. **Recommendation: (a)**, 1 point. It is the single change that most restores the
"old design" feeling, and the focus outline in `globals.css` already hard-codes
`#2563eb`.

### B3. Current turn rows: tinted boxes or white rows?

```
(a) now                                 (b) white rows, status badge
+- green ---------------------------+   12:38:41  Input cleanup            [passed]
| 12:38:41 Input cleanup · passed   |             Nothing needed masking
| Nothing needed masking            |   12:38:42  Input guardrail          [passed]
+-----------------------------------+   +- amber ---------------------------------+
+- green ---------------------------+   | 12:38:44  Approval pending    [waiting] |
| 12:38:42 Input guardrail · passed |   +-----------------------------------------+
```

**Recommendation: (b).** Passed steps become plain rows in one white card with a
pale badge; only waiting and failed rows keep a tinted box. The screen stops being a
wall of green, the one amber or red row becomes the thing you point at, and the
trace takes about a third less height so guardrail cards stay above the fold.
3 points.

### B4. Chat bubbles: current or ChatKit-like?

(a) Now: solid blue customer bubble, grey agent bubble, 14px. (b) Like the original:
customer in a `gray-100` bubble on the right, agent as plain text on white, consultant
keeps the emerald bubble, 16px text. **Recommendation: (b).** The blue bubbles are the
loudest objects on the page and repeat the header colour; the original chat is quiet
and larger, which is what viewers read on a call. 2 points.

### B5. Empty chat: one sentence or a start screen?

The original opens with a greeting and three prompt buttons. Now there is one grey
line in the top-left corner (`h05-scenario-menu-1440.png`). **Recommendation:** a
centred greeting plus three starter buttons taken from existing scenarios (one of
them rule-based, so a first click costs nothing). It gives a cold open for the
interview. 2 points.

### B6. Where does the Scenarios button sit?

```
(a) now                      (b) in the composer row         (c) in the header
---------------------------  ------------------------------  [Customer View  v  Scenarios  R]
[Scenarios]                  [Scenarios v] [ Type...   ] [>]
(Scenario: Asks for a human)
---------------------------
[ Type your message...  ] [>]
```

**Recommendation: (b)**, with the running-scenario label shown as a system line at
the top of the conversation. It removes two bordered strips (about 90px) from the
chat. At 390px the trigger shrinks to an icon button. 2 points.

### B7. Agents: chips or the original cards?

Chips (now) save about 100px; the original cards show each agent's job without a
click and dim the agents the active one cannot hand off to. **Recommendation:** keep
chips, fix the Active badge (A11). Say if you want cards back at 1440px only.

### B8. Consultant tab order

Now: queue → metrics → conversation → history. An opened ticket's conversation
appears below the metric tiles; with four tickets at 390px it is two screens away.
Options: (a) queue → conversation → metrics → history, (b) at ≥1440px a two-column
queue | conversation layout, (c) keep. **Recommendation: (a)**, 1 point; metrics are
reference, the conversation is the job.

### B9. Whose side is the consultant transcript on?

Now it mirrors the Customer View: customer on the right in blue, as if the
consultant were the customer. Options: (a) consultant's view: customer left, staff
(agent grey, consultant emerald) right, (b) keep the mirror so both panels look the
same. **Recommendation: (a)**; support tools usually put the operator's own side on
the right, and the pane is the consultant's screen. 1 point.

### B10. How it works: Try-it buttons inside the layer cards?

```
(a) now: eight cards, then a second list   (b) one card per layer
1. Input cleanup              [Code]       1. Input cleanup                    [Code]
...                                        Remove mail noise and mask payment data...
Try it                                     app/lib/guardrails/normalize-input.ts
Input cleanup                              [Mail from iPhone] [Card number]
[Mail from iPhone] [Card number]
```

**Recommendation: (b).** The layer names are listed twice today and the buttons sit
a full screen below the explanation they belong to. 2 points.

### B11. One notice style or two?

The public-session-secret notice in the Agent tab is a full amber box; the
unprotected-console notice (since H05) is neutral grey with an amber icon. Both are
standing caveats of the demo. **Recommendation:** neutral style for both, amber boxes
only for something the user must act on now (inspector feed refused). 1 point.

## Next step

Answer B1–B4 first (they change the most pixels); A1–A8 can start now without them.
