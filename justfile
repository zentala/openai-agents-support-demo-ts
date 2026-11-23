# Command interface for the Nordic Home support agent demo (app/ is the Next.js project).
# Works on macOS/Linux (sh) and Windows (pwsh). Recipes avoid shell-specific syntax.
#
# OpenAI key: export OPENAI_API_KEY, or put it in app/.env.local. On the author's machine an
# optional password broker supplies it (see scripts/with-key.mjs). The key is never stored by this repo.
set windows-shell := ["pwsh", "-NoProfile", "-Command"]

# pnpm and the tools behind it must not wait for prompts
export CI := "true"

with_key := "node " + quote(justfile_directory() / "scripts/with-key.mjs")

# list recipes
default:
    @just --list

# Corepack picks the pnpm version from package.json in the current directory, so pnpm recipes run
# inside app/. From the repository root (no package.json) Corepack would use its newest pnpm.

# install dependencies
[working-directory: 'app']
setup:
    corepack pnpm install

# dev server on http://127.0.0.1:3100
[working-directory: 'app']
dev:
    {{with_key}} corepack pnpm dev

[working-directory: 'app']
build:
    corepack pnpm build

[working-directory: 'app']
typecheck:
    corepack pnpm typecheck

[working-directory: 'app']
lint:
    corepack pnpm lint

# unit tests (no network, no key)
[working-directory: 'app']
test:
    corepack pnpm test

# run every scenario (or only the ids you pass) against the real agents and print a pass/fail table
[working-directory: 'app']
eval *ids:
    {{with_key}} corepack pnpm eval {{ids}}

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
