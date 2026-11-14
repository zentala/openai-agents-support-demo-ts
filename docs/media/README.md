# Demo media

## Product illustrations

The fictional catalog uses nine local 320 × 320 WebP illustrations in
[`app/public/products`](../../app/public/products). Each is below 60 KB; clients load
bundled files, never Unsplash URLs. These are illustrative photos, not photographs
of manufactured Nordic Home products. Unknown products and failed image requests
keep a neutral package fallback beside the unchanged product name.

All sources below state free use under the [Unsplash License](https://unsplash.com/license)
(checked 2026-11-11). The license allows downloading, modifying and commercial use;
attribution is appreciated. Images are not offered as a stock-photo service or sold separately.

| Product | Local file | Photographer and source | Crop |
| --- | --- | --- | --- |
| Oslo dining chair | `chair.webp` | [Costa Live](https://unsplash.com/photos/wooden-dining-chairs-with-white-cushions-around-table-7o7uW29f1vk) | Centered dining chairs |
| Fjord 3-seater sofa | `sofa.webp` | [Margo Evardson](https://unsplash.com/photos/modern-living-room-with-gray-sofa-and-large-plant-6Rc6qfJraLI) | Centered living-room sofa |
| Bergen bookshelf | `bookshelf.webp` | [Peter Barrett Bryan](https://unsplash.com/photos/books-neatly-stacked-on-a-wooden-bookshelf-p-diyGc2ldk) | Centered wooden shelves |
| Trondheim armchair | `armchair.webp` | [Puscas Adryan](https://unsplash.com/photos/a-wooden-armchair-with-white-cushions-in-a-room-073a9dKBaG0) | Centered armchair |
| Oak coffee table | `table.webp` | [Madeline Liu](https://unsplash.com/photos/wooden-coffee-table-in-living-room-jYUjS2uM_I0) | Centered table |
| Lund floor lamp | `lamp.webp` | [David van Dijk](https://unsplash.com/photos/black-floor-lamp-at-the-corner-3LTht2nxd34) | Centered floor lamp |
| Stavanger desk | `desk.webp` | [João Emanuel](https://unsplash.com/photos/workspace-with-laptop-and-wooden-desk-ngpAHJludHA) | Centered workspace |
| Wool rug 160x230 | `rug.webp` | [Lisa Anna](https://unsplash.com/photos/a-close-up-of-a-rug-on-a-wooden-floor-an8peUcqEl8) | Tight crop of rug weave, lower right |
| Aalborg 3-door wardrobe | `wardrobe.webp` | [Pickawood](https://unsplash.com/photos/a-bedroom-with-a-bed-and-a-large-window-JLzD88Mbr4U) | Tight crop of wardrobe doors, left |

The standalone Docker runtime explicitly copies `public/`; local production serves the
same directory through Next.js. Final browser checks must confirm asset HTTP responses
and visible thumbnails at the actual application host, not just files on disk.

## Support demo screencast

The README embeds [support-demo.gif](support-demo.gif); [support-demo.webm](support-demo.webm) is the video alternative. Both show real UI and mock data, with no model calls.

Timeline: start screen → Asks for a human → amber waiting trace and Consultant count → selected ticket → takeover → consultant reply pushed to the customer. The exact timings depend on host response time; the scripted pauses let viewers read each state. The output is capped at 20 seconds, and the GIF at 3 MB.

Regenerate from the repository root against a running app:

```sh
corepack pnpm --dir app exec playwright install chromium
just screencast <base-url>
```

Requires ffmpeg on PATH. Optional PROXY_PAC passes through to Chromium. [record-screencast.mjs](../../scripts/record-screencast.mjs) runs the existing smoke in --screencast mode, records via Playwright recordVideo, then encodes VP9 WebM and an 8-fps palette GIF. [smoke-screencast.mjs](../../scripts/smoke-screencast.mjs) owns the sequence. No server reset, model turns or real customer data are used; the tour creates a synthetic ticket and takeover in memory.
