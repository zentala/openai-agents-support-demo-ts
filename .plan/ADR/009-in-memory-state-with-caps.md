# 009 — In-memory state with global caps

## TLDR

All state lives in process memory with fixed global caps. This is enough for a demo and keeps
the code small. A production system needs persistence.

- **Status:** accepted (demo scope)
- **Date:** 2026-11-09

## Context

The demo needs threads, transcripts, paused runs, tickets, audit records, photos and a vault.
A database would add setup cost for every reader and hide the SDK concepts.

## Options considered

1. **Database (Postgres, SQLite).** Durable; more setup and more code.
2. **In-memory maps on `globalThis`, with caps.**
3. **Redis or Durable Objects.** Relevant for hosting, see [ADR 011](011-hosting-and-public-demo.md).

## Decision

Option 2. Maps hang on `globalThis` so they survive Next.js module reloads. Caps:

- `MAX_THREADS = 100`: evict the oldest created thread, never one with a pending approval;
  if all are protected, creation returns HTTP 429.
- `MAX_PHOTOS_TOTAL = 50` (2 MiB each): refuse new photos.
- `MAX_VAULT_ENTRIES = 100` and 6 submissions per thread: refuse new entries.
- 1000 tracked guest order numbers; 5000 logged events.

## Consequences

- A restart loses conversations, pending approvals, tickets and audit.
- Caps bound memory but are not request rate limits. Public hosting needs rate limits.
- Photos and vault entries are not freed by thread eviction; they stay until reset or restart.
- Scaling to several processes breaks the model (state is per process).

## Evidence

- [app/lib/runtime/threads.ts](../../app/lib/runtime/threads.ts),
  [app/lib/data/store.ts](../../app/lib/data/store.ts),
  [app/lib/sensitive/vault.ts](../../app/lib/sensitive/vault.ts),
  [app/lib/runtime/event-bus.ts](../../app/lib/runtime/event-bus.ts).
- [JOURNAL.md](../JOURNAL.md): "H01 fixes: D7". README "Demo limits".
