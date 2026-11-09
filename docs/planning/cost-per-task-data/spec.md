# Spec: Cost per task data

Adds cost per solved task to the [leaderboard table](../leaderboard-table/spec.md) as the Cost/perf column — the primary reason this project exists. Vocabulary: cost per solved task, effective cost in [docs/glossary.md](../../glossary.md).

## Derivation rule

- `costPerSolvedTask` = `effectiveCost / pass_at_1` (dollars per solved task; e.g. $4 at 75% → $5.33). Blank if `pass_at_1` is 0. `effectiveCost` is the entry's `average_cost_usd` on API rows; [subscription data](../subscription-data/spec.md) scales it on tier rows.

## App

- Column: Cost/perf, after Steps and first of the derived columns. The header keeps DeepSWE's benchmark vocabulary rather than spelling out "cost per solved task" (a "$/solved" header was tried and reverted in [design ticket 02](../design/tickets/02-ledger-page-layout.md)); the tooltip carries the definition: "Cost ÷ Pass@1: what you pay per task actually solved".
- Number formatting: cost/perf as standard two-decimal currency, like avg cost.

## Acceptance criteria

- Unit tests cover cost per solved task, including the Pass@1 = 0 blank.

## Tickets

None yet. Built in [leaderboard-table ticket 01](../leaderboard-table/tickets/01-base-api-rows-table.md).
