# Spec: Subscription data

Adds subscription-subsidised effective costs to the [leaderboard table](../leaderboard-table/spec.md): the SemiAnalysis tier figures, tier rows, the subsidisation maths, the access tag, and the struck-out API cost. Vocabulary: access route, access tag, tier, API-equivalent value, daily driver, flagship, excluded tier, subsidisation factor, API cost, effective cost in [docs/context.md](../../context.md).

## Data file: `data/tiers.json`

SemiAnalysis's agentic-workload API-equivalent values, per tier and measured model, from [Anthropic Subscriptions Offer 5x+ More Value Than OpenAI](https://newsletter.semianalysis.com/p/anthropic-subscriptions-offer-5x) (2026-10-05). Every figure is transcribed, with its chart, in [research/semianalysis-2026-10-05.md](research/semianalysis-2026-10-05.md) (ticket 03). Values are keyed by leaderboard model id. The ChatGPT tier ids are unchanged for now: Pro 5x takes the Pro 100 values and Pro 20x the post-cut Pro 200 values ([ticket 06](tickets/06-chatgpt-tier-lineup.md) renames them).

```json
{
  "source": "SemiAnalysis, transcribed 2026-10-07",
  "sourceUrl": "https://newsletter.semianalysis.com/p/anthropic-subscriptions-offer-5x",
  "publishedAt": "2026-10-05T20:01:09Z",
  "families": {
    "claude":  { "dailyDriverModel": "claude-opus-5-5", "flagshipModel": "claude-fable-5-1", "flagshipLabel": "Fable" },
    "chatgpt": { "dailyDriverModel": "gpt-6-1-sol",     "flagshipModel": "gpt-6-astra",      "flagshipLabel": "Astra" }
  },
  "tiers": [
    {
      "id": "claude-max-20x", "family": "claude", "label": "Claude Max 20x", "shortLabel": "Max 20x", "priceUsdPerMonth": 200,
      "apiEquivalentValuesUsdPerMonth": {
        "claude-sonnet-5-5": 12529, "claude-opus-5-5": 11726, "claude-fable-5-1": 2485, "claude-opus-5": 17275, "claude-fable-5": 4713
      }
    }
  ]
}
```

(One tier shown; the file has all six.)

| Tier | Price | Sonnet 5.5 | Opus 5.5 | Fable 5.1 | Opus 5 | Fable 5 |
|---|---|---|---|---|---|---|
| claude-pro | $20 | $1,241 | $1,178 | excluded | $1,437 | excluded |
| claude-max-5x | $100 | $5,919 | $5,725 | $1,273 | $8,770 | $2,350 |
| claude-max-20x | $200 | $12,529 | $11,726 | $2,485 | $17,275 | $4,713 |

| Tier | Price | GPT-6 Astra | GPT-6.1 Sol | GPT-6 Sol |
|---|---|---|---|---|
| chatgpt-plus | $20 | $162 | $211 | $262 |
| chatgpt-pro-5x | $100 | $1,322 | $1,055 | $1,482 |
| chatgpt-pro-20x | $200 | $2,897 | $2,084 | $2,910 |

`families` names each family's daily driver and flagship, with the flagship's label. They are the same on every tier of a family, so they are per family, not per tier. The flagship fields are read by [ticket 05](tickets/05-flagship-note.md).

Load-time validation (ADR 0004) rejects:

- a value for a model missing from the mapping, or for a model outside the tier's family;
- a tier with no value for its family's daily driver (an exclusion can't stand in, since unmeasured models fall back to it);
- a tier with neither a value nor an exclusion for its family's flagship.

## Model mapping fields

`family` and `excludedTiers` in the [model mapping](../model-data/spec.md). Family membership asserts genuine subscription access (user's best knowledge of the plans, not research-verified). If a mapped model turns out to be API-only, flip its family to `none` — one-line fix.

`excludedTiers` is optional: the ids of tiers whose usage limits don't cover the model, validated against the tier ids. Fable 5 and Fable 5.1 set `["claude-pro"]`: Anthropic's [Claude Fable models on your plan](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan) says Pro runs Fable on usage credits, which [are billed at standard API rates](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans). It stays in the mapping, not `tiers.json`, because it comes from Anthropic's docs rather than SemiAnalysis. (Added in ticket 02.)

## Derivation rules

Row expansion: entries whose family is claude or chatgpt get one row per tier of that family beside their API row. Current data: 62 entries → 62 API rows + (21 Claude entries + 20 ChatGPT entries) × 3 tiers = **185 rows**. (An earlier revision said 191 via 22 ChatGPT entries — that was an arithmetic error; the checked-in data and research capture both have 20.)

Per row:

- `subsidisationFactor` = `tier.priceUsdPerMonth / apiEquivalentValue` (tier rows only), where `apiEquivalentValue` is the model's own value on the tier or, for a model SemiAnalysis didn't measure, the family daily driver's (ADR 0010). E.g. Fable 5.1 on claude-max-20x = 200 / 2,485; Sonnet 4.6 there takes Opus 5.5's value, 200 / 11,726. On a tier in the entry's `excludedTiers` the factor is 1. The excluded tier keeps its row, because the picker changes pricing, never row count (ticket 02).
- `effectiveCost` = `average_cost_usd` (API rows) or `average_cost_usd × subsidisationFactor` (tier rows). [Cost per task data](../cost-per-task-data/spec.md) divides the effective cost, so tier rows recompute it.

## App

- Access route is **not** a column — it renders inside the Model cell as a tag on tier rows (exact styling decided in ticket 01).
- Tier-row Cost and Cost/perf cells show the API cost first, struck through and muted, then the effective value in normal weight (the Cost/perf struck value is API cost ÷ Pass@1; Pass@1 = 0 renders one blank cell, no struck blank). Where the two are equal (an excluded tier) the cell shows the cost once, unstruck, and the access tag stays (ticket 02). No per-cell "(e)" marker — the estimate caveat lives in the Subscriptions picker's disclaimer instead. Both columns sort by effective values. API-row Avg cost is the unadjusted average cost. (Strikeout added in subscription-filter ticket 01's grilling; the "(e)" removed in the same ticket's follow-up.)
- Sub-cent costs collapse to $0.01 or $0.00, which is deliberate — tiny tier costs should read as "effectively free" rather than invite comparison of raw values.
- Masthead provenance line: SemiAnalysis linked with the figures' publication date, as "SemiAnalysis (2026-10-05)" in the Sources list. The estimate caveat lives in the Subscriptions picker only (ticket 01 had "Subscription costs are rough estimates from SemiAnalysis figures" in the masthead; shortened in [design ticket 02](../design/tickets/02-ledger-page-layout.md)).

## Acceptance criteria

- The dataset derives 185 rows. Spot-checked maths: Fable 5.1 on claude-max-20x uses factor 200 / 2,485, an unmeasured Claude model there uses Opus 5.5's 200 / 11,726, and Fable's claude-pro rows use factor 1 (ticket 04).
- Unit tests cover row expansion and subsidisation (incl. measured values, the daily-driver fallback and excluded tiers).

## Tickets

- [01: Tier rows and subsidisation](tickets/01-tier-rows-subsidisation.md)
- [02: Fable models on Claude Pro](tickets/02-fable-excluded-from-pro.md)
- [03: Transcribe the Oct 5 SemiAnalysis figures](tickets/03-transcribe-semianalysis-2026-10-05.md)
- [04: Price tier rows from measured per-model values](tickets/04-per-model-api-equivalent-values.md)
- [05: Flagship note in the Subscriptions picker](tickets/05-flagship-note.md)
- [06: ChatGPT Plus / Pro 100 / Pro 200 / Pro 500](tickets/06-chatgpt-tier-lineup.md)
- [07: Coding plans from other labs](tickets/07-other-labs-coding-plans.md)

The struck-out API cost was built in [subscription-filter ticket 01](../subscription-filter/tickets/01-strikeout-api-cost-exclusive-picker.md).
