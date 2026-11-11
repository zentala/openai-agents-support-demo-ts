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
