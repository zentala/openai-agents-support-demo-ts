# Recorded scenario gallery

The approved [gallery handoff](../.plan/handoffs/H14-scenario-gallery-site.md) serves the
project's goal of making agent behavior visible without asking a visitor to run code.

Run `just build`, then `just gallery local` to record the curated metadata in
`app/data/scenarios.json` against an isolated production app on this machine. Alternatively,
`just gallery <loopback-base-url> [ids...]` records an existing local app and resets its
synthetic demo data before each scenario. Never point it at a session whose data matters.

AI recordings need `OPENAI_API_KEY`, supplied through `scripts/with-key.mjs`; an optional
`PASSWORD_BROKER_SCRIPT` supplies it directly to the local process. Never save the key in
this directory. Each complete unchanged scenario is reused without model calls. Explicitly
remove an obsolete scenario record only when intentionally re-recording that scenario.

The isolated app generates a fresh private `SESSION_SECRET` in memory for its child
environment. The value is never printed or saved. The recorder refuses a visible
public-default-secret notice before model work and before every screenshot. For an
explicitly approved corrective recording, `just gallery local --rerecord [ids...]`
replaces all selected cached recordings; without IDs it re-records the entire catalog
and AI scenarios incur model usage again. Normal runs continue to reuse complete frames.

Frames are full 1440 × 900 app screenshots, converted from PNG to WebP with ffmpeg. Each
step includes the measured visible bounds and selector of its focus element, caption,
semantic icon key and hold duration. Captions describe the captured behavior; recordings
are synthetic demonstrations, not evidence that every model run will produce the same text.
Each recording also carries a `shows` list for the visible capability-summary chip.

The no-network `app/tests/gallery.test.ts` check compares editorial metadata, frame existence,
dimensions, bounds and semantic icon keys with the owning catalog and icon registry.

`site/index.html`, `styles.css`, `gallery.mjs` and `player.mjs` are plain browser files;
there is no framework or bundling step. `just icons` generates `assets/icons.svg` and
`assets/icons.json` from the app's registry. `just check` runs the browser gallery smoke
as well as the catalog tests. Install Playwright's Chromium locally if it is not already
available (`corepack pnpm --dir app exec playwright install chromium`). The smoke serves
only local assets, checks all recordings at 1440/390 and never contacts model providers.

The [Pages workflow](../.github/workflows/gallery-pages.yml) uploads only `site/` on
changes pushed to `main`. The publication coordinator must select GitHub Actions as the
repository's Pages source. This session does not change remote settings or push.
