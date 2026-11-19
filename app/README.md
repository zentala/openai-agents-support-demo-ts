# Nordic Home support agent (app)

## TLDR

A multi-agent customer-support demo. The agents run on the OpenAI Agents SDK
(`@openai/agents`), the chat uses the Vercel AI SDK (`ai` + `@ai-sdk/react`), and the
left workspace has Agent, Consultant and How it works tabs. Read the code in the order
of the table below. Spec: [../docs/BUILD-v1.md](../docs/BUILD-v1.md).

## Run it

```
just setup      # install dependencies
just dev        # http://127.0.0.1:3100 (needs OPENAI_API_KEY in the environment or in app/.env.local)
just check      # typecheck + lint + unit tests (no network)
just eval       # run the current scenario catalog against the real agents, print a table
```

Without `just`: `corepack pnpm dev`, `corepack pnpm test`, `corepack pnpm eval` inside this folder.

The complete fixture list is the [generated scenario catalog](../README.md#scenario-catalog).

## How it works in 10 lines

1. The browser asks the server for a conversation (`POST /api/threads`, answered with a signed httpOnly cookie), then sends only the new message to `/api/chat`.
2. The server loads the stored conversation and builds the run context (`customerId` comes from it, not from the request).
3. `normalizeInput` strips signatures, quoted replies and invisible characters, and masks card numbers, bank accounts and phone numbers.
4. The Triage Agent starts; two input guardrails (small classifier models) run in parallel.
5. Triage hands off to the FAQ Agent (`search_kb`) or the Orders & Refunds Agent (order and refund tools).
6. Tools enforce the rules in code: ownership, amount cap, 30-day window, approval threshold.
7. A refund above the threshold pauses the run; the state is saved and the request waits in the Consultant tab (`/?tab=consultant`; `/admin` redirects there).
8. A consultant approves or rejects (recorded in the audit log); the same run resumes and its answer is pushed to the customer chat over SSE.
9. An output guardrail checks the final answer before the customer sees it.
10. Every step is sent as a typed data part in the same stream and drawn in the Agent View.

Before step 4 the server also checks two things in code: is a consultant in charge of this conversation (then the
agent stays silent), and do the escalation rules fire (legal/GDPR words, request for a human, repeated trips).

## Where each concept lives

| Concept | File |
|---|---|
| System prompt (shared policy + role per agent) | [lib/agents/prompts.ts](lib/agents/prompts.ts) |
| Agents, handoffs, least privilege | [lib/agents/index.ts](lib/agents/index.ts) |
| Tools with zod schemas, ownership | [lib/tools/orders.ts](lib/tools/orders.ts) |
| Refund rules (pure) and human approval | [lib/tools/refund-rules.ts](lib/tools/refund-rules.ts), [lib/tools/refund.ts](lib/tools/refund.ts) |
| Knowledge-base search (embeddings + keywords) | [lib/kb/search.ts](lib/kb/search.ts), [lib/kb/scoring.ts](lib/kb/scoring.ts) |
| Input cleanup | [lib/guardrails/normalize-input.ts](lib/guardrails/normalize-input.ts) |
| Input guardrails (classifier agents) | [lib/guardrails/input-guardrails.ts](lib/guardrails/input-guardrails.ts) |
| Output guardrail | [lib/guardrails/leak-guardrail.ts](lib/guardrails/leak-guardrail.ts), [lib/guardrails/leak-detect.ts](lib/guardrails/leak-detect.ts) |
| Streaming run, tracing, errors | [lib/runtime/run-support.ts](lib/runtime/run-support.ts), [lib/runtime/errors.ts](lib/runtime/errors.ts) |
| Pause and resume (RunState) | [lib/runtime/approvals.ts](lib/runtime/approvals.ts), [lib/runtime/turn.ts](lib/runtime/turn.ts) |
| Escalation rules, tickets, takeover | [lib/escalation/rules.ts](lib/escalation/rules.ts), [lib/runtime/tickets.ts](lib/runtime/tickets.ts), [lib/runtime/takeover.ts](lib/runtime/takeover.ts) |
| Workspace tabs, consultant queue and explainer | [components/workspace.tsx](components/workspace.tsx), [components/admin/consultant-panel.tsx](components/admin/consultant-panel.tsx), [components/how-it-works.tsx](components/how-it-works.tsx) |
| Latest-turn narrative selector | [lib/client/turn-trace.ts](lib/client/turn-trace.ts) |
| Consultant auth, audit, ratings | [proxy.ts](proxy.ts), [lib/admin/](lib/admin/) |
| Conversation credential, customer vs inspector channel | [lib/security/thread-credential.ts](lib/security/thread-credential.ts), [lib/runtime/event-visibility.ts](lib/runtime/event-visibility.ts), [lib/runtime/sse.ts](lib/runtime/sse.ts) |
| Slot filling and the damage claim | [lib/slots/slots.ts](lib/slots/slots.ts), [lib/claims/](lib/claims/), [lib/tools/claim.ts](lib/tools/claim.ts) |
| Secure forms (IBAN, phone) and masking | [lib/sensitive/](lib/sensitive/), [lib/tools/secure-forms.ts](lib/tools/secure-forms.ts), [lib/runtime/secure-form-notice.ts](lib/runtime/secure-form-notice.ts) |
| Guest verification | [lib/guest/verification.ts](lib/guest/verification.ts), [lib/tools/verify-customer.ts](lib/tools/verify-customer.ts) |
| Address change with a confirmation card | [lib/address/](lib/address/), [lib/tools/address.ts](lib/tools/address.ts) |
| AI SDK stream with data parts | [app/api/chat/route.ts](app/api/chat/route.ts) |
| `useChat` and `onData` | [lib/client/use-support-session.ts](lib/client/use-support-session.ts) |
| Agent View panel | [components/agent-panel.tsx](components/agent-panel.tsx) |
| Scenarios and eval | [data/scenarios.json](data/scenarios.json), [lib/eval/checks.ts](lib/eval/checks.ts), [scripts/eval.ts](scripts/eval.ts) |

Markers in the code: `// SECURITY:` names the threat a line stops, `// INTERVIEW:` is a talking point.

## Good to know

- Text is delivered after the output guardrail passed, so the answer appears at once instead of token by token.
  Panel events do stream live.
- Refunds and tickets live in server memory. Use "Reset demo data" (or restart) to replay scenarios.
- Approvals are decided in `/admin`, behind an optional shared password (`ADMIN_PASSWORD`). Real products need per-person login and roles.
- Scenario results come from a real model, so a borderline scenario can flip between runs.
