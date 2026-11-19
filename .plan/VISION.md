# Vision

## TLDR

Deliver a TypeScript reference version of a multi-agent customer-support agent, with
guardrails, human-in-the-loop, evals and full visibility into what the agents do.
Publish the code as a repository and run a public demo next to it. Why the owner
builds it: [PURPOSE.md](PURPOSE.md).

## What we build

A customer-support agent that a developer can read, run and learn from.

- **TypeScript end to end.** One language and one Next.js process, from the agents
  to the chat window.
- **Inspired by [openai/openai-cs-agents-demo](https://github.com/openai/openai-cs-agents-demo).**
  That demo is Python. Its ChatKit server is Python-only, so a TypeScript developer
  cannot reuse it. We keep the idea (triage, specialists, handoffs, an "Agent View"
  that shows the inside) and rebuild it on the OpenAI Agents SDK for JS and the Vercel AI SDK.
- **More than a chat.** Guardrails on input and output, human approval for risky
  actions, a consultant console, secure handling of sensitive data, and an eval suite
  that proves the agents still work after each change.
- **Visible.** The owner and any reader can watch handoffs, tool calls, guardrail
  trips, knowledge-base hits and approvals while the agent works.

## The gap

A prior-art search on 2026-11-09 found no public TypeScript demo with this feature
set: multi-agent handoffs, an inside view, input and output guardrails, human
approval, retrieval and evals. Official JS examples are CLI scripts or a minimal
approval flow. The rich demo is in Python.

**Caveat: the search was limited** (web search only, no GitHub API sweep). "Found
none" is not "none exists". It must be re-checked before publication. See the
backlog item [prior-art-recheck-before-publication](backlog/prior-art-recheck-before-publication.md)
and the source [research/2026-11-09-parity-and-prior-art.md](../research/2026-11-09-parity-and-prior-art.md).

## Delivery

- Publish the **repository** (MIT, with attribution to OpenAI for the adapted UI).
- Publish a **public demo** that anyone can open. Owner direction, 2026-11-11: free container hosting, visitor OpenAI keys,
  sleep/state resets acceptable, owner machines private: [ADR 011](ADR/011-hosting-and-public-demo.md).
- Planning is part of the showcase: this `.plan/` folder is tracked on purpose.

## Not the goal

- A production support product. The state is in memory; the login is a dropdown.
  The README says so.
- A framework other people depend on. It is an example to copy from.
