# 01: Strikeout API cost and exclusive Subscriptions picker

Type: task
Status: resolved
Blocked by: effort-filter/01

## What to build

Two coupled changes to effort-filter ticket 01's filters, grilled 2026-08-24 (spec amended to match). Exclusivity is palatable *because* of the strikeout: the API baseline stays visible on every tier row, so side-by-side API/tier rows are no longer needed. Vocabulary: API cost, Tier discount, and the revised Effective cost and Subscriptions picker entries in [docs/glossary.md](../../../glossary.md).

**Strikeout API cost on tier rows.** Avg cost and Cost/perf cells on tier rows show the API cost first — struck through *and* muted — then the effective value in normal weight. API rows are unchanged.

- Avg cost reads like ~~$9.18~~ $0.92 (e). The "(e)" and its tooltip stay on the effective value; update the tooltip to "effective cost: API cost × subsidisation factor". Cost/perf gets no "(e)" — one marker per row, and the column tooltip already explains it.
- The Cost/perf struck value is API cost ÷ Pass@1 (what the model's API row shows). Pass@1 = 0 renders a single blank cell, no struck blank.
- Sorting is unchanged: both columns sort by their effective values. The struck price is context, not the row's value.
- Plumb the API-priced values through `LeaderboardRow` (e.g. `apiCostUsd`, `apiCostPerSolvedTaskUsd`) so cells stay self-contained — no lookup of the sibling API row at render time.

**Exclusive Subscriptions picker.** Each family section becomes a radio group (vendored `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`): exactly one of API or a tier per family, API by default. The min-one disabled-item logic disappears with the checkboxes. Family-`none` rows still ignore the picker.

- Invariant to test: every entry appears on exactly one row, so Best always shows 25 rows and All effort levels always 62, whatever the picker says — the picker changes pricing, never row count.
- The trigger shows only non-API picks: plain "Subscriptions" by default, "Subscriptions: Max 5x" with a Claude tier picked, both picks (Claude first, matching section order) when neither family is on API. No count — "(2/8)" is meaningless with one pick per family.
- **Tier discount badges**: each tier radio item carries neutral outline badges (muted text, *not* the table's amber/teal family colours — these are annotations, not access tags): the tier discount ((1 − subsidisation factor) × 100 at usage multiplier 1.0, one decimal where needed — −95%, −97.5%, −97.1%, −98.6%), plus one badge per family model whose `usageMultiplier` ≠ 1, labelled with its short name ("Fable: −90%" on Pro/Max 5x, "Fable: −95%" on Max 20x). Compute all of it from `tiers.json` and the mapping — no hardcoded percentages. API items get no "×1"/"−0%" badge. Widen the menu from `w-52` as needed.
- Add an optional `shortName` to `ModelMappingEntry` and `model-mapping.json` — "Fable" for claude-fable-5, matching the Claude usage screen — falling back to `displayName` where unset.

Implementation notes:

- `SubscriptionSelection` becomes one `AccessRoute` per family; update `defaultFilters`, `filterRows`, and their tests.
- e2e: the min-one-lock and tier-ticking cases in `e2e/filters.test.ts` change to radio semantics; add strikeout and badge assertions; `e2e/smoke.test.ts`'s derived default-view count is unaffected.

## Acceptance criteria

- [x] Tier rows show the struck, muted API cost before the effective value in both Avg cost and Cost/perf; API rows are unchanged; "(e)" appears on Avg cost only; both columns still sort by effective values and filters never reset the sort.
- [x] The Subscriptions picker is one radio per family, API default; picking a tier replaces that family's API rows; All effort levels shows 62 rows in every picker state.
- [x] The trigger reads "Subscriptions" on defaults and appends only non-API picks.
- [x] Tier items show discount badges derived from the data (Pro/Max 5x −95%, Max 20x −97.5%, Plus/Pro 5x −97.1%, Pro 20x −98.6%) plus Fable badges on Claude tiers via the new optional `shortName`.
- [x] `vp run ready` passes with the updated unit and e2e tests, and the deployed site is verified.

## Comments

Implemented 2026-08-24. `LeaderboardRow` gained `apiCostUsd`/`apiCostPerSolvedTaskUsd`
(populated in `derive.ts` for every row; equal to the effective values on API rows), rendered
as `<s className="text-muted-foreground">` in the Avg cost and Cost/perf cells; the "(e)"
tooltip now says "API cost". `SubscriptionSelection` collapsed to one `AccessRoute` per
family; the toolbar uses the vendored `DropdownMenuRadioGroup`/`DropdownMenuRadioItem`
(menu widened to `w-80` for the badges). Discount badges are computed from `tiers.json` via
`subsidisationFactor` + a new `formatTierDiscount`; per-model badges come from a
`usageLimitNotes` prop App builds from mapping entries with `usageMultiplier ≠ 1`, using the
new optional `shortName` ("Fable"). Unit tests updated in `filter.test.ts` (incl. the
row-count invariant across all route combinations), `derive.test.ts`, `format.test.ts`;
e2e radio/strikeout/badge coverage in `e2e/filters.test.ts`. `vp run ready` and the full
Playwright suite pass; strikeout, badges, and trigger label verified against a local
production build. Deploy verification pends the push to `main`.

Follow-up 2026-08-24: dropped the "(e)" marker and its tooltip from tier-row Avg cost —
the estimate caveat moved to a muted disclaimer at the bottom of the Subscriptions picker
("Subscription costs are estimates: the struck-out API cost scaled by the tier's
discount"), asserted in the picker e2e. Spec updated to match. The page container also
widened from `max-w-4xl` to `max-w-5xl`: the struck-out costs pushed the table to ~949px,
truncating the Tok/s column; verified the table fits in every sort state.
