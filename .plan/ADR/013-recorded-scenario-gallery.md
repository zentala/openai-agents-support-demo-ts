# ADR 013: Static recorded scenario gallery

Status: accepted by the owner in the [gallery handoff](../handoffs/H14-scenario-gallery-site.md), 2026-11-15.

## Context

Recruiters and prospective clients need to see the app before supplying a model key.
The existing live demo remains the place for interactive support conversations.

## Decision

Serve a plain HTML/CSS/JavaScript gallery from `site/` through GitHub Pages. The shared
scenario JSON owns gallery editorial metadata and recording actions. Playwright records
the real local app at 1440 × 900; PNG screenshots become WebP frames with measured focus
rectangles. The browser player uses the existing exported semantic SVG vocabulary.

Complete unchanged recordings are reused. AI recordings use the explicitly approved
one-time model budget and a broker-injected key. Neither keys nor raw model traces are
published. A temporary local app isolates synthetic resets from other sessions.
The local recording app uses a fresh in-memory private session-signing secret. A visible
public-default-secret notice refuses a capture; it is never removed cosmetically. The
owner may explicitly authorize `--rerecord` to replace cached frames after a defect.

## Consequences

Visitors can replay real recorded outcomes without a server or key. Frames are snapshots,
not a claim that future model runs are identical. Catalog and icon drift fail the existing
no-network check. GitHub Pages publication still belongs to the coordinator; this session
prepares workflow and artifacts without pushing or enabling remote settings.
