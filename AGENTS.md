# AGENTS.md

## TLDR

A TypeScript customer-support demo for a furniture shop ("Nordic Home"): three agents on the
OpenAI Agents SDK for JS, chat on the Vercel AI SDK, guardrails, human approval, a consultant
console and an eval suite, in one Next.js app. It is a learning and showcase repository: the code
is written to be read. Inspired by openai/openai-cs-agents-demo (not affiliated with OpenAI).

## File tree

```
app/                    Next.js project (the whole product)
  app/                  routes: pages and API handlers (api/chat, api/threads, api/admin, ...)
  components/           React UI: Agent View panels, chat, workspace tabs, admin/ (console)
  lib/                  logic, grouped by domain
    agents/             agents, handoffs, prompts
    tools/              tools; business rules live here
    guardrails/         input cleanup, input/output guardrails, masking
    runtime/            turn flow, runs, approvals, threads, takeover, events, SSE
    security/           thread credential (HMAC cookie)
    sensitive/          IBAN/phone validation, masking, vault
    escalation/ guest/ claims/ address/ slots/ kb/ admin/ eval/ client/ data/
    config.ts           models, limits (read this early)
  data/                 mock customers, orders, KB articles, scenarios.json
  scripts/eval.ts       eval runner
  tests/                vitest unit tests (no network)
  proxy.ts              console auth and CSRF check
scripts/                Playwright smoke scripts, with-key.mjs, check-tour.mjs
docs/                   BUILD-v1.md (build spec), screenshots/
research/               dated research notes
.plan/                  planning, tracked on purpose (planning is part of the showcase)
  ARCH.md               living architecture; has an "Architecture impact log"
  ADR/                  decision records (_template.md, 001-012)
  BACKLOG.md            index of open work
  backlog/              one file per backlog item
  handoffs/             task briefs (Hxx) and their reports
  JOURNAL.md            raw log of findings and decisions
  VISION.md PURPOSE.md  what we build and why
  STATE.md              current state and next steps
.tours/                 CodeTour walkthroughs (VS Code)
DESIGN.md               visual conventions and decisions
examples/               read-only clone of the upstream OpenAI demo; git-ignored, do not edit
```

## Where to start reading

1. [.plan/ARCH.md](.plan/ARCH.md): components and the steps of one turn.
2. [app/lib/runtime/turn.ts](app/lib/runtime/turn.ts): the turn, in order.
3. [app/lib/agents/index.ts](app/lib/agents/index.ts): agents, handoffs, guardrails.
4. [app/lib/tools/](app/lib/tools/): tools and their rules.
5. [.plan/ADR/](.plan/ADR/): why things are the way they are.
6. [.plan/STATE.md](.plan/STATE.md) and [.plan/BACKLOG.md](.plan/BACKLOG.md): what is open.

## Commands

Use `just`; each recipe is one `pnpm` command (see [justfile](justfile)).

| Command | Does |
|---|---|
| `just setup` | install dependencies |
| `just dev` | dev server on http://127.0.0.1:3100 |
| `just check` | typecheck, lint, unit tests, tour check (no network, no key); run before reporting work done |
| `just build` | production build |
| `just eval [ids]` | run scenarios against the real models; **needs `OPENAI_API_KEY` and costs money** |
| `node scripts/smoke-v1.mjs <base-url> --layout` | browser smoke; **needs a running app** |

The key comes from the environment or `app/.env.local` (git-ignored). Never write it to a file
that is tracked, and never print it.

## Rules

- **Audience rule** ([docs/BUILD-v1.md](docs/BUILD-v1.md)): every file starts with a TSDoc header
  (what, which library concept, why). Comment every non-obvious library call. Mark security
  decisions `// SECURITY:` and talking points `// INTERVIEW:`. Plain words, short sentences.
- **Size limits:** new files at most 250 lines, functions at most 50 lines.
- **Errors are visible:** every failure reaches the UI with its type and message; no generic text.
- **Visual changes:** read [DESIGN.md](DESIGN.md) first. A choice it does not cover goes into
  DESIGN.md before the code.
- **Security:**
  - Never print, log or commit an API key or secret.
  - Business rules live in tool code, not in the prompt (identity from the session, refund limits,
    ownership). See [ADR 003](.plan/ADR/003-business-rules-in-tool-code.md).
  - Customer channels carry only allowlisted events; see
    [ADR 005](.plan/ADR/005-thread-credential-and-event-channels.md).
  - Sensitive data goes through secure forms, not the model
    ([ADR 006](.plan/ADR/006-sensitive-data-secure-forms.md)).
- **Models:** a model or prompt change must pass the full eval and the browser smoke
  ([ADR 010](.plan/ADR/010-eval-and-smoke-as-acceptance-gate.md)).
- **Docs follow code:** when the architecture changes, update [.plan/ARCH.md](.plan/ARCH.md)
  (including the impact log) and add or supersede an ADR. Link every new document from a parent.
- **Do not edit** `examples/`. Commits use Conventional Commits; small and atomic.
- Do not push, publish or spend model credits unless the owner asked.
