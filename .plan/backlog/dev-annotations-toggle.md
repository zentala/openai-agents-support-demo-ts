# Developer annotations toggle

## TLDR

A developer overlay for annotating and giving feedback on the page. Off by default. Turned on by a
special flag (environment variable or URL parameter) and by a switch in a settings area.
Candidate tool: the Agentation toolbar.

- **Importance:** Medium
- **Points:** 3
- **Status:** done (H08b; default-off, URL on, persistent switch and actual copy verified)

## Current situation

There is no way to point at an element on the live page and leave a note for a coding agent.
Design feedback travels through screenshots and chat text.

## Why

Annotations tied to elements make visual feedback precise for the owner and for agents. It must
not appear for visitors of a public demo.

## Proposal

1. Evaluate the Agentation toolbar (React component) for fit with Next.js 16 and the
   [DESIGN.md](../../DESIGN.md) conventions.
2. Load it only when a flag is set: an environment variable (build or runtime) or a URL
   parameter, never by default.
3. Add a switch in a small settings area to turn it on and off for the session.
4. Make sure the code path is absent from the default bundle (dynamic import) and from the
   public demo unless the flag is set.

## Acceptance

- Default page load has no overlay and no extra network request for it.
- With the flag, the overlay appears; the settings switch toggles it.
- A test (unit or Playwright) covers the off-by-default case.
- `just check` and `just build` pass.

## Links

- [design-review-follow-ups](design-review-follow-ups.md)
