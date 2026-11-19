# H11 — fixes from the owner's walkthrough

## TLDR

The owner clicked through the local demo and found inconsistencies (the agent says it cannot see
the delivery address, then the address card shows it), dead ends (no refund cancel, typed "yes"
for every follow-up), an abusive consultant message that reached the customer unchecked, and a
start screen and console that hide what the app can do. Five parts, {58p}, Importance: High.
Effort: high for H11a/H11b, medium for H11c. Visual items follow DESIGN.md: record every new
choice (icons, motion, chips) as a decision row first.

## H11a {13p} — consistency and dead ends

| # | Pts | Fix |
|---|---|---|
| A1 | 2 | `get_order` / `list_my_orders` return the owner's delivery address (it is their own data). Today the agent says "I cannot see the address" while the address-change card shows it. Eval: "What is my delivery address for 1004?" answers with the address. |
| A2 | 3 | Address change validation: the postal code must match the order's country format; a change to another country is refused with a policy reason and an escalation offer. Observed: London order changed to "jasia stasia 17/21, 02-347 warszawa" without a check. Tests + eval. |
| A3 | 1 | Slot panel: after Confirm it still shows `order_missing`, `city_missing`, …; show a "Saved" state and plain labels ("Still needed: street, city"). |
| A4 | 1 | Customer selector shows "Not logged in (guest) ()": no empty brackets when there is no language. |
| A5 | 2 | KB citations like `[delivery-times]` render as a source chip with the article title; clicking opens the article text (Agent View KB section or a small dialog). |
| A6 | 2 | No invented follow-ups: after escalation the agent said "you will get an answer by e-mail or phone" — nothing confirms that. Escalation tool result states what happens next; prompt forbids promising contact channels. Eval scenario. |
| A7 | 2 | `cancel_refund`: a refund created in this demo can be cancelled by its owner while it is not paid out; otherwise explain and offer escalation. Observed dead end: "I changed my mind, cancel the refund". Tests + eval scenario. |

## H11b {13p} — consultant console

| # | Pts | Fix |
|---|---|---|
| B1 | 1 | The Consultant tab pulses briefly (badge) when a new ticket or approval arrives; respect `prefers-reduced-motion`. |
| B2 | 3 | Take over and Hand back move into the reply composer of the selected conversation: when not taken over, the send button reads "Take over and reply" (one action); Hand back sits next to Send. No separate top buttons. |
| B3 | 3 | Hand-back note: Hand back offers an optional "Note for the agent" (e.g. "refunds for this order only above 100 PLN after photo"). The note goes into that thread's run context as a staff instruction, is shown in Agent View, and never overrides code rules. Ratings + corrections stay the "for future conversations" path (export as eval scenarios); say so in How it works. |
| B4 | 2 | Staff message check: before a consultant message is sent, a simple rude-language/tone check warns "This may sound rude to the customer. Send anyway?" (warn, not block; audited). Observed: "nie ma opcji idz sie jebac" reached the customer. Polish and English word lists; tests. |
| B5 | 3 | New Agent View panel "Customer & order": customer name, e-mail, language, default address; active order with items, status, delivery address. Public mode shows only the visitor's own data (existing cookie scoping). |
| B6 | 1 | "Runner Output" becomes "Run log (all turns)", grouped by turn with the customer message as the group header and a one-line help text. |

## H11c {13p} — start screen, quick replies, icons

| # | Pts | Fix |
|---|---|---|
| C1 | 3 | Start screen: keep 3 highlighted starters, then a scrollable list of scenario categories, each with an icon and its scenarios. Rename labels to plain words (e.g. "kb-unknown-yes" label → "Unknown answer, then accept escalation"). Every category has at least one rule-based or cheap starter where possible. |
| C2 | 1 | The composer's Scenarios button shows the count ("Scenarios 38" as a grey badge). |
| C3 | 3 | Quick replies: when the agent offers escalation or asks to confirm a refund, show reply chips ("Yes, please" / "No, thanks") from a structured signal (tool state or data part), never by regex on model text. |
| C4 | 3 | Icon map (lucide-react, already a dependency) recorded in DESIGN.md, then applied: tabs Agent `Bot`, Consultant `Headset`, How it works `BookOpen`; Take over `UserCheck`, Hand back `Undo2`, Send `SendHorizontal`; trace kinds escalation `LifeBuoy`, guardrail `ShieldAlert`, approval `Hourglass`, tool `Wrench`, handoff `ArrowRightLeft`, KB `BookMarked`, error `TriangleAlert`; scenario categories security `Shield`, refund approval `BadgeCheck`, human handoff `Headset`, data collection `ClipboardList`, guest `UserRound`, knowledge `BookOpen`, address `MapPin`, languages `Languages`. Adjust names if a better existing icon fits; keep one icon per meaning. |
| C5 | 1 | Customer selector chevron sits on the border; give it right padding like the other selects. |
| C6 | 2 | Make sure the address change flow (scenarios 37/38) and guest mode are reachable from the start screen, not only from the menu. |

## Constraints

Same as H07–H10: DESIGN.md first, `corepack pnpm`, `CI=true`, lease hook (release after each
commit), commit per item, no AI attribution, no push. Prompt or tool changes require the eval
gate (ADR 010): run only the new and affected scenarios plus the security category once; report
the table and cost estimate. Update ARCH.md (impact log) for B3 and A7. Keep `just check` and
the CodeTour checker green.

Operator continuation, 2026-11-11: the earlier single-eval execution grant above is
superseded. Finish H11a–H11d and the final independent source/visual review, then
**STOP BEFORE EVAL**. Present the proposed affected/new scenario IDs plus all
Security & guardrails IDs, the reason each is affected, and a cost estimate with
explicit assumptions. Do not run any eval until the operator separately approves
that proposed list and cost. Item scope, per-item commits and immediate lease
release, per-part technical gates and no push remain unchanged.

Later operator authorization, 2026-11-11: the temporary STOP BEFORE EVAL hold in
the preceding continuation is superseded and retained only as history. Finish
H11b, H11c and H11d, complete the final independent source/visual review and
offline gates first, then run **ONE selected eval campaign on the final H11a–H11d
source**: new and affected scenarios plus the full Security & guardrails category.
The owner approves this run without another consent request. Report exact selected
IDs and selection reasons, the complete per-scenario results including failures,
and a cost estimate with explicit token/rate assumptions. No repeat campaign or
extra live browser model turns. No push; per-numbered-item commits and immediate
lease release remain unchanged. No eval had run when this decision was issued.

Owner addition, 2026-11-11: H11e below extends accepted scope to 58 points. Do E1
now at a safe point, preserving uncommitted C3; selectively stage Dockerfile and
own E1 documentation only. Do E2 after H11d, before final check/review and the
single authorized eval. No cloud build or push. The eval authorization above
remains active for the final H11a–H11e source. Review production public-asset
packaging with D1; the immediate E1 correction changes only the manifest COPY line.

Final operator disposition, 2026-11-11: the first eval invocation was configuration-blocked
(no key reached the process) and is not the approved evaluation. Preserve
research/H11-final-eval.log as history. The operator explicitly authorizes ONE actual
corrective campaign on the same49 IDs using the existing with-key/Password Broker
inject path through a task-local PASSWORD_BROKER_SCRIPT binding and PUBLIC_DEMO=false.
No secret values or env-file contents may be read/printed; no source change, new gate,
build/check or model probe. Report exact results/ms/notes, real defects and cost
assumptions; no silent fixes or actual campaign rerun. That actual campaign finished
40/49 with Security8/8 and model acceptance FAIL. Further product changes or another
model campaign require a new explicit operator amendment. No push; release each commit.

## Acceptance

Per part: `just check`, `just build`, restart the local server, layout smoke. New screenshots
`docs/screenshots/h11-*.png` at 1440 and 390: start screen, Customer & order panel, composer with
"Take over and reply", hand-back note, quick replies, staff warning. An independent visual review
follows. Report: `.plan/handoffs/H11-owner-walkthrough-fixes-report.md`.

## H11d {13p} — added by the owner during H11 (do after H11c)

| # | Pts | Fix |
|---|---|---|
| D1 | 5 | Product images. Orders and order-picker cards, the Customer & order panel and the consultant view show a product thumbnail, so the shop reads as a furniture store. One image per catalog product in `app/public/products/`, small (≤ 60 KB WebP). Source: photos under the Unsplash License (free for commercial use, no attribution required; still list source URLs in `docs/media/README.md`), or generated images if you cannot fetch. No hotlinking. DESIGN.md decision row for thumbnail size, radius and fallback. |
| D2 | 2 | KB hit cards look boxy (owner: "kwadratowe", e.g. "Returns Policy: how long do I have to return the chair"). Restyle per DESIGN.md: title, one-line snippet, source chip from A5, score as small grey text; no heavy box. |
| D3 | 5 | Multi-step scenarios suggest the next customer message. After the agent answers, the next scripted message is typed into the composer with a short keystroke animation (skip animation under `prefers-reduced-motion`); the user can edit it or click Send. Nothing is sent automatically. Use the existing multi-turn data in `app/data/scenarios.json` (or add a `followUps` list) and show "Step 2 of 4" in the scenario system line. Extend multi-turn coverage so key stories (damage claim → refund over limit → ask for a human) have follow-ups. |
| D4 | 1 | Smoke: a multi-step scenario shows the suggestion, editing keeps the text, Send advances to the next step. |

## H11e {6p} — owner additions (E1 now; E2 after H11d)

Exact owner instruction, 2026-11-11:

> Two owner additions for H11 (add to the handoff as H11e when you next write it): E1 (1p) Dockerfile: copy app/pnpm-workspace.yaml together with package.json and the lockfile before pnpm install - the Render build failed with ERR_PNPM_IGNORED_BUILDS (esbuild) because the allowBuilds decision was missing; already fixed and pushed in the publication repo, mirror it here. E2 (5p) README capabilities: replace the short Feature tour with a scannable capabilities section - a table of ALL scenarios grouped by category (generated from app/data/scenarios.json by a script so it never drifts, checked in just check), a table of every guardrail and code rule (input cleanup, jailbreak, relevance, leak/canary, masking, ownership, refund limit/approval, escalation rules, rate limits) with what it stops and the file, and the human-in-the-loop features. Keep screenshots. Do E1 now, E2 after H11d.

Importance: High. E1 acceptance: independent minimal source/static build-context
review, single manifest-line correction and separate commit/immediate lease release.
The Render failure and publication-repository fix are owner-supplied evidence;
do not claim a local Docker build unless actually run. Repository Dockerfile and
workspace policy suffice for the bounded correction if publication evidence is
unavailable. E2 acceptance: all fixture scenarios represented by generated content,
drift check in existing just check, source-linked rule table and human-in-the-loop
features; preserve screenshots and obtain final independent review with H11a–H11d.
