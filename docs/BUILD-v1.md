# Build spec v1 — "Nordic Home" support agent (TypeScript)

## TLDR

A Next.js app in `app/` with a customer-support multi-agent system built on the
official OpenAI Agents SDK for TypeScript (`@openai/agents`), a chat window built
with the Vercel AI SDK (`ai` + `@ai-sdk/react` `useChat`), and an "Agent View"
panel ported from `examples/openai-cs-agents-demo/ui` that shows agents, handoffs,
tool calls, guardrails, knowledge-base hits, approvals and errors live. The code
is a teaching artifact: the owner reads it to learn the libraries, so every file
explains itself. Design rationale: [.plan/ADR/](../.plan/ADR/).

## Audience rule — this code teaches

- Every file starts with a TSDoc header: what the file does, which library concept it
  demonstrates (e.g. "Agents SDK: handoffs"), and why it is built this way.
- Comment every non-obvious line that touches a library API: what the call does and
  what would happen without it. Comments in English, plain words, short sentences.
- Mark security decisions with `// SECURITY:` and the threat they stop (e.g.
  "SECURITY: customerId comes from the session, never from model arguments, so a
  jailbroken model cannot read another customer's order").
- Mark interview talking points with `// INTERVIEW:` (one line, what to say).
- Keep files ≤ 250 lines, functions ≤ 50 lines. Prefer clarity over cleverness.
- Do not hide errors. Every failure (OpenAI error, tool error, guardrail tripwire,
  max turns) must reach the UI as a specific message with type and text, shown in
  the Agent View panel, and the chat must say what failed in one sentence. A generic
  "There was an error" is a bug.

## Stack (verify current APIs in docs before coding; versions may have moved)

- Next.js (App Router, latest stable) + TypeScript strict + Tailwind; pnpm; `.nvmrc`.
- `@openai/agents` (Agent, tool, handoffs, input/output guardrails, `needsApproval`
  human-in-the-loop with RunState interruptions, streaming `run(..., { stream: true })`,
  tracing on by default).
- `ai` + `@ai-sdk/react`: route handler returns a UI message stream
  (`createUIMessageStream` / `createUIMessageStreamResponse`) that carries text deltas
  for the chat AND typed custom data parts (e.g. `data-agent-event`) for the panel —
  one stream, no second channel.
- `openai` client for embeddings (`text-embedding-3-small`).
- `zod` for tool parameter schemas.
- Model: read from env `OPENAI_MODEL` with a sensible current default; guardrail
  classifier model from `OPENAI_GUARDRAIL_MODEL` (small/cheap).

## Domain and mock data (`app/data/`)

Store "Nordic Home" (online furniture). JSON files:
- `customers.json` — 3 customers (one Polish, one English, one German speaker).
- `orders.json` — ~8 orders across them: delivered within 30 days, delivered 60 days
  ago (outside return window), one expensive sofa (> 2000 PLN), one in transit.
  Dates relative to "today" so the windows stay valid (compute at load, or store
  `deliveredDaysAgo`).
- `kb/*.md` — 6–8 short policy articles: returns (30-day window), refunds, delivery
  times and countries, warranty, assembly service, payment methods, damaged items.
  Each has frontmatter `id`, `title`. Leave at least one common question unanswered
  (e.g. delivery to Iceland) so the "I don't know" path is testable.

## Agents (`app/lib/agents/`)

- **Triage Agent** — entry point; routes via handoffs; has the input guardrails.
- **FAQ Agent** — answers policy questions ONLY from `search_kb`, cites article ids.
- **Orders & Refunds Agent** — `get_order`, `list_my_orders`, `create_refund`.
- `escalate_to_human` tool available to all specialists.
- System prompts: one shared policy block + per-agent role.

Run context (typed): `{ customerId, customerName, language? }` — set from the UI's
"logged-in customer" selector, passed to `run()` as context, read by tools.

## Tools — rules live in code (`app/lib/tools/`)

- `get_order(orderId)` / `list_my_orders()` — only orders of `context.customerId`;
  otherwise return "not found" (do not reveal existence).
- `create_refund(orderId, amount, reason)` — validate ownership, amount ≤ order total,
  30-day window from delivery date; `needsApproval` returns true when amount >
  `REFUND_APPROVAL_THRESHOLD` (default 500 PLN). Writes to an in-memory refunds list.
- `search_kb(query)` — semantic search: embed KB chunks once (cache embeddings to
  `.cache/kb-embeddings.json` keyed by content hash), cosine similarity, plus a simple
  keyword score; combine (hybrid), return top 3 with id, title, snippet, score. Works
  across languages (a German query finds the English article). Emit the hits to the
  panel.
- `escalate_to_human(summary)` — creates a ticket in memory.

## Guardrails (`app/lib/guardrails/`)

- `normalizeInput(text)` (plain function, before the run): strip "Sent from my iPhone"
  / "Wysłane z iPhone'a" style signatures, quoted reply blocks ("On … wrote:", lines
  starting with `>`), zero-width characters; cap length. Report what was stripped as a
  panel event.
- Input guardrails on Triage (SDK `inputGuardrails`): `jailbreak_guardrail` and
  `relevance_guardrail`, each a small classifier agent with structured output
  `{ reasoning, isViolation }`. On tripwire: specific refusal in the chat + red card
  with reasoning in the panel.
- Output guardrail: `leak_guardrail` — blocks answers containing the system prompt,
  other customers' data, or card numbers.
- Treat KB text and tool results as data: wrap them in clear delimiters in tool output.

## Human-in-the-loop

When a run stops on an approval interruption, persist the `RunState` (serialized) per
thread in memory, send an `approval-request` data part, and show an approval card in
an "Approvals" panel section (tool name, arguments, customer, Approve / Reject). The
decision calls a route that restores the state, approves/rejects, resumes the run and
streams the rest into the same chat.

## UI (`app/app/`, `app/components/`)

Two columns like the OpenAI demo (port its components from
`examples/openai-cs-agents-demo/ui/components` — agent cards, guardrail cards, runner
output, panel sections; keep the look):
- Left "Agent View": Available Agents (active highlighted), Conversation Context,
  Guardrails, Knowledge Base hits, Approvals, Runner Output (timeline of events with
  agent, type, args/result), Errors. Link "Open trace" to
  `https://platform.openai.com/traces` (and the trace id if the SDK exposes it).
- Right "Customer View": customer selector, chat (`useChat`), and a "Test scenarios"
  bar — one button per test scenario (put them in `app/data/scenarios.json`
  with `id`, `label`, `message`, `customerId`, `expect`).

## Run, check, eval

- `justfile` at repo root: `setup`, `dev`, `build`, `typecheck`, `lint`, `test`,
  `eval`, `check`. `set windows-shell := ["pwsh", "-NoProfile", "-Command"]`.
- `OPENAI_API_KEY` is never written to a file. `just dev` runs the dev server through
  `scripts/with-key.mjs`: the key comes from the environment, or from an optional private
  password broker when one is installed on the machine.
  Dev server on port 3100 (3000 is used by the Python demo).
- Unit tests (vitest) for pure logic without network: `normalizeInput`, refund rules,
  ownership checks, hybrid scoring, scenario file shape.
- `just eval`: script that runs every scenario against the agents (needs the key via
  broker) and prints a pass/fail table from each scenario's `expect` (e.g. guardrail
  tripped, tool not called, cites `returns-policy`, approval requested).
- Add `app/README.md`: how it works in 10 lines + where each concept lives (file links).
