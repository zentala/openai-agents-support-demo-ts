# 011 — Single-process hosting and visitor-funded public demo

- **Status:** ACCEPTED
- **Date:** 2026-11-11
- **Scope:** [H09](../handoffs/H09-public-demo-byok-and-publication-prep.md), serving the public reference-demo [vision](../VISION.md).

## Decision

Use one long-lived Node process on a container host. Render free is the initial template;
sleep, cold starts and state loss are acceptable. The owner's machines remain private.
Static and multiple/serverless instances cannot preserve process-local conversations and SSE.

`PUBLIC_DEMO=true` requires a visitor key for every model invocation. Deterministic rules,
address clicks and human takeover remain available without a key. There is no fallback to
server `OPENAI_API_KEY`, even when configured. Local mode retains environment-key behavior.

## Key lifecycle

- The password input keeps the key in React memory for this tab. Clear and reload erase it.
  No localStorage, sessionStorage, cookies or URLs receive it.
- Chat and consultant action POSTs send `x-openai-key` over HTTPS. SSE carries no key.
- AsyncLocalStorage scopes each request outside serializable agent context. Each runner gets
  a fresh OpenAIProvider with an explicit client. Classifiers and embeddings use this scope.
  No shared clients, global credential mutation, or credentials saved with paused RunState.
- Visitor clients pin the official OpenAI endpoint and omit owner organization/project settings.
  Public tracing is disabled, including nested classifiers. Open trace is unavailable.
- Approval resume uses the **consultant action request's key**, billing that consultant.
  Missing keys refuse before consuming the pending decision, leaving it retryable.
- Secrets are redacted at event/log, transcript, ticket, paused-state, model-history and error
  boundaries. Provider 401 errors use a fixed key-rejection message. HTTP/access logging must
  never capture headers or bodies. HTTPS is required; local HTTP is for development only.

## Abuse protection

Public fixed windows last 60 seconds: chat 30/IP and 10/thread; uploads 10/IP and 5/thread;
thread creation 20/IP. HTTP 429 includes a retry instruction. Buckets expire and cap at 10,000.
TRUSTED_PROXY_HOPS defaults to 1 (rightmost forwarded IP); 0 ignores the header and uses a
shared conservative bucket. Configure the actual trusted chain and block direct origin access.
Expired buckets are removed first; at capacity evict the oldest buckets rather than refusing
every new visitor. These single-process limits are not a distributed WAF.

## Public visitor scope — accepted 2026-11-11

The [H10 decision](../handoffs/H10-pre-publication-fixes.md) supersedes H09's requirement for
a staff password on every public console. Reuse the existing nh_thread_* signed HttpOnly,
SameSite=Strict cookies: they bind this browser to each server-created conversation. Do not
introduce a second visitor ID, identity database or client-provided customer-ID access rule.
A private SESSION_SECRET is still required on every shared deployment. Public mode fails
closed if it is missing or equals the published dev default: thread creation returns 503,
credential verification refuses, and signing never issues a predictable public cookie.

In PUBLIC_DEMO=true, each console state collection and metrics input is filtered to threads
whose valid cookies the request presents. Transcript and inspector reads, rating export and
all consultant mutations (including approval IDs resolved to their thread) check that same
boundary before reading/replaying/changing state. Foreign/unknown targets get the same 403.
Missing requests fail closed. State/export responses are no-store. A cookie grants access to
that conversation only; picking the same mock customer grants nothing about another visitor.

ADMIN_PASSWORD is optional public protection. If set, Basic auth still applies but never
widens visitor scope. Local mode retains staff-wide visibility behind its optional password;
set it before sharing local mode. Cross-site POST checks remain enabled in both modes.
Render generates SESSION_SECRET without requiring an administrator password.

Public global reset is an operator maintenance action: it requires both ALLOW_DEMO_RESET=true
and a configured, valid ADMIN_PASSWORD. Visitors cannot clear one another's data by default
or by enabling the reset flag without operator authentication. Synthetic shop inventory and
business data remain shared demo fixtures; this decision scopes conversation data and actions.

Tests cover both directions with two visitors using the same mock customer, forged and absent
cookies, action refusal without mutation, per-visitor metrics/exports and inspector replay.
The public smoke uses two independent browser contexts without model calls for isolation.

## Known limitations of the public demo

Shop fixtures, including orders and refund totals per order, are shared synthetic state across
visitors, so one visitor can change what another sees for the same demo customer.
Conversation-cookie isolation does not isolate these shop fixtures.

In public mode, the visitor approves their own refund and the consultant name in the audit
comes from the client, so the audit has no evidentiary value.

## Consequences

Visitors pay OpenAI. The host operator bears hosting overages; free allowances are not an
unlimited-cost promise. Sleep/restarts erase state. The server necessarily sees the key in
transient request memory; users must trust the deployment operator.

Offline tests exercise real SDK clients with HTTP stubs, concurrent isolation, tracing,
missing-key refusal, redaction, deterministic starters and limits. Browser smoke checks tab
memory, Clear, responsive geometry and one authorized live turn. H09 explicitly limits paid
acceptance to one turn; the full paid eval is outside that scope. Models, prompts and business
rules do not change. ADR 012 already belongs to developer annotations; BYOK stays here.

## Alternatives

Owner-funded inference risks public expenditure. Recorded playback loses the live-agent
experience. Workers need a state rewrite, outside this scope. BYOK adds setup for visitors.

## References

- [Model access](../../app/lib/runtime/model-access.ts), [request scope](../../app/lib/security/request-key.ts),
  [limits](../../app/lib/security/public-rate-limit.ts), [key control](../../app/components/visitor-key.tsx).
- [Thread/channel security](005-thread-credential-and-event-channels.md),
  [secure forms](006-sensitive-data-secure-forms.md), [state](009-in-memory-state-with-caps.md).
- [Render free services](https://render.com/docs/free), [Fly.io pricing](https://fly.io/docs/about/pricing/).
