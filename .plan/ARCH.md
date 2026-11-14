# Architecture

## TLDR

One Next.js process (`app/`) runs a three-agent support system on the OpenAI Agents SDK
for JS, streams chat through the Vercel AI SDK, and keeps all state in memory. Code, not
the prompt, enforces the hard rules (identity, refund limits, escalation, masking). A
human approves risky actions in a consultant console. An eval suite and a browser smoke
test are the acceptance gate. Decisions are in [ADR/](ADR/); this file is the living
overview and is updated when the architecture changes.

Related: [VISION.md](VISION.md), [PURPOSE.md](PURPOSE.md), [STATE.md](STATE.md),
[BACKLOG.md](BACKLOG.md), [JOURNAL.md](JOURNAL.md), [handoffs/](handoffs/).

## Decisions (ADR index)

| ADR | Decision | Status |
|---|---|---|
| [001](ADR/001-typescript-agents-sdk-vercel-ai-sdk.md) | TypeScript end to end; Agents SDK JS; Vercel AI SDK chat, not ChatKit | accepted |
| [002](ADR/002-model-choice.md) | `gpt-4.1` agents, `gpt-6-luna` guardrails; eval-driven | accepted |
| [003](ADR/003-business-rules-in-tool-code.md) | Business rules in tool code, not in the prompt | accepted |
| [004](ADR/004-human-in-the-loop.md) | `needsApproval` + serialized `RunState`; decisions only in the console | accepted |
| [005](ADR/005-thread-credential-and-event-channels.md) | Signed thread cookie; customer vs inspector channels | accepted |
| [006](ADR/006-sensitive-data-secure-forms.md) | Sensitive data via secure forms; masking | accepted |
| [007](ADR/007-escalation-in-code.md) | Escalation enforced in code | accepted |
| [008](ADR/008-single-page-with-tabs.md) | One page, three tabs | accepted |
| [009](ADR/009-in-memory-state-with-caps.md) | In-memory state with global caps | accepted (demo scope) |
| [010](ADR/010-eval-and-smoke-as-acceptance-gate.md) | Eval suite and browser smoke as acceptance gate | accepted |
| [011](ADR/011-hosting-and-public-demo.md) | Single-process hosting and request-local BYOK | accepted |
| [012](ADR/012-opt-in-developer-annotations.md) | Lazy opt-in developer feedback, manual copy mode | accepted |

## Components

| Area | Where | Notes |
|---|---|---|
| Agents | `app/lib/agents/` | Triage, FAQ, Orders & Refunds. Handoffs built with `handoff()` and an `onHandoff` hook (`handoff-context.ts`). Prompts in `prompts.ts`. |
| Tools | `app/lib/tools/` | Order, refund, claim, address, secure-form, verify-customer, KB search, escalation. Rules live in the tool code. |
| Guardrails | `app/lib/guardrails/` | `normalize-input.ts` (before the run), `input-guardrails.ts` (jailbreak, relevance on Triage), `leak-guardrail.ts` (output, on every agent), `pii.ts`. |
| Runtime | `app/lib/runtime/` | Turn orchestration (`turn.ts`), run execution and tracing (`run-support.ts`), approvals (`approvals.ts`, `pending-runs.ts`), threads, takeover, tickets, event bus, SSE, history cap. |
| Security | `app/lib/security/` | HMAC thread credential, thread access checks, constant-time compare. |
| Sensitive data | `app/lib/sensitive/` | IBAN and phone validation, masking, in-memory vault. |
| Escalation | `app/lib/escalation/` | `rules.ts` is a pure function; `notices.ts` holds the customer text. |
| Guest mode | `app/lib/guest/` | Order number + e-mail verification with attempt limits. |
| Claims, address | `app/lib/claims/`, `app/lib/address/`, `app/lib/slots/` | Slot filling with zod schema; address change that needs a Confirm click. |
| Knowledge base | `app/lib/kb/`, `app/data/kb/` | Embeddings cached on disk plus keyword score. Public articles also populate a shared source-chip/dialog provider from the server page; no article fetch endpoint or model URL. |
| Consultant console | `app/lib/admin/`, `app/components/admin/`, `app/proxy.ts` | Queue, approvals, audit log, takeover, ratings export, metrics. |
| Browser side | `app/lib/client/`, `app/components/` | `useChat` session hook, thread channel hooks, Agent View panel, workspace tabs. |
| Evals | `app/lib/eval/`, `app/scripts/eval.ts`, `app/data/scenarios.json` | Current fixture catalog against the real agents; see the [generated scenario table](../README.md#scenario-catalog). |
| Smoke scripts | `scripts/` | Playwright flows against a running app. |

## One turn, step by step

Entry: `POST /api/chat` ([app/app/api/chat/route.ts](../app/app/api/chat/route.ts))
calls `handleUserMessage` in [app/lib/runtime/turn.ts](../app/lib/runtime/turn.ts).

1. **Thread check.** The thread is found by id and must belong to the session's customer.
   The server stores the history; the browser sends only the new message.
2. **Normalize input.** Strip signatures, quoted mail, invisible characters; cap length;
   mask card, IBAN and phone numbers. The panel shows what was cleaned (masked).
   A widget click (order picker) is validated here and written into the context by code.
3. **Takeover check.** If a consultant has taken over, the message goes to the consultant
   and no model runs.
4. **Address click.** A Confirm or Cancel click on an address card is applied by code.
5. **Escalation rules.** `decideEscalation` opens a ticket on a human request, legal or
   GDPR wording, with no model call.
6. **Input guardrails.** Jailbreak and relevance classifiers (small model) run on Triage.
   A tripwire gives a specific refusal and a red card in the Agent View.
7. **Triage and handoffs.** Triage hands off to FAQ or Orders & Refunds. The `onHandoff`
   hook validates the order id from the model and writes it into the run context.
8. **Tools with code-enforced rules.** Identity comes from the run context; ownership,
   amounts and the return window are re-checked in `execute`.
9. **Approval pause and resume.** A refund above the threshold pauses the run. The
   `RunState` is serialized and kept in memory. A consultant decides in the console; the
   run resumes and the answer is pushed to the customer over SSE.
10. **Output guardrail.** `leakGuardrail` blocks prompt text, other customers' data, card
    numbers and similar in the answer.
11. **Reply.** Text and typed data parts (widgets) stream through the AI SDK. History and
    transcript are stored. Panel events go to the inspector channel.

Every error reaches the UI with its type and message, not a generic failure text.

## Refund lifecycle

Refund records start at `pending_payout`: creation reserves the amount but transfers no money.
The Orders agent's `cancel_refund` checks session/order/refund ownership and cancels only before
payout, without human approval or an external payment call. Replays report an already-cancelled
state; ambiguous refunds require a choice. Paid refunds never reverse. Cancelled records remain
stored but are excluded from the refundable-limit calculation. Paid state is available in eval
fixtures; there is no payment processor or model-facing payout operation. See [ADR 003](ADR/003-business-rules-in-tool-code.md).

## Public-demo model access

PUBLIC_DEMO=true obtains model credentials solely from the x-openai-key header.
security/request-key.ts scopes credentials with AsyncLocalStorage outside RunState;
runtime/model-access.ts creates isolated runners and embedding clients. Nested classifiers
use the same scope. Tracing is disabled. Consultant approvals require that action's key
before recording the decision. Browser keys stay in tab memory. Public rate limits protect
chat, uploads and thread creation. Rule-based starters work without model access.
See [ADR 011](ADR/011-hosting-and-public-demo.md).

## Public console ownership

In public mode, admin/visitor-access.ts reuses the visitor's existing signed per-thread cookies.
State collections, metric inputs and rating exports include only accessible threads. Transcript,
inspector replay and all consultant actions check the same capability before reads or writes;
approval IDs are resolved to their owning thread first. No new session store or cookie is added.
ADMIN_PASSWORD is optional in public mode and never widens scope. Local staff mode is unchanged.
Global public reset additionally needs an operator password; no-store headers protect JSON exports.
See the updated [ADR 011](ADR/011-hosting-and-public-demo.md).

## Channels

| Channel | Route | Carries | Protection |
|---|---|---|---|
| Customer chat stream | `/api/chat` response | Text, widgets | Thread cookie |
| Customer SSE | `/api/threads/[threadId]/stream` | Consultant replies, takeover state, widgets | Thread cookie + customer allowlist |
| Inspector SSE | `/api/admin/inspector/[threadId]/stream` | Every event: tool args, KB hits, guardrail reasoning, trace ids | Console auth (`ADMIN_PASSWORD`) |

Allowlist: [app/lib/runtime/event-visibility.ts](../app/lib/runtime/event-visibility.ts)
(a `Record` over every event kind, so a new kind does not compile until it is classified).
The thread cookie is HMAC-signed, httpOnly, `SameSite=Strict`
([app/lib/security/thread-credential.ts](../app/lib/security/thread-credential.ts)).
A new SSE subscriber first receives the thread's earlier events from the event log.
See [ADR 005](ADR/005-thread-credential-and-event-channels.md).

## Consultant console

Tab "Consultant" on the main page (`/admin` redirects to `/?tab=consultant`). Lists
escalation tickets and pending approvals, shows the transcript, lets a consultant take
over, reply and hand back, writes an audit record per approval, rates answers and exports
ratings as eval scenarios. Admin APIs sit under `/api/admin/*` behind
[app/proxy.ts](../app/proxy.ts) (Basic auth when `ADMIN_PASSWORD` is set, Origin check on
POST). See [ADR 004](ADR/004-human-in-the-loop.md).

## Knowledge-base search

`search_kb` embeds KB chunks with `text-embedding-3-small`, caches vectors in
`.cache/kb-embeddings.json` keyed by content hash, and combines cosine similarity with a
keyword score ([app/lib/kb/search.ts](../app/lib/kb/search.ts), `scoring.ts`). A German
query finds the English article. Hits show in the Agent View. Open issue: Polish retrieval
ranks `refund-policy` above `returns-policy` for some queries.

## Secure forms, guest mode, claims, address

- **Secure forms.** IBAN and phone are typed into a form that posts to a server route, not
  into the chat. The model gets a status such as `IBAN_PROVIDED (last 4: 2874)`.
  [ADR 006](ADR/006-sensitive-data-secure-forms.md).
- **Guest mode.** No order data until `verify_customer` succeeds with order number and
  e-mail. Three attempts per thread, five per order per hour.
- **Claims.** Slot filling; the claim exists only when the whole draft passes a zod schema.
- **Address change.** Old vs new card; the change applies only on a Confirm click with a
  fresh proposal id.

## In-memory state and caps

All state is in process memory: threads, transcripts, pending runs, tickets, audit, photos,
vault, event log. Caps: 100 threads (oldest evicted, never one with a pending approval),
50 photos, 100 vault entries, 1000 tracked guest orders, 5000 logged events. A restart
loses everything. See [ADR 009](ADR/009-in-memory-state-with-caps.md).

## Eval suite and smoke

`just eval` runs the current [scenario catalog](../app/data/scenarios.json) against the real agents and prints a pass/fail table
(needs `OPENAI_API_KEY`, costs money). `scripts/smoke-*.mjs` drive a running app with
Playwright. Unit tests (vitest, no network) run in `just check`. Both gates must pass
before a model or provider change is accepted. See
[ADR 010](ADR/010-eval-and-smoke-as-acceptance-gate.md).

## Models

Defaults in [app/lib/config.ts](../app/lib/config.ts): agents `gpt-4.1`, guardrails
`gpt-6-luna`, embeddings `text-embedding-3-small`. The accepted switch passed 38/38 eval
with the code defaults ([backlog](backlog/switch-guardrail-model-to-luna.md)).
Override with `OPENAI_MODEL` and `OPENAI_GUARDRAIL_MODEL`. `modelSettingsFor` sets reasoning effort only for `gpt-5` models.
See [ADR 002](ADR/002-model-choice.md).

## Hosting

Run locally with `just dev`. A process manager may serve `next start` after `just build`;
restart it after rebuilding. Public deployments use one Docker instance, HTTPS and BYOK.
See [ADR 011](ADR/011-hosting-and-public-demo.md) and the [README](../README.md#deploy-your-own).

## Architecture impact log

One line per change that touches the architecture. Newest at the bottom. Add the ADR link
when there is one.

| Date | Change | Impact | ADR |
|---|---|---|---|
| 2026-11-09 | TypeScript stack chosen; chat on Vercel AI SDK | Whole stack | [001](ADR/001-typescript-agents-sdk-vercel-ai-sdk.md) |
| 2026-11-09 | Rules moved into tool code; handoff hook | Tools, agents | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-09 | Consultant console, takeover, approvals moved out of customer browser, escalation in code | Runtime, admin | [004](ADR/004-human-in-the-loop.md), [007](ADR/007-escalation-in-code.md) |
| 2026-11-09 | Thread credential and two event channels; secure forms and masking | Security | [005](ADR/005-thread-credential-and-event-channels.md), [006](ADR/006-sensitive-data-secure-forms.md) |
| 2026-11-09 | Global caps on threads, photos, vault; eviction skips pending approvals | State | [009](ADR/009-in-memory-state-with-caps.md) |
| 2026-11-09 | Single page with tabs; `/admin` redirects | UI | [008](ADR/008-single-page-with-tabs.md) |
| 2026-11-10 | Model comparison; agents keep `gpt-4.1`, guardrails move to `gpt-6-luna` (implemented; 38/38 eval) | Config | [002](ADR/002-model-choice.md) |
| 2026-11-10 | `.plan/` added and tracked; hosting proposal opened | Docs | [011](ADR/011-hosting-and-public-demo.md) |
| 2026-11-10 | Design review implemented; deterministic customer-visible rule replies carry agent role in consultant transcript | Presentation and transcript semantics; no API/schema/auth changes | [008](ADR/008-single-page-with-tabs.md), [H07 report](handoffs/H07-design-review-implementation-report.md) |
| 2026-11-10 | Optional Agentation mount shares browser opt-in state with header Settings; no endpoint | Client-only developer feedback; absent from default page load | [012](ADR/012-opt-in-developer-annotations.md) |
| 2026-11-11 | Request-local visitor clients, disabled tracing, key UI and public limits | Model access, transports and redacted event/storage boundaries | [011](ADR/011-hosting-and-public-demo.md) |
| 2026-11-11 | Public console filtered by signed conversation cookies; optional public admin password | State, metrics, inspector, exports and consultant actions isolated between browsers | [011](ADR/011-hosting-and-public-demo.md) |
| 2026-11-11 | Orders declare a trusted delivery country; address proposal and Confirm share country/postal-code validation | Address rules reject foreign destinations and invalid stored proposals without model authority | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-11 | Refund lifecycle and owner-only cancellation before payout | Cancelled amounts no longer consume the refundable limit; paid amounts cannot be reversed | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-11 | First consultant reply validates and takes over through one admin action; drafts bound to thread and consultant | Composer replaces header takeover buttons; selected-thread guards prevent stale text/actions during navigation | [004](ADR/004-human-in-the-loop.md) |
| 2026-11-11 | Private hand-back instruction stored on its thread and rehydrated into fresh/resumed run context | Inspector/admin display only; customer transports filter the note, output leak checks cover it, and code rules retain authority | [004](ADR/004-human-in-the-loop.md), [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-11 | Server tone warning before both staff reply actions, with explicit text/owner/thread-bound resend | First warning has no takeover/customer effects; private one-use acknowledgement and existing audit store track the decision | [004](ADR/004-human-in-the-loop.md) |
| 2026-11-11 | Customer & order panel reuses the guarded admin thread read with server-derived profile and selected order | Explicit fixture default address stays distinct from current delivery; guests and foreign cookies disclose no customer/order projection | [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-11 | Run log groups masked customer turns and preserves origin across approval pause/resume | Async event scope supplies inspector-only turn metadata; unknown origins use Conversation updates and customer event projection strips correlation | [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-11 | Explicit tool-created customer quick replies with one current offer per thread | Cookie/nonce/turn validation, deterministic decline and ordinary guarded refund-confirmation path; same widgets on normal/pushed answers | [003](ADR/003-business-rules-in-tool-code.md), [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-11 | Bundled catalog thumbnails shared by order picker, selected order and consultant summary | Owned picker rows add product names, never image URLs; exact client mapping selects local WebP files, with a fixed-size fallback. Docker standalone copies public assets. No identity or access-rule change. | [005](ADR/005-thread-credential-and-event-channels.md), [media sources](../docs/media/README.md) |
| 2026-11-11 | Scenario follow-ups become thread/scenario/turn-bound composer suggestions | Local cancellable typing and explicit Send; manual edits survive, reduced motion skips animation, stale thread creation cannot replace a newer selection. No new endpoint or business authority. | [008](ADR/008-single-page-with-tabs.md) |
| 2026-11-14 | Explicit AI/human/system message provenance in turn results, customer transport and transcript | Shared receipt/speech renderer distinguishes guarded model output, fixed code and consultant replies; mixed outputs stay separate. | [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-14 | Conversation state invokes the existing quick-reply action after successful guarded runs | Customer refund requests and KB flow no longer rely on model tool selection; current-offer nonce, ownership, decline and approval rules remain. | [003](ADR/003-business-rules-in-tool-code.md), [005](ADR/005-thread-credential-and-event-channels.md) |
| 2026-11-14 | Claim photo offers are one-shot; address proposal collection is retry-safe | Declined/repeated photo prompts no longer impose another stop; identical address collection retains the validated card while changes require a new nonce and Confirm. | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-14 | Explicit confirmed business requests select an existing SDK tool once; private task guidance has separate leak checks | Entry/output guards and refund approval remain; useful task questions no longer count as system-prompt excerpts. | [003](ADR/003-business-rules-in-tool-code.md), [004](ADR/004-human-in-the-loop.md) |
| 2026-11-14 | A confirmed complete damage-claim draft is filed by a selected `submit_claim` call | The claim no longer depends on triage or the model before a refund turn. | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-14 | An address change in progress is continued by the Orders agent (no forced tool); an empty model reply becomes a system line from this turn's tool output (`lib/runtime/empty-reply.ts`) | The customer can leave the flow, and never sees a blank bubble or an old card. | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-14 | A message naming the customer's own order number goes to the Orders agent in code (no forced tool, no existence leak) | Triage no longer answers order questions without tools. | [003](ADR/003-business-rules-in-tool-code.md) |
| 2026-11-14 | A promise to check or wait with no tool call is replaced by a system line (`lib/runtime/empty-reply.ts`, `isDeadPromise`) | No dead "please wait a moment" is left in the chat or the history. | [003](ADR/003-business-rules-in-tool-code.md) |
