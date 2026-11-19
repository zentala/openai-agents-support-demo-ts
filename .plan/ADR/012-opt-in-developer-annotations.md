# 012 — Opt-in developer annotations

## TLDR

Agentation is a lazy browser-only overlay. Public page loads do not mount or fetch it.
The owner chose manual copy/paste; no endpoint or MCP server is configured.

- **Status:** accepted (owner's H08 scope and manual-mode answer)
- **Date:** 2026-11-10

## Decision

`NEXT_PUBLIC_DEV_ANNOTATIONS=true` at build time or an explicit `?annotate=1` grants
access to Settings in the Agent View header. The URL grant persists in localStorage.
The Annotations switch persists separately, and the toolbar loads only while on.
The root layout stays a server component; a client mount uses `next/dynamic` with
SSR disabled. A shared external store keeps the root and Settings synchronized.

## Boundaries

This flag is a developer convenience, not authentication. Feedback can contain page
text. Manual Copy is the only export configured here. No automatic synchronization
is claimed. Clearing the site's storage revokes the remembered URL grant; a build-time
grant requires a rebuild to remove it. Agentation retains its own package license.

## Evidence

- [annotation store](../../app/lib/client/annotations.ts),
  [UI](../../app/components/annotations.tsx), [smoke](../../scripts/smoke-annotations.mjs).
- [implementation report](../handoffs/H08-polish-annotations-readme-report.md),
  [official manual-mode setup](https://www.agentation.com/install).
