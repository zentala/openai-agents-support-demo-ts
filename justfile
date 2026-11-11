# Command interface for the Nordic Home support agent demo (app/ is the Next.js project).
# Works on macOS/Linux (sh) and Windows (pwsh). Recipes avoid shell-specific syntax.
#
# OpenAI key: export OPENAI_API_KEY, or put it in app/.env.local. On the author's machine an
# optional password broker supplies it (see scripts/with-key.mjs). The key is never stored by this repo.
set windows-shell := ["pwsh", "-NoProfile", "-Command"]

# pnpm and the tools behind it must not wait for prompts
export CI := "true"

with_key := "node scripts/with-key.mjs"

# list recipes
default:
    @just --list

# install dependencies
setup:
    corepack pnpm --dir app install

# dev server on http://127.0.0.1:3100
dev:
    {{with_key}} corepack pnpm --dir app dev

build:
    corepack pnpm --dir app build

typecheck:
    corepack pnpm --dir app typecheck

lint:
    corepack pnpm --dir app lint

# unit tests (no network, no key)
test:
    corepack pnpm --dir app test

# run every scenario (or only the ids you pass) against the real agents and print a pass/fail table
eval *ids:
    {{with_key}} corepack pnpm --dir app eval {{ids}}

# gate before commit
check: typecheck lint test
    node scripts/check-tour.mjs

# Record a no-model tour from a running app; requires Playwright Chromium and ffmpeg.
screencast base_url="http://127.0.0.1:3100/":
    node scripts/record-screencast.mjs {{base_url}}
