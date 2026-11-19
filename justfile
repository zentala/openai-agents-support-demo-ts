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
    node scripts/generate-readme-scenarios.mjs --check
    node scripts/check-icons.mjs
    node scripts/export-icons.mjs --check
    node scripts/smoke-gallery.mjs

# Export the app icon vocabulary for the static scenario gallery, and refresh DESIGN.md.
icons:
    node scripts/export-icons.mjs --write

# Record missing/changed scenarios only. AI recordings use the optional broker-injected key.
gallery base_url *ids:
    {{with_key}} node scripts/record-gallery.mjs {{base_url}} {{ids}}

# Burn captions into existing human-request gallery frames; requires ffmpeg/ffprobe, no server or key.
screencast:
    node scripts/record-screencast.mjs
