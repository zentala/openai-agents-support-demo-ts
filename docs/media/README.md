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

Timeline: customer asks for a person → a rule opens a ticket → consultant takes over → consultant replies. Captions are burned into the images. The four full-screen frames come from the real `human-request` gallery recording. Holds are 2.5, 3, 3 and 4 seconds, respectively (12.5 seconds total). The GIF stays below 3 MB and loops after the final four-second hold; the gallery player stops and offers Replay.

Regenerate from the existing frames at the repository root:

```sh
just screencast
```

Requires ffmpeg and ffprobe on PATH. [record-screencast.mjs](../../scripts/record-screencast.mjs) reads [gallery data](../../site/data/scenarios.json), scales each complete app frame to 1120×700, adds an 88px caption strip, then encodes VP9 WebM and a 128-color GIF. It checks the encoded duration, final-frame hold and file-size ceiling. No app server, browser, key, reset or model call is needed. Set `SCREENCAST_FONT` to a local TrueType font if none of the standard Windows/Linux/macOS fonts is available. See the [gallery instructions](../../site/README.md) to refresh the source recording deliberately.
