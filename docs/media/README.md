# Support demo screencast

The README embeds [support-demo.gif](support-demo.gif); [support-demo.webm](support-demo.webm) is the video alternative. Both show real UI and mock data, with no model calls.

Timeline: start screen → Asks for a human → amber waiting trace and Consultant count → selected ticket → takeover → consultant reply pushed to the customer. The exact timings depend on host response time; the scripted pauses let viewers read each state. The output is capped at 20 seconds, and the GIF at 3 MB.

Regenerate from the repository root against a running app:

```sh
corepack pnpm --dir app exec playwright install chromium
just screencast <base-url>
```

Requires ffmpeg on PATH. Optional PROXY_PAC passes through to Chromium. [record-screencast.mjs](../../scripts/record-screencast.mjs) runs the existing smoke in --screencast mode, records via Playwright recordVideo, then encodes VP9 WebM and an 8-fps palette GIF. [smoke-screencast.mjs](../../scripts/smoke-screencast.mjs) owns the sequence. No server reset, model turns or real customer data are used; the tour creates a synthetic ticket and takeover in memory.
