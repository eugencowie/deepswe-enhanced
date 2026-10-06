# The Column module owns cells, formatting and the sort rule

ADR 0005 left column formatting and sort "pending a column module". Until then a column was spread across four modules: header, tint and sort value in the table's `ColumnSpec`, the blank-last comparator in `leaderboard-sort.ts`, cell text in `format.ts`, and the Model column's order arriving as a `compareModel` prop drilled from App through the table into every column's comparator as a fourth argument that seven of eight ignored. The formatters and the blank-last comparator were unit-tested; the ~40 facts wiring them to columns were not, so swapping one column's sort value for another's left every test green. We decided one module, `src/components/leaderboard-columns.tsx`, owns every column (header, tooltip, estimate marker, alignment, derived tint, bar, cell, sort value, blank policy, first direction) and the sort rule (Pass@1 descending by default; a sorted column flips, a fresh column starts in its natural direction; blanks last both ways). `createColumns({ compareModel })` binds the Leaderboard's Model order at construction and returns `columns`, `defaultSort`, `toggleSort` and `sortRows`; the table renders the list and keeps only `useState` for the sort.

## Considered options

- **A pure `src/data/columns.ts` with cells left in the table**: keeps JSX out of the module, but the struck-out API cost and the Model cell are most of the wiring that was untested; the seam would cut through the thing being deepened.
- **Rows carry the Model sort key so comparators stay three-argument**: already rejected by ADR 0005; widens the row with a fact that belongs to presentation.
- **The Leaderboard grows a `columns` field**: puts presentation in the data module, contrary to ADR 0005's split.
- **Sort transitions as module-level exports taking the column list**: would expose `firstDirection` and `compare` on the public column type; binding them to the instance keeps those private.

## Consequences

- `firstDirection`, `value` and `compare` are not part of the interface; tests exercise them through `sortRows` and `toggleSort` on hand-written rows.
- Cells are tested by rendering to static markup with `react-dom/server` and stripping tags, so no DOM is needed in `vp test`. The struck-out cost and the tooltip trigger are asserted on markup, everything else on text.
- `leaderboard-sort.ts` is deleted and six single-use formatters became private to the module. `format.ts` keeps `formatTierDiscount` and `formatUsdPerMonth` for the route card until the Subscriptions picker is deepened.
- TanStack Table stays as the table's render wiring (ADR 0001). Here it is a pass-through; dropping it is a separate decision.
- The table's interface is `rows`, `columns`, `empty`. Class strings, including the left rule on the first derived column, remain the table's business.
- The e2e "sort survives a filter change" test stays: after this change its remaining value is the table's `useState` wiring.
- Superseded in part by [ADR 0008](0008-tanstack-owns-sorting.md): the stated reason for sorting outside TanStack was incomplete (`sortUndefined: "last"` places blanks last both ways), the sort rule now lives in TanStack options, and the table's interface is `rows` and `empty`: it reads the column list itself.
- Superseded in part by [vendor-reported-data ticket 07](../planning/vendor-reported-data/tickets/07-review-follow-ups.md) (2026-10-06): the left rule on the first derived column is gone, and the brand tint alone sets the derived columns apart.
