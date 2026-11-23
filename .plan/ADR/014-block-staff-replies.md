# 014 — Block unsafe staff replies before delivery

## TLDR

Consultant replies that match known rude language or the guardrail model's rude verdict are blocked and must be edited. There is no send override. This supersedes the tone-warning portion of ADR 004.

- **Status:** accepted
- **Date:** 2026-11-19

## Context

The H11 warning could be overridden, and its exact-word list missed inflected Polish insults such as `lamusie`. Customer safety requires the server to stop the message before takeover or delivery. Remaining language needs a model classifier; classifier failures must fail closed and remain visible.

## Decision

Use inflection-aware local stems first, then classify with the configured guardrail model. Block on a rude verdict or classifier error. Keep the exact draft in the browser composer and show the reason. Record `reply_blocked` without storing the draft in audit data. A third blocked reply locks that staff member out of the thread and returns an active takeover to the assistant while preserving the manager-review ticket.

## Consequences

Safe staff sends require classifier availability and an applicable API key. A classifier failure is a visible refusal and never permits a send. Tests stub classifier outcomes and do not call a model.

## Evidence

- [H16 handoff](../handoffs/H16-manager-moderation-message-reports.md)
- [staff reply moderation](../../app/lib/admin/staff-reply.ts)
- [staff tone tests](../../app/tests/staff-tone.test.ts)
