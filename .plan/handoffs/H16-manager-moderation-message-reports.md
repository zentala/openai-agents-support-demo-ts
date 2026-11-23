# H16 — manager role, blocked rude replies, message reports and "ask a person"

## TLDR

**Implementation report:** [H16 implementation and verification report](./H16-manager-moderation-message-reports-report.md).

The owner wants the demo to show how a support team stays honest and polite: a consultant cannot
send a rude reply, repeated attempts lock the consultant out and alert a manager, customers can ask
for a manager, report a wrong AI answer or a rude consultant message, and ask a person about one
specific answer. Starts after H15 is merged (both touch escalation and the console). Points:
{ok. 29p}. Importance: High (M1, M2), Medium (M3–M7).

Observed 2026-11-19: consultant Marta Nowak sent "Cześć lamusie" ("hi, loser") and no warning
appeared. Cause: `app/lib/admin/staff-reply.ts` checks a short whole-word list (`RUDE_WORDS`);
inflected Polish insults such as "lamusie" are not in it.

## Owner's decisions (2026-11-19, paraphrased from Polish)

- Block rude consultant replies outright; no "Send anyway" switch.
- Three blocked attempts in a row lock the consultant out and go straight to the manager.
- A manager is a separate person in the staff list who receives decisions (escalations), not the
  owner himself. No junior/senior routing.
- Customer messages are not censored.
- The customer can say "pass this to a person", "I think this answer is wrong, report it", or ask a
  person "is this true?" about a specific answer and get a reply.

## Tasks

| # | Pts | Importance | Task |
|---|---|---|---|
| M1 | 5 | High | **Block rude consultant replies.** Replace the warning-plus-"Send anyway" flow with a block. Check order: the existing word list (extend with stems so inflections match: `lamus*`, `debil*`, `idiot*`, `kurw*`, …) then a model tone classifier on the guardrail model ("Would a customer read this support reply as rude, insulting or unprofessional? yes/no + short reason"), run with the same key rules as the agents (visitor key in public mode). A blocked reply stays in the composer with the reason ("This reply sounds insulting: 'lamusie'. Rephrase it."); nothing reaches the customer; audit entry `reply_blocked`. Classifier errors are visible (type + message) and block sending rather than letting text through. Tests: Polish/English/German rude and polite samples, inflections, classifier error path. DESIGN.md row for the blocked state (reuse the amber notice). |
| M2 | 5 | High | **Three strikes → lockout and manager alert.** Count blocked replies per consultant per thread; the third in a row (a sent polite reply resets the count) locks that consultant out of the thread: the composer and Take over are disabled with a notice, the thread returns to the queue with category `manager_review`, and the manager gets an alert listing the blocked drafts (visible to staff only). Manager can unlock the consultant. Add the manager to the staff list (e.g. "Ewa Zielińska · Manager", role `manager`); manager-only items show only when the manager is selected. Tests for count, reset, lock, unlock. |
| M3 | 5 | Medium | **Escalate to a manager.** Customer phrases ("I want your manager / supervisor", "chcę rozmawiać z przełożonym / kierownikiem", "Vorgesetzten") are a deterministic rule like `human_requested` → ticket category `manager_requested` in the manager queue; the reply says a manager will join, with the automatic-step treatment. Consultant gets an "Escalate to manager" button with a required short reason. Manager can take over and reply like a consultant. Eval scenario + offline rule tests in three languages. |
| M4 | 5 | Medium | **Report a message.** Every AI and consultant message in the customer chat gets a small "Report" action (flag icon, new registry key) and the agents get a `report_message` tool for "I think this answer is wrong, report it". A report stores the quoted message, author kind (AI / consultant name), the customer's reason and creates an item in the console's new "Reports" section; reports about consultants go to the manager. The agent confirms only after the tool returns REPORT_CREATED (D1 guard covers this claim). AI-answer reports can be exported with the existing ratings → eval export. |
| M5 | 5 | Medium | **Ask a person about this answer.** An "Ask a person" action on an AI message (and the agent tool path "ask a human whether this is true") opens a short question field; it creates a question ticket quoting that answer. The consultant answers from the console; the reply appears in the customer chat linked to the quoted answer ("About: …"). The AI keeps answering other messages meanwhile. |
| M6 | 3 | Medium | **Customer ends the consultant chat.** "I don't want to talk to this consultant / back to the assistant" (rule, three languages) and a small "Back to assistant" button in the takeover banner hand the thread back to the AI, close the consultant's takeover, notify the console and keep the ticket open for the manager if a complaint was made. |
| M7 | 1 | Medium | **Show the selected customer's profile before the first message.** While a selected customer's thread is opening, replace the "Start a conversation" placeholder with the existing loading state; the authenticated thread snapshot then shows profile, addresses and orders. A guest sees "Not verified yet" immediately. |

Sum: 29 points.

## Constraints and acceptance

- Depends on H15 (merge first). DESIGN.md rows before UI; ARCH.md impact log (staff roles, reports,
  tone classifier); ADR for blocking instead of warning (supersedes the H11 tone decision).
- Commit per task in a worktree (`wt-add h16`), no push. `just check`, `just build`, browser check at
  1440 and 390: blocked reply, lockout + manager alert, manager escalation, report and ask-a-person
  flows, back to assistant.
- New rules, tools and prompts: run the new scenario ids and one full eval after the owner approves
  the spend (ask the coordinator).
- Report: `.plan/handoffs/H16-manager-moderation-message-reports-report.md`.
