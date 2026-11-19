# README rewrite and screencast

## TLDR

Rewrite the README for a first-time reader and add a short animated screencast recorded from the
Playwright run. Refresh the screencast on demand.

- **Importance:** High
- **Points:** 5
- **Status:** done (H08c; README, 8s GIF/WebM and repeatable just screencast accepted by implementer checks)

## Current situation

The README is now a 190-line public introduction with a feature tour, quick start and preserved security limits.
It now has a short animated tour and a video alternative; see the
[implementation report](../handoffs/H08-polish-annotations-readme-report.md) for final evidence.

## Why

The README is the first thing a visitor sees ([VISION.md](../VISION.md)). A few seconds of moving
chat shows handoffs, a guardrail trip and an approval faster than text.

## Proposal

1. README structure: what it is, an "inspired by" section (credit to openai-cs-agents-demo, not
   affiliated), a feature tour, security (rules in code and demo limits), how to run, and links to
   [ARCH.md](../ARCH.md), the ADRs and the `.plan/` folder.
2. Add a short screencast (GIF or WebM, a few seconds each key moment) recorded from the
   Playwright run, showing the main chat moments on a timeline: a normal answer, a blocked
   injection, an approval, an order picker.
3. Add a script (for example `scripts/record-screencast.mjs`) so the screencast can be refreshed
   on demand, and a `just` recipe that calls it.
4. Keep files small and check that no private data appears in frames.

## Acceptance

- README opens with a TLDR-style summary and the "inspired by" section.
- A screencast file is in the repository and shown in the README; its size is reasonable.
- One command regenerates it from a running app.
- Links in the README resolve (including the moved `.plan/` paths).

## Links

- [README.md](../../README.md), [scripts/](../../scripts/)
- [prior-art-recheck-before-publication](prior-art-recheck-before-publication.md)
