# Prior-art re-check before publication

## TLDR

The prior-art search of 2026-11-09 was limited. Before the repository goes public, repeat it with
GitHub search and npm, and adjust the positioning if a TypeScript equivalent exists.

- **Importance:** Medium
- **Points:** 1
- **Status:** open

## Current situation

[research/2026-11-09-parity-and-prior-art.md](../../research/2026-11-09-parity-and-prior-art.md)
found no public TypeScript demo with multi-agent handoffs, an inside view, input and output
guardrails, human approval, retrieval and evals. The search used web search only. "Not found"
is not "does not exist".

## Why

The claim of filling a gap sits in [VISION.md](../VISION.md) and will sit in the README. It must
be true on the day of publication.

## Proposal

1. Run `gh search repos` with several phrasings (customer support, agents SDK, typescript, handoff,
   guardrails, human approval) and search npm for related packages.
2. Check recent commits of the closest repositories from the research table.
3. Record the date, queries and results in a new file in `.plan/reports/`.
4. Soften or sharpen the README and VISION wording to match.

## Acceptance

- A dated report lists queries and findings.
- The gap claim in README and VISION matches the report.

## Links

- [readme-and-screencast](readme-and-screencast.md)
