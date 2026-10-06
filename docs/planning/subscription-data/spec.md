# Spec: Subscription data

Adds subscription-subsidised effective costs to the [leaderboard table](../leaderboard-table/spec.md): the SemiAnalysis tier figures, tier rows, the subsidisation maths, the access tag, and the struck-out API cost. Vocabulary: access route, access tag, tier, equivalent API spend, usage multiplier, subsidisation factor, API cost, effective cost in [docs/context.md](../../context.md).

## Data file: `data/tiers.json`

The SemiAnalysis figures, verbatim from the user:

```json
{
  "source": "SemiAnalysis, transcribed by user 2026-08-20",
  "tiers": [
    { "id": "claude-pro",     "family": "claude",  "label": "Claude Pro",      "priceUsdPerMonth": 20,  "equivalentApiSpendUsdPerMonth": 400 },
    { "id": "claude-max-5x",  "family": "claude",  "label": "Claude Max 5x",   "priceUsdPerMonth": 100, "equivalentApiSpendUsdPerMonth": 2000 },
    { "id": "claude-max-20x", "family": "claude",  "label": "Claude Max 20x",  "priceUsdPerMonth": 200, "equivalentApiSpendUsdPerMonth": 8000 },
    { "id": "chatgpt-plus",   "family": "chatgpt", "label": "ChatGPT Plus",    "priceUsdPerMonth": 20,  "equivalentApiSpendUsdPerMonth": 700 },
    { "id": "chatgpt-pro-5x", "family": "chatgpt", "label": "ChatGPT Pro 5x",  "priceUsdPerMonth": 100, "equivalentApiSpendUsdPerMonth": 3500 },
    { "id": "chatgpt-pro-20x","family": "chatgpt", "label": "ChatGPT Pro 20x", "priceUsdPerMonth": 200, "equivalentApiSpendUsdPerMonth": 14000 }
  ]
}
```

## Model mapping fields

`family`, `usageMultiplier` and `excludedTiers` in the [model mapping](../model-data/spec.md). Family membership asserts genuine subscription access (user's best knowledge of the plans, not research-verified). If a mapped model turns out to be API-only, flip its family to `none` — one-line fix.

`excludedTiers` is optional: the ids of tiers whose usage limits don't cover the model, validated against the tier ids. Fable 5 sets `["claude-pro"]`: Anthropic's [Claude Fable models on your plan](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan) says Pro runs Fable on usage credits, which [are billed at standard API rates](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans). The same page caps Fable at 50% of Max's weekly limits, which the 0.5 multiplier encodes. (Added in ticket 02.)

## Derivation rules

Row expansion: entries whose family is claude or chatgpt get one row per tier of that family beside their API row. Current data: 62 entries → 62 API rows + (21 Claude entries + 20 ChatGPT entries) × 3 tiers = **185 rows**. (An earlier revision said 191 via 22 ChatGPT entries — that was an arithmetic error; the checked-in data and research capture both have 20.)

Per row:

- `subsidisationFactor` = `tier.priceUsdPerMonth / (tier.equivalentApiSpendUsdPerMonth × usageMultiplier)` (tier rows only). E.g. claude-pro = 0.05; for Fable 5 on claude-max-5x, 100 / (2000 × 0.5) = 0.10. On a tier in the entry's `excludedTiers` the factor is 1. The excluded tier keeps its row, because the picker changes pricing, never row count (ticket 02).
- `effectiveCost` = `average_cost_usd` (API rows) or `average_cost_usd × subsidisationFactor` (tier rows). [Cost per task data](../cost-per-task-data/spec.md) divides the effective cost, so tier rows recompute it.

## App

- Access route is **not** a column — it renders inside the Model cell as a tag on tier rows (exact styling decided in ticket 01).
- Tier-row Cost and Cost/perf cells show the API cost first, struck through and muted, then the effective value in normal weight (the Cost/perf struck value is API cost ÷ Pass@1; Pass@1 = 0 renders one blank cell, no struck blank). Where the two are equal (an excluded tier) the cell shows the cost once, unstruck, and the access tag stays (ticket 02). No per-cell "(e)" marker — the estimate caveat lives in the Subscriptions picker's disclaimer instead. Both columns sort by effective values. API-row Avg cost is the unadjusted average cost. (Strikeout added in subscription-filter ticket 01's grilling; the "(e)" removed in the same ticket's follow-up.)
- Sub-cent costs collapse to $0.01 or $0.00, which is deliberate — tiny tier costs should read as "effectively free" rather than invite comparison of raw values.
- Masthead provenance line: SemiAnalysis linked with the figures' publication date, as "SemiAnalysis (2026-06-10)" in the Sources list. The estimate caveat lives in the Subscriptions picker only (ticket 01 had "Subscription costs are rough estimates from SemiAnalysis figures" in the masthead; shortened in [design ticket 02](../design/tickets/02-ledger-page-layout.md)).

## Acceptance criteria

- The dataset derives 185 rows. Spot-checked maths: Fable 5's Max tier rows use half the equivalent spend (claude-max-5x factor 0.10, not 0.05), and its claude-pro rows use factor 1.
- Unit tests cover row expansion and subsidisation (incl. multiplier and excluded tiers).

## Tickets

- [01: Tier rows and subsidisation](tickets/01-tier-rows-subsidisation.md)
- [02: Fable models on Claude Pro](tickets/02-fable-excluded-from-pro.md)
- [03: Transcribe the Oct 5 SemiAnalysis figures](tickets/03-transcribe-semianalysis-2026-10-05.md)
- [04: Price tier rows from measured per-model values](tickets/04-per-model-api-equivalent-values.md)
- [05: Flagship note in the Subscriptions picker](tickets/05-flagship-note.md)
- [06: ChatGPT Plus / Pro 100 / Pro 200 / Pro 500](tickets/06-chatgpt-tier-lineup.md)
- [07: Coding plans from other labs](tickets/07-other-labs-coding-plans.md)

The struck-out API cost was built in [subscription-filter ticket 01](../subscription-filter/tickets/01-strikeout-api-cost-exclusive-picker.md).
