# 02: Leaderboard joins vendor-reported entries

Type: task
Status: ready-for-agent
Blocked by: 01

## What to build

`LeaderboardSources` gains `vendorReported`, and `createLeaderboard` derives rows from both sources ([ADR 0005](../../../architecture/0005-leaderboard-module-owns-tier-join.md)), one row per access route as today. Each row records its provenance: DeepSWE, or the vendor claim with source, URL, publication date, `figureFrom`, and harness and trials when stated. The UI (ticket 03) reads the marker and citation from the row, never from the data file.

`LeaderboardRow.cost` becomes `CostPair | undefined`, and `outputTokens` and `steps` become optional. A missing figure leaves its cell blank and propagates, as the [spec](../spec.md#leaderboard) lists: no cost means no cost per solved task and no effective cost on tier rows; no output tokens means no average time. Throughput still comes from the mapping's OpenRouter id. Tier rows are still produced, so the Subscriptions picker never changes row count. Blank cells already sort last.

Best entry, the effort filter and `modelOptions` treat vendor-reported entries like any other. Supersession is per model, so no model mixes sources.

## Acceptance criteria

- [ ] Fixture tests: a vendor-reported entry with Pass@1 only yields rows with blank cost, cost per solved task, output tokens, steps and average time, filled throughput, and one row per access route
- [ ] Fixture tests: an entry that does state cost carries it through, including the effective cost on tier rows
- [ ] Rows carry provenance, and DeepSWE rows are unchanged
- [ ] The column cells for Cost, Output tokens and Steps render blank for undefined values
- [ ] `vp check` and `vp test` pass
