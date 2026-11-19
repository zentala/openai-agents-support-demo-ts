# Semantic icons

[DESIGN.md](../DESIGN.md) owns the visual rules and generated map.
[app/lib/ui/icons.ts](../app/lib/ui/icons.ts) is the only Lucide import boundary.
App components render `<Icon name="ticket" />`; use `size` and existing utility classes
for dimensions, and `label` only when an image needs its own accessible name.
Most icons are decorative beside visible text and stay hidden from assistive technology.

Run `just icons` after changing the registry. It writes the generated DESIGN table and
the app assets [icons.svg](../app/public/icons.svg) and [icons.json](../app/public/icons.json),
plus identical gallery assets in [site/assets](../site/assets/icons.json).
`just check` checks their freshness, import ownership and unique glyph assignments.
The geometry is from the installed Lucide package (ISC), with one explicit exception:
`github` is the unchanged official [GitHub mark path](https://github.com/primer/octicons/blob/main/icons/mark-github-24.svg)
in `app/lib/ui/github-mark.tsx`. It identifies links to GitHub in monochrome, subject to
[GitHub's brand usage](https://brand.github.com/foundations/logo); it is not Lucide artwork.
The export records its source and separate brand notice. No image network requests occur.

The gallery reads the generated semantic keys from JSON and uses the same sprite:

```html
<svg width="16" height="16" aria-hidden="true" focusable="false">
  <use href="icons.svg#icon-ticket"></use>
</svg>
```

Each symbol supplies its viewBox, currentColor, stroke width and line styles.
Keep a visible text label; an icon never establishes authorization or action state.
No app actions, models, secrets or runtime packages are bundled into these exports.
