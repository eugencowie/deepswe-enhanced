# 11: Limit adjustment review follow-ups

Type: task
Status: resolved
Blocked by: 10

## Problem

The review of [ticket 10](10-chatgpt-pro-limits-doubled.md) found four gaps. The picker disclaimer names ChatGPT Pro and the date by hand, so deleting the limit adjustment would leave a false sentence. `App.tsx` walks `tiersSnapshot.tiers` itself, though the leaderboard module owns tier questions (ADR 0005). ADR 0010's rejected "recalibrated multipliers" reads like a conflict nobody flagged. Pro 100's rung and the masthead entry are untested.

## What to build

- **Leaderboard.** `createLeaderboard` returns `limitAdjustments`: one per source URL, `{ factor, label, sourceUrl, publishedAt, tierLabels }`, with `tierLabels` the tiers' full labels in `tiers.json` order.
- **Load-time check.** `assertTierValues` rejects two limit adjustments that share a source URL but differ in factor, label, source or date, since grouping by URL relies on them agreeing.
- **Masthead.** Reads `leaderboard.limitAdjustments`; `App.tsx` no longer touches the tiers.
- **Picker disclaimer.** Appends, per adjustment, "×{factor} on {tier labels} per {label}'s {date} limit change", the labels joined with "and". No adjustments, no clause. Today: "…(agentic workload), ×2 on ChatGPT Pro 100, ChatGPT Pro 200 and ChatGPT Pro 500 per OpenAI's 2026-10-29 limit change."
- **ADR 0010.** A dated amendment bullet, in ADR 0004's style, recording the limit adjustment and how it differs from the deleted usage multiplier.
- **Docs.** The subscription-data spec (masthead, derivation) and the subscription-filter spec (disclaimer).

Unchanged: `limitAdjustment` stays per tier, keeps the name `label`, and the dated provenance fields aren't extracted into a helper.

## Acceptance criteria

- [x] `createLeaderboard` returns one limit adjustment covering the three ChatGPT Pro tiers.
- [x] `assertTierValues` rejects adjustments sharing a source URL that disagree.
- [x] Unit tests pin Pro 100's headline and Astra note.
- [x] The e2e tests check the masthead's "OpenAI" link and the "×2 on ChatGPT Pro 100" clause.
- [x] ADR 0010 and both specs are updated.
- [x] `vp check`, `vp test` and the e2e tests pass.

## Comments

**Resolved (2026-11-01):** Built as specified. Departure:

- **`source` carried.** Each of `createLeaderboard`'s `limitAdjustments` spreads the whole adjustment, so it carries `source` beside the agreed fields. Stripping it would cost code for no gain.
