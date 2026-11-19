# 004 — Human-in-the-loop with serialized run state; approvals only in the console

## TLDR

A refund above 500 PLN pauses the run through `needsApproval`. The paused `RunState` is
serialized and kept in memory. Only a consultant in the console can approve or reject.
Thread eviction never drops a pending approval.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

The Agents SDK supports human approval: a tool with `needsApproval` ends the run with
interruptions, and the state can be serialized and resumed. The first version let the
customer's own page press Approve on its own refund.

## Options considered

1. **Approve in the customer chat.** Simple, but the customer approves their own refund.
2. **Approve in a separate consultant console**, with an audit record and a push to the
   customer when the run resumes.
3. **External approval service.** Realistic for production, too heavy for a demo.

## Decision

Option 2.

- `create_refund` has `needsApproval` above `REFUND_APPROVAL_THRESHOLD` (default 500 PLN).
- The owning consultant may include a private thread-specific instruction on hand-back; blank clears
  previous guidance. It is stored outside the customer transcript and model-mutable memory, exposed only
  through inspector/admin channels, and rehydrated from the live thread for fresh and resumed contexts.
  Agent instructions treat it as subordinate to system policy and code rules. The output guardrail's
  existing seven-consecutive-word prompt-overlap check also covers note prose; short ordinary words
  do not become secrets. Independent secret and sensitive-data checks remain unchanged. Ratings/corrections
  remain the exportable eval path for improvements to future conversations.
- The consultant's first reply uses one `take_over_and_reply` action. Text length and current
  ownership are checked before takeover or a customer message; an existing owner sends without
  another join notice. Other consultants cannot take it over through the combined action.
  The composer is keyed by conversation and consultant, with stale selected views hidden while
  another conversation loads. All reply checks belong before the combined action's mutation boundary.
- Both staff reply actions check a small Polish/English whole-word tone list on the server before
  takeover or delivery. A warning creates a private, one-use acknowledgement bound to the thread,
  consultant, reply action and exact validated text. Only explicit resend with that acknowledgement
  can send the flagged text. Editing or changing the selected conversation/consultant clears the UI
  acknowledgement; takeover/hand-back and successful delivery clear the server record. The existing
  audit store records warning and acknowledged delivery without copying message text. This warns
  rather than blocks, and is a simple vocabulary check, not model-based moderation.
- The run is serialized and stored in `pending-runs.ts`. Resume uses
  `RunState.fromStringWithContext(agent, json, new RunContext(ctx))`, so the resumed run uses
  our context object and no private SDK field is read.
- Decisions go through `/api/admin/actions` (behind `proxy.ts`, Origin check), write an audit
  record (who, when, trace id) and push the resumed answer over SSE.
- `removeThread` clears the thread's pending approvals. Eviction skips threads with a pending
  run; if every slot is protected, thread creation returns HTTP 429.

## Consequences

- The customer cannot approve. The chat route has no approval path.
- Without `ADMIN_PASSWORD` the console is open, and the page says so.
- Consultant identity in the audit is self-declared (a dropdown). Production needs SSO and roles.
- Pending runs live in memory and are lost on restart ([ADR 009](009-in-memory-state-with-caps.md)).

## Evidence

- [app/lib/tools/refund.ts](../../app/lib/tools/refund.ts),
  [app/lib/runtime/approvals.ts](../../app/lib/runtime/approvals.ts),
  [pending-runs.ts](../../app/lib/runtime/pending-runs.ts),
  [threads.ts](../../app/lib/runtime/threads.ts).
- [app/lib/admin/actions.ts](../../app/lib/admin/actions.ts), [audit.ts](../../app/lib/admin/audit.ts).
- [JOURNAL.md](../JOURNAL.md): "Wave 3a" and "H02 independent-review fixes".
- Reports: [H02](../handoffs/H02-verify-fixes-report.md).
