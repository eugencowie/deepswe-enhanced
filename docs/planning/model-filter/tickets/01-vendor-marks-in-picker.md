# 01: Vendor marks in the Models picker

Type: task
Status: resolved

## What to build

Show each model's vendor mark alongside its name in the Models picker, per the
2026-09-06 grilling. Vocabulary: **vendor mark**, **display name** in
[docs/glossary.md](../../../glossary.md). Supersedes the "Model cell only — not
the Models picker" line in
[model-data ticket 01](../../model-data/tickets/01-vendor-marks.md).

### Decisions

- **Placement**: the mark leads the display name inside each checkbox item,
  the same 16px `VendorMark` as the table's Model cell, spaced by the item's
  own `gap-2` rather than the table's `mr-1.5`. The tick stays on the right
  edge.
- **Ordering**: unchanged. Alphabetical by display name, no grouping or sorting
  by vendor.
- **Accessible name**: keep `VendorMark`'s `aria-label` of the vendor, so an
  item is announced as vendor plus name ("Anthropic Claude Opus 5"), matching
  the table.
- **Data path**: `ModelOption` in `src/data/leaderboard.ts` gains a `vendor`
  field, taken from the row (ADR 0005: the leaderboard module owns what the UI
  needs). The toolbar renders `<VendorMark vendor={option.vendor} />`; it does
  not look vendors up from the mapping itself.
- Trigger label ("Models (28/28)"), Select all, and Clear are untouched.

## Acceptance criteria

- [x] Every item in the Models picker shows its vendor mark before the display
      name, matching the mark shown in the table for the same model
- [x] List order is still alphabetical by display name
- [x] Each item's accessible name includes the vendor name via the mark's
      `aria-label`
- [x] `ModelOption` carries `vendor`; a unit test in `leaderboard.test.ts`
      asserts it carries the mapping's vendor
- [x] The e2e models-picker test asserts the vendor mark and the combined
      accessible name
- [x] `vp run ready` passes

## Comments

**2026-09-06** — Implemented. `ModelOption` gains `vendor` from the row;
the toolbar renders `VendorMark` before the display name inside each
checkbox item, relying on the item's existing `gap-2` for spacing. Verified
by unit test, the e2e models-picker test, and a Playwright screenshot.
Noted in passing: each inlined SVG carries its own `<title>`, so assistive
tech saw a nested second image inside the labelled wrapper, and three titles
named the mark rather than the vendor (Kimi, Qwen, Grok). Fixed here rather
than in a ticket of its own: `VendorMark` now inlines the SVG with
`aria-hidden`, leaving the files byte-identical and the wrapper's
`aria-label` as the only accessible name. Applies to the table as well.
