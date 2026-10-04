# Spec: Model filter

Picks which models the [leaderboard table](../leaderboard-table/spec.md) includes.

- **Models picker** in the toolbar: per-model include/exclude multi-select keyed on the leaderboard model id, each item leading with the model's vendor mark before its `displayName` (alphabetical by display name, not grouped by vendor), all ticked by default, with a "(25/25)" count and Select all / Clear. Unticking a model removes all its rows. A **vendor-reported toggle** under Select all / Clear, on by default, lists the vendor-reported models ([vendor-reported-data spec](../vendor-reported-data/spec.md)): off unlists and deselects them, so their rows go too; on lists them again unselected, until ticked or selected all. The count and Select all cover only the listed models. Empty selection shows DeepSWE's copy: "No models selected. Use the Models menu to pick one or more."
- Semantics: union within the Models picker, intersection across controls; filters compose with sorting and never reset it. Filter state is in-memory only — URL persistence, a reset button, and a row counter were considered and deliberately left out of effort-filter ticket 01.

## Acceptance criteria

- Unticking a model removes all its rows (all efforts, all access routes).
- The vendor-reported toggle off removes those models from the picker and the table; on lists them unselected.

## Tickets

The picker itself was built in [effort-filter ticket 01](../effort-filter/tickets/01-filters-default-view.md).

- [01: Vendor marks in the Models picker](tickets/01-vendor-marks-in-picker.md)
- [02: Vendor-reported toggle in the Models picker](tickets/02-vendor-reported-toggle.md)
