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
- Hand-back notes use a `staff_instruction` inspector-only event and the guarded admin thread view.
  They are never appended to the customer transcript or accepted from chat request fields.
- The guarded admin thread view also projects Customer & order details from server records.
  An unverified guest receives only an unverified status. Otherwise the profile's explicit default
  address is separate from the active order's current delivery address; a missing profile address
  stays missing. The active order comes from server thread memory and ownership is checked again
  at read time. Successful guest verification binds the exact proved order; `get_order` binds the
  canonical owned order being read. Both update the live context and thread memory, while failed
  proof/foreign reads leave selection unchanged. Listing orders never picks one. No order is selected
  by fallback. Agent View refreshes this same read after relevant
  inspector events and completed replies; thread-keyed loading discards delayed previous responses.
  Customer streams and model context do not receive this additional projection.
- The inspector feed (`/api/admin/inspector/<thread>/stream`) sends everything and needs the
  console credentials in local staff mode. The accepted public-mode extension in
  [ADR 011](011-hosting-and-public-demo.md) requires that browser's signed thread cookie
  before replay/subscription; an optional console password never grants foreign-thread access.
- A new subscriber first receives earlier events from the event log (fixes a race found by
  the browser smoke).
- Inspector events carry an optional server-created turn identifier from the event bus's local async
  scope. Paused approval requests save that identifier; decisions and resumed runs restore its scope,
  so an intervening customer message cannot relabel older work. The Run log groups only explicitly
  correlated events; unknown origins stay in Conversation updates. Header text comes exclusively from
  normalized/masked cleanup events, never the pre-cleanup trace. Customer projection removes the
  internal turn identifier, and trace boundaries/metrics remain one per incoming customer turn.
- The default `SESSION_SECRET` is public; the server warns outside dev and the Agent View
  shows a notice.

## Consequences

- Conversation code invokes the same validated offer action after KB results or a
  customer refund request plus an owned order. It never reads model prose to infer choices.
  Code invocations are labelled `Conversation flow (code)` in the inspector. Natural
  Yes/No replies consume only the current server-owned offer; structured clicks retain
  nonce/turn/ownership checks and refunds still use the ordinary guarded SDK/approval path.

- Customer entries carry explicit `ai`, `human` or `system` sender metadata. Code-created
  receipts never inherit an AI label. A typed `data-messages` part separates a guarded model
  answer from subsequent automatic steps; the transcript uses the same per-entry sender and
  shared renderer. Thin join/leave notices carry an explicit notice flag. Transport metadata
  is server-authored, redacted with the text, and contains no private correlation or staff note.

- Order-picker rows include product names from the session-owned orders for local artwork.
  The browser maps exact names to bundled catalog files; neither the model nor a widget field
  supplies a URL. Selected-order thumbnails reuse the guarded customer/order projection in
  Agent View and the consultant conversation; unverified guests still receive no order data.

- Quick-reply widgets contain a server nonce, thread id, localized question and Yes/No labels.
  The cookie-scoped chat route accepts only the nonce and choice; action details stay on the thread.
  Any new customer turn consumes or clears the previous offer. The latest server turn marker prevents
  an older resumed run from replacing newer choices. Failed/tripped/approval-paused outcomes publish
  no choices. An already open ticket prevents additional escalation offers and clicks, but does not
  block a valid refund while the agent still handles the conversation. A new automatic error-limit
  escalation in this concrete turn suppresses both kinds before publication.
  Successful resumed answers carry the same allowlisted widget in their pushed message.
  No choices are inferred from model text, and old/thread-switched/human-handled controls are disabled.

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
