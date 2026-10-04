# 02: Vendor-reported toggle in the Models picker

Type: task
Status: resolved

## What to build

A toggle in the Models picker that lists or unlists the vendor-reported
models, on by default, as the maintainer asked on 2026-10-04. Vocabulary:
**Models picker**, **vendor-reported entry** in
[docs/context.md](../../../context.md). It is the "filter on provenance"
[ADR 0009](../../../architecture/0009-vendor-reported-entries.md) names as the
fix should vendor-reported rows mislead; on by default, so the ADR's rejection
of hiding them still holds.

### Decisions

- **Behaviour** (the maintainer's): off removes the vendor-reported models
  from the picker and deselects any that were selected; on lists them again
  but leaves them unselected until the user ticks them or clicks Select all.
- **State**: `LeaderboardFilters` gains `vendorReported: boolean`, true by
  default. `setVendorReported` in `src/data/leaderboard.ts` deselects on the
  way off, so `visibleRows` needs no provenance check; `pickerModels` gives
  the listed models, which the picker, its count and Select all all use.
- **Placement**: "Include vendor-reported", under its own separator below
  Select all / Clear, tinted like the vendor-reported items so it also reads
  as their key.
- **Control**: a switch, the vendored shadcn `Switch`, drawn inside a menu
  checkbox item in place of its tick. The item keeps the menu's keyboard
  handling and the `menuitemcheckbox` role; the switch is inert and hidden
  from assistive tech, so a real switch nested in a menu item doesn't
  announce twice or take focus.

## Acceptance criteria

- [x] The toggle is on by default, with every vendor-reported model listed
      and selected
- [x] Off unlists and deselects them, and their rows leave the table; a
      deselected DeepSWE model stays deselected
- [x] On again lists them unselected; Select all then selects them
- [x] The trigger's count and Select all cover only the listed models
- [x] Unit tests in `leaderboard.test.ts` and an e2e test in
      `e2e/filters.test.ts` cover the above
- [x] `mise run validate` passes

## Comments

**2026-10-04** — Implemented as above and checked by screenshot in both
states.
