# H15 — honest claims, delivery disputes, diagnostics export and a Customer tab

## TLDR

Implementation and verification report: [H15 report](H15-honest-claims-disputes-customer-tab-report.md).

The owner tested a Polish conversation. A customer said delivered order #1003 never arrived, and the
Orders agent replied "przekazuję sprawę do konsultanta, który zajmie się zwrotem pieniędzy" ("I'm
passing your case to a consultant who will handle the refund"). It never called `escalate_to_human`:
no ticket appeared in the Consultant tab. It also promised a refund for an order the system records as
delivered 60 days ago (return window 30 days). This wave makes such claims impossible in code, teaches
the agents a general rule for "customer contradicts the record", adds a diagnostics export, a Customer
tab, and fixes the Open trace / key-field details. Points: {ok. 30p}. Importance: High (D1, D2),
Medium (D3–D5).

Transcript (owner, 2026-11-19, customer Anna Kowalska, pl):
`status` → order picker → "tu jest napisane ze wszystko doszlo ale 1003 nie doszlo" ("it says
everything arrived, but 1003 didn't") → the agent states the record and offers a consultant →
"no nie otrzymalem, che zwrot" ("I didn't get it, I want a refund") → the agent asks to confirm a
refund of 890 PLN → "tak" ("yes") → the agent claims it forwarded the case. No tool call, no ticket.

## Owner's intent (paraphrased from Polish)

- Saying "I forwarded it" without forwarding is the worst failure. Never claim an action the system
  did not perform.
- When the customer contradicts the system record (delivered, outside the return window), do not
  promise a refund. State what the system shows, ask whether they are sure (neighbour, parcel
  locker), and offer a consultant to clarify. Escalate only after they agree.
- This should come from a general rule the agent understands, not a hard-coded script for one case;
  code still guarantees the outcome is honest.
- The owner wants to download diagnostics and logs of a conversation to analyse locally.
- The owner wants a Customer tab after Consultant showing everything we know about the current customer,
  updating as the conversation changes it.
- Open trace stays disabled although the owner entered an OpenAI key; the key field should start with a
  key icon.

## Tasks

| # | Pts | Importance | Task |
|---|---|---|---|
| D1 | 5 | High | **Claim-without-action guard (code).** After each run, before the reply is sent, check the final text for claims of an action: forwarded/escalated/passed to a consultant or department, refund created/started, claim filed, address changed (PL/EN/DE patterns in one module, e.g. `app/lib/guardrails/action-claims.ts`). Each claim maps to the tool result that backs it in this turn or the thread state (`escalate_to_human` → ticket exists; `create_refund` → REFUND_CREATED/PENDING_APPROVAL; `submit_claim` → CLAIM_CREATED; address → confirmed). An unbacked claim never reaches the customer: replace the reply with a truthful line in the customer's language ("I have not forwarded this yet. Do you want me to connect you with a consultant?") plus the existing escalation choice buttons, and emit an Agent View event "Unbacked claim blocked" naming the claim type (no customer text in the event). Unit tests for every claim type and language, including offers ("I can pass this to a consultant if you want" is an offer, not a claim). |
| D2 | 5 | High | **Disputed record rule (prompt + code).** Add one general rule to `SHARED_POLICY` / `ORDERS_ROLE`: when the customer contradicts a system fact (delivered vs not received, already refunded, outside the window), (1) say what the system shows with the date, (2) never promise or start an outcome the tools refuse, (3) ask once whether they are sure and suggest a likely explanation (neighbour, parcel locker, another household member), (4) offer a consultant; escalate only on agreement. Code: `create_refund` for a delivered order whose reason says it was not received returns `DELIVERY_DISPUTE_NEEDS_HUMAN` (no refund created); `escalate_to_human` accepts a `category` (`delivery_dispute`, existing ones unchanged) and the ticket shows order id, recorded delivery date and address, so the consultant sees the context. Add eval scenarios: this exact Polish transcript; an English variant; a customer who insists twice; a customer who says "yes" to the consultant offer (ticket must exist). Expected: no refund promise, a ticket only after agreement, the reply never claims forwarding without a ticket. |
| D3 | 5 | Medium | **Diagnostics export.** An "Export diagnostics" button (new icon key `download`) in the Agent View header next to Open trace downloads `nordic-home-<threadId>-<timestamp>.json` from `GET /api/threads/[id]/export` (thread credential required, same rules as the event stream). Contents: app version/commit, models, public-demo flag, thread messages, every agent event (turn steps, tool calls with masked arguments/results, guardrail results, handoffs, blocked claims), tickets, approvals, refunds and claims of this thread, trace id. Never the API key, session secret, cookies or vault values; masked fields stay masked. Test: the export of a thread with a secure-form IBAN contains no IBAN digits and no key-shaped text. |
| D4 | 8 | Medium | **Customer tab** after Consultant (icon key `customer`, distinct from `guest`/`consultant`). Shows the current customer: name, language, verification state (guest/verified), e-mail masked as elsewhere, saved and order delivery addresses, every order with status, delivered date and items, refunds (status, amount), claims, open tickets, and "What the agent knows" (the session context fields the agent sees). Sections reuse existing card/badge styles; updates live when the conversation changes the context (verification, address change, refund). Guests see "Not verified yet" until VERIFIED, then only the verified order's data, mirroring what the agent may share. Record the layout in DESIGN.md first. Screenshots at 1440 and 390 (Anna, a guest before/after verification). |
| D5 | 3 | Medium | **Open trace and key field.** Research first: whether @openai/agents 0.21 can export a run's trace with the visitor's per-request key (run-level tracing config) instead of the server's. If yes, enable tracing for BYOK runs exported with the visitor's key and say in the key help text that traces appear in their own OpenAI dashboard; if not, keep it disabled and give the disabled link a visible reason ("Traces are off in the public demo"). Either way the reason is visible, not a silently grey link. Add the `apiKey` (KeyRound) icon at the start of the "Your OpenAI key" field label. Record the finding in JOURNAL.md. |

| D6 | 3 | High | **Truthful state after a consultant hands back (prompt + code).** Owner's second test: after the consultant (who was rude) handed back, the customer complained and the AI said the case "was forwarded to the right team and will be handled by the right person", inventing a team and a person. The session block must carry the real ticket state from code (open / taken over by <name> / handed back / closed, ticket id) so the agent describes exactly that. D1's guard treats "forwarded/waiting for a consultant" as backed only by an OPEN ticket of this thread, and blocks invented teams, departments or people. When the customer complains about a consultant, the agent apologises, says it cannot judge the consultant, and offers a new consultant via escalate_to_human (category `consultant_complaint`). Eval scenario: this flow. |
| D7 | 1 | High | **Rating correction field looks inline.** `app/components/admin/rating-controls.tsx` "Correction (optional)": no box. Transparent background, only a bottom line at about 20% opacity (e.g. `border-0 border-b border-zinc-900/20`), no radius, no focus ring; on focus the bottom line darkens slightly (about 40%). Placeholder lighter than body text. Same 40px height, aligned with the thumbs buttons. DESIGN.md row first. Screenshot at 1440. |

Sum: 30 points.

## Constraints and acceptance

- DESIGN.md decision rows before D3/D4/D5 UI; ARCH.md impact log for D1 (new post-run guard) and D3
  (new endpoint); ADR if D1 changes the turn order.
- Commit per task; lease released after each commit; no push (the coordinator publishes).
- `just check` and `just build` pass. Browser check at 1440 and 390 of the Customer tab, export button
  and the D1 fallback.
- D1/D2 change prompts and tool results: per ADR 010, the full eval and the browser smoke are the gate.
  The eval spends model credits and runs only after the owner approves it (see `.plan/DECIDE.md`).
- Never print or store a key; the export must be safe to share.
- Report: `.plan/handoffs/H15-honest-claims-disputes-customer-tab-report.md`.
