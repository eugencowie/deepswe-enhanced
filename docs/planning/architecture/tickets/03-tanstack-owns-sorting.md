# 03: TanStack Table owns sorting and the column list

Type: task
Status: resolved

## What to build

Commit to TanStack Table instead of bypassing it. ADR 0007 kept an in-house sort rule (`compareBlankLast`, `firstDirection`, `defaultSort`, `toggleSort`, `sortRows`) because "TanStack negates the comparator for descending, which puts blanks first". That is true of the default only: `sortUndefined: "last"` is applied before the negation and places blanks last in both directions, verified against table-core 9.2.4. With that one option the in-house sort machinery is redundant, and the column module can be a plain TanStack column list.

Two PRs. The first changes the data module's contract; the second hands sorting and columns to TanStack.

## Decisions (grilled 2026-09-11)

- Toggle cycle stays two-state: `enableSortingRemoval: false`. Unsorted would show derivation order, which means nothing to a reader.
- Every optional field on `LeaderboardRow` becomes `undefined`, not only the four sortable ones: one convention per type. Snapshot and mapping types keep `null` because they describe JSON files.
- `compareModel` becomes a module-level export comparing display name then effort rank. The route tiebreak can never fire on visible rows (exactly one access route per family, docs/glossary.md), and TanStack's index fallback reproduces derivation order if it ever could. `routeOrder`, the `Leaderboard.compareModel` field and the `createColumns` factory go; the column list is a module-level constant.
- First direction is best-first, stated explicitly: table-level `sortDescFirst: false`, with `sortDescFirst: true` on Pass@1 and Tok/s. This changes today's every-figure-descending rule; the e2e Cost assertion flips to ascending.
- Sort state is uncontrolled, via `initialState.sorting` (Pass@1 descending). It does not reset on data change (`autoResetSorting` defaults to false).
- Column presentation (`tooltip`, `estimate`, `derived`, `align`, `bar`) is typed meta via `metaHelper`. A shared `figure` spread carries `sortUndefined: "last"` and `meta.align: "end"`. Alignment is explicit: neither TanStack nor shadcn aligns by type.
- A `figureCell(format)` helper handles `undefined` once; Cost and Cost/perf keep row-based cells for the struck-out variant.
- The first-derived-column rule stays a neighbour peek in the table; it is a property of the sequence, not of one column.
- `getRowId` is model, effort and route.
- Tests: the five sort tests go. Two definition-level assertions stay (Model delegates to `compareModel`; every figure column has `sortUndefined: "last"`). Cell tests render through a headless `constructTable` so cells are tested as the table invokes them.
- Recorded as ADR 0008, superseding ADR 0007's sort half and ADR 0005's route tiebreak.

## Answer

Built in two commits: `e37d20c` (undefined on rows, module-level `compareModel`) and `a001e8a` (TanStack owns sorting and columns, ADR 0008). `leaderboard-columns.tsx` exports `leaderboardTableOptions`, a `tableOptions` value the table spreads over its rows; the table takes `rows` and `empty` and keeps no state. One deviation: cell tests render through `useTable` and `FlexRender` with `react-dom/server` rather than `constructTable`, which needs a reactivity feature only reachable through a new direct dependency on table-core; the adapter path is the one production uses, so the intent (cells tested as the table invokes them) holds. 145 tests pass, e2e 11 pass.
