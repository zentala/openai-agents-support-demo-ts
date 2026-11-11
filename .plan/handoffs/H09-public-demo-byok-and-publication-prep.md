# H09 — public demo (bring your own key), free hosting files, publication cleanup

## TLDR

The owner will publish the repo as `github.com/zentala/openai-agents-support-demo-ts`
(public, one fresh commit) and wants a **free** public demo where each visitor pastes
their **own OpenAI key**; anyone who wants their own instance can deploy it on
infrastructure they pay for — we only make that easy. Not on the owner's servers.
Points: H09a {ok. 8p}, H09b {ok. 3p}, H09c {ok. 3p}. Importance: High. Effort: high
(H09a handles a user secret).

## Context (read first)

`AGENTS.md`, `.plan/ADR/011-*.md` (hosting, PROPOSED), `.plan/ADR/005-*.md`,
`.plan/ADR/006-*.md`, `app/lib/config.ts`, `scripts/with-key.mjs`, README Security section.

Hosting facts gathered 2026-11-11 (verify on the provider page while doing H09b):
Fly.io has no free tier for new organizations (trial only); Render free web services
(750 h/month, 512 MB, sleep after 15 min idle, ~1 min wake) are the common free pick;
Hugging Face Spaces CPU Basic is free but Docker Spaces may require a paid plan since
mid-2026 (sources disagree); Koyeb free now needs a card; Vercel/Netlify serverless break
our in-memory state. Sleep is acceptable for this demo (in-memory state resets).

## H09a {8p} — bring-your-own-key mode

- `PUBLIC_DEMO=true` mode (env). In it the server **never** uses a server-side
  `OPENAI_API_KEY` for chat; every run uses the visitor's key.
- UI: a small "Your OpenAI key" control (consistent with DESIGN.md; add a decision row):
  password-type input, explanation ("stays in this browser tab; sent only to this
  server over HTTPS for your requests; never stored or logged"), Clear button, a link to
  where to create a key and to set a spend limit. Keep the key in memory or
  `sessionStorage` only — never `localStorage`, never cookies.
- Transport: send the key per request in a header (e.g. `x-openai-key`) on `/api/chat` and
  the other routes that call the model; SSE does not need it.
- Server: build a per-request model provider / OpenAI client with that key (Agents SDK JS:
  a `Runner` with its own `modelProvider`, e.g. `new OpenAIProvider({ apiKey })`; verify
  the API in node_modules) and a per-request embeddings client; nothing global, nothing
  persisted (do not put the key into RunState, events, tickets, transcripts, logs or
  errors — `redactSecrets` everywhere). Approvals that resume a paused run must use the
  key of the consultant action request in public mode (or refuse with a clear message if
  absent) — document the choice.
- Tracing: in public mode export traces with the visitor's key or disable tracing; never
  send one visitor's traces to the owner's account.
- Rate limits in public mode: per IP and per thread (in memory) on chat and uploads;
  clear 429 messages. Hide "Reset demo data" for visitors unless `ALLOW_DEMO_RESET=true`.
- Errors: a missing/invalid key shows a specific message ("Add your OpenAI key" /
  "OpenAI rejected the key: 401") in chat and the Agent View.
- Tests (each must fail when its fix is reverted, check at least 3): key never appears in
  events/transcripts/logs/error text; header required in public mode; per-request client
  isolation (two requests with different keys never share a client); rate limit; key not
  stored in localStorage (component test).
- ADR-011 → ACCEPTED with this design; new ADR-012 if needed for BYOK specifics; ARCH +
  impact log; README "Run the public demo" section.

## H09b {3p} — free hosting and deploy-your-own files

- `Dockerfile` (multi-stage, Node 22, `next build`, non-root user, `PORT` env) and
  `.dockerignore`. Build it locally once (`docker build`) if Docker is available; if not,
  report NOT_CHECKED.
- `render.yaml` (free plan, `PUBLIC_DEMO=true`, generated `SESSION_SECRET`,
  `ADMIN_PASSWORD` prompt) and a "Deploy to Render" button in README.
- README "Deploy your own" section: Render (free, sleeps), any Docker host (Railway,
  Koyeb, Cloud Run, a VPS) with the env vars table; note Fly.io has no free tier for new
  accounts; do not promise prices — link the providers' pricing pages.
- Close/update `.plan/backlog/hosting-and-byok-public-demo.md`.

## H09c {3p} — publication cleanup (private topology)

The public repo must not contain private service hosts, process-manager names,
personal installation paths, machine names or terminal/secret-manager tooling bindings.
Replace them with the local demo URL (http://127.0.0.1:3100), generic process-manager
instructions, repo-relative paths and optional secret-manager wording. Preserve technical meaning.
Keep optional broker support in scripts/with-key.mjs via PASSWORD_BROKER_SCRIPT only;
never discover a personal script path implicitly. Scan every tracked text file, including
this handoff; only the publication GitHub URL and LICENSE author may retain owner identity.
Also add the short repo description for GitHub to `.plan/STATE.md`
(≤ 120 chars, e.g. "TypeScript multi-agent customer-support demo on the OpenAI Agents SDK:
guardrails, human approval, evals.").

## Constraints and acceptance

Usual rules (lease hook, `corepack pnpm`, `CI=true`, commit per item, no AI
attribution, **no push, no repo creation** — the coordinator publishes). DESIGN.md row
for the key control. `just check`, `just build`; restart the local dev server and run the
layout smoke; then one short manual-style smoke in `PUBLIC_DEMO=true` mode: page asks for
a key, a rule-based starter works without a key (no model), a model scenario answers with a key typed into the key field by the smoke
script from its environment (`OPENAI_API_KEY` injected by `scripts/with-key.mjs`; never
printed or written to a file; one turn only). Report to
`.plan/handoffs/H09-public-demo-byok-and-publication-prep-report.md`.
