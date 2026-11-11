# 005 — Thread credential and two event channels

## TLDR

The server creates every conversation and sets an HMAC-signed httpOnly cookie for it. Customer
streams carry only an allowlist of events. The Agent View reads a separate inspector feed
protected like the console.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

The event bus carries tool arguments (order data, e-mail), KB hits, guardrail reasoning,
approval requests and trace ids. A thread id is not a secret (it appears in URLs and logs).
Review of wave 3a found that knowing a thread id exposed internal SSE events.

## Options considered

1. **Thread id as the only guard.** Guessable or leaked ids open the stream.
2. **Signed cookie per thread plus an event allowlist for customers, and a separate
   authenticated inspector feed.**
3. **Real user login.** Out of scope for a demo with a customer dropdown.

## Decision

Option 2.

- `POST /api/threads` creates the thread with a random id and answers with
  `nh_thread_<id>`: HMAC(`SESSION_SECRET`, threadId), httpOnly, `SameSite=Strict`.
  Chat, customer stream, photo upload and secure forms require it.
- Customer events pass through `toCustomerEvent`. Only chat messages, takeover state and
  widgets are allowed. The map is a `Record` over all event kinds, so a new kind does not
  compile until it is classified.
- The inspector feed (`/api/admin/inspector/<thread>/stream`) sends everything and needs the
  console credentials in local staff mode. The accepted public-mode extension in
  [ADR 011](011-hosting-and-public-demo.md) requires that browser's signed thread cookie
  before replay/subscription; an optional console password never grants foreign-thread access.
- A new subscriber first receives earlier events from the event log (fixes a race found by
  the browser smoke).
- The default `SESSION_SECRET` is public; the server warns outside dev and the Agent View
  shows a notice.

## Consequences

- The cookie proves "this browser created this thread", not who the customer is.
- A forgeable default secret means a shared deployment must set its own.
- Filter and credential checks have tests that fail when removed.

## Evidence

- [app/lib/security/thread-credential.ts](../../app/lib/security/thread-credential.ts),
  [thread-access.ts](../../app/lib/security/thread-access.ts),
  [app/lib/runtime/event-visibility.ts](../../app/lib/runtime/event-visibility.ts),
  [app/lib/runtime/sse.ts](../../app/lib/runtime/sse.ts).
- [JOURNAL.md](../JOURNAL.md): "Wave 3b" (review fixes, race).
- README "Conversation credential".
