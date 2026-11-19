# 001 — TypeScript end to end, Agents SDK JS, chat on Vercel AI SDK

## TLDR

Build everything in TypeScript with the OpenAI Agents SDK for JS. Build the chat on the
Vercel AI SDK, not ChatKit, because ChatKit's self-hosted server SDK exists only for Python.

- **Status:** accepted
- **Date:** 2026-11-09

## Context

The reference demo ([openai/openai-cs-agents-demo](https://github.com/openai/openai-cs-agents-demo))
has a Python backend and a Next.js UI that embeds ChatKit. The owner wants a TypeScript
reference ([VISION.md](../VISION.md)). ChatKit needs a server that speaks its protocol;
OpenAI ships that server SDK for Python only. A TypeScript port exists, but it is unofficial.

## Options considered

1. **Keep the Python backend, TS UI.** Closest to the original. Two languages, two
   processes, and it does not fill the TypeScript gap.
2. **TypeScript with ChatKit via an unofficial port.** Keeps the hosted chat widget. Depends
   on a community port and on a ChatKit domain key.
3. **TypeScript with Agents SDK JS and Vercel AI SDK (`ai`, `@ai-sdk/react` `useChat`).**
   Official SDKs on both sides. We build the chat window ourselves and port the Agent View
   panels as plain React.

## Decision

Option 3. One Next.js process. The chat route returns a UI message stream that carries text
deltas and typed data parts, so one stream feeds the chat and the widgets.

## Consequences

- No dependency on ChatKit or a domain key. The chat is ours to change (widgets, takeover).
- We maintain the chat UI ourselves.
- Agent View components are adapted from the OpenAI demo (MIT); attribution is in `NOTICE`.
- A Python reader cannot reuse the original server, which is the point of the project.

## Evidence

- [JOURNAL.md](../JOURNAL.md), entry 2026-11-09 "Decision: TypeScript end to end".
- [docs/BUILD-v1.md](../../docs/BUILD-v1.md), "Stack".
- [research/2026-11-09-parity-and-prior-art.md](../../research/2026-11-09-parity-and-prior-art.md), section 1c (#24).
- Route: [app/app/api/chat/route.ts](../../app/app/api/chat/route.ts).
