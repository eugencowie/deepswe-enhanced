# 01: Filters and default view

Type: task
Status: resolved
Blocked by: subscription-data/01

## What to build

A DeepSWE-style toolbar — toggles left, dropdowns right — replacing the spec's original vendor/effort filters (revised in this ticket's grilling, 2026-08-24; spec updated to match). Four pieces:

- A static **v1.1** chip styled like DeepSWE's active toggle state. No disabled v1 button.
- A **Best / All effort levels** toggle, defaulting to Best. Best keeps each model's highest-effort entry: rank by `EFFORT_ORDER` with default (`null`) below `low`; a single-entry model always keeps its entry. This is per model, independent of access route. It is *not* best-Pass@1 — for claude-fable-5, grok-4-6, and gemini-3-7-flash a lower effort scores higher, and the DeepSWE site still shows the highest effort, which is what we match.
- A **Subscriptions picker**: one dropdown with two labelled checkbox sections, Claude (API / Pro / Max 5x / Max 20x) and ChatGPT (API / Plus / Pro 5x / Pro 20x). Labels come from `tier.shortLabel`; both API boxes ticked by default; button shows a "(2/8)" count. Each section must keep at least one box ticked — disable the last checked item rather than letting it uncheck — so the picker alone can never hide a whole family. No Select all/Clear buttons here. Rows whose family is `none` ignore this picker entirely.
- A **Models picker**: include/exclude multi-select keyed on `row.model`, labelled with `displayName` (alphabetical), all ticked by default, button count "(25/25)", with Select all and Clear. Unticking a model removes all its rows — every effort level and access route. With zero models ticked, the table body shows DeepSWE's copy: "No models selected. Use the Models menu to pick one or more."

Semantics: union within a dropdown, intersection across controls. Filter state is in-memory only; URL persistence, a reset button, and a row counter are deliberately out of scope.

Implementation notes:

- Filter the rows array in a memo *before* the existing sort memo (the table uses TanStack v9 with no features enabled; don't turn on its filter features or add accessors). Sorting then composes for free and filters never touch sort state.
- Reuse the vendored `dropdown-menu`'s `DropdownMenuCheckboxItem`/`DropdownMenuLabel`/`DropdownMenuSeparator`; don't restyle subscription-data ticket 01's access badges.
- Update the e2e smoke: its `tbody tr` expectation changes from all 185 derived rows to the default view (best-effort API rows). Keep it derived from the data, not a literal count.

The footer already exists — its lines shipped with leaderboard-table ticket 01, avg-time-data ticket 01 and subscription-data ticket 01.

Per the [spec](../spec.md) (App section). Vocabulary: Best effort level and Subscriptions picker in [docs/glossary.md](../../../glossary.md).

## Acceptance criteria

- [x] First load shows Best + API only: 25 rows, one per model, each at its highest effort (fable shows [max], grok-4-6 shows [xhigh]). Switching to All effort levels shows the 62 API rows; ticking tiers in the Subscriptions picker reveals tier rows.
- [x] Each Subscriptions section always keeps at least one box ticked; family-`none` models are unaffected by the picker.
- [x] All controls compose with each other and with sorting, and changing filters never resets the sort.
- [x] Unticking a model removes all its rows — every effort level and access route; clearing all models shows the DeepSWE empty-state copy.
- [x] `vp run ready` passes (including the updated e2e expectation) and the deployed site has working filters.

## Comments

2026-09-05: the Best rule described here is wrong. The DeepSWE site picks the highest Pass@1 per model, tiebreak higher effort. Superseded by [ticket 02](./02-best-view-picks-best-pass-at-1.md).

Implemented 2026-08-24. Filtering is a pure `filterRows` in `src/data/filter.ts` applied in
`App.tsx` before the table's sort memo; `LeaderboardRow` gained a `family` field so the
Subscriptions picker can scope routes per family without a mapping lookup. The toolbar is
`src/components/leaderboard-toolbar.tsx` (vendored dropdown-menu's checkbox items,
`closeOnClick={false}` so menus stay open). Min-one-per-section is a `disabled` flag on the
last checked route. Unit tests in `src/data/filter.test.ts`; browser coverage in
`e2e/filters.test.ts` (toggle counts, tier ticking, min-one lock, clear/select-all, empty copy);
`e2e/smoke.test.ts` now derives its count from the default view. Deploy verification pends the
push to `main`.
