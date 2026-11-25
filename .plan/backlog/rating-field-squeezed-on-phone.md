# Rating correction field is squeezed on phones

## TLDR

In the consultant console at 390px, a rated answer shows "rated down by Marta Nowak" on the same row as
the thumbs and the correction field. The field shrinks to about 110px and its placeholder reads "Correc".

- **Importance:** Low
- **Points:** 1
- **Status:** done (2026-11-25: row wraps below 640px, field 58px to 310px at 390px; asserted in scripts/smoke-d7-rating.mjs)

## Current situation

Found while capturing the D7 screenshot (`scripts/smoke-d7-rating.mjs`, see the
[H15 report](../handoffs/H15-honest-claims-disputes-customer-tab-report.md)). The row in
[rating-controls.tsx](../../app/components/admin/rating-controls.tsx) is one `flex` line; the rated label
does not wrap below the field. The field is 40px high and inside the viewport, so the H15 geometry checks pass.

## Proposal

Let the row wrap below `sm` so the label drops under the field, or give the field a `min-w` and wrap the label.
Record the choice in DESIGN.md first. Acceptance: at 390px the placeholder "Correction (optional)" is readable
and `scripts/smoke-d7-rating.mjs` asserts a minimum field width.
