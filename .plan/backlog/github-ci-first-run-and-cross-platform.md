# GitHub CI first run and cross-platform check

## TLDR

The CI workflow has never run on GitHub, and the `justfile` and `scripts/with-key.mjs` were only
tested on Windows. Run both on GitHub and on Linux or macOS and fix what breaks.

- **Importance:** Low
- **Points:** 2
- **Status:** open

## Current situation

[.github/workflows/ci.yml](../../.github/workflows/ci.yml) runs typecheck, lint, unit tests and
build. It has not run on GitHub. The `justfile` uses `set windows-shell` and recipes meant to be
shell-neutral, but they were verified only on Windows.

## Why

A visitor on Linux or macOS must be able to clone, run `just check` and `just dev`. A red CI badge
on the first push would hurt the showcase.

## Proposal

1. After the first push, read the CI run and fix failures.
2. On a Linux or macOS machine (or a container), run `just setup`, `just check`, `just build`,
   `just dev` with `OPENAI_API_KEY` in the environment.
3. Check `scripts/with-key.mjs` when no password broker is installed.
4. Check that `scripts/check-tour.mjs` (part of `just check`) passes on Linux paths.

## Acceptance

- CI is green on GitHub.
- `just check` and `just build` pass on Linux or macOS.
- Problems found are fixed or documented.

## Links

- [hosting-and-byok-public-demo](hosting-and-byok-public-demo.md)
