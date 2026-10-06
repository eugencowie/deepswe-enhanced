# DeepSWE enhanced

Combines the DeepSWE leaderboard with OpenRouter throughput data and SemiAnalysis subscription research to compare models by effective cost, speed, and bang for buck — including what a task "really" costs on a subscription.

## Language

**Leaderboard**:
The derived, filterable set of rows this project computes from the snapshots: every entry combined with every access route its family allows. Distinct from the DeepSWE leaderboard, which is the upstream source.
_Avoid_: table model, ranking

**Leaderboard entry**:
One (model, effort level) result: Pass@1, average cost, output tokens, steps. Usually from the DeepSWE leaderboard; a vendor-reported entry comes from the vendor instead and often has Pass@1 alone.
_Avoid_: model row, result

**Vendor-reported entry**:
A leaderboard entry transcribed from a vendor's own DeepSWE v1.1 claim rather than the DeepSWE leaderboard, citing its source. Superseded per model, every effort level at once, when DeepSWE publishes the model (ADR 0009). Marked in the UI as an enhancement.
_Avoid_: self-reported, unofficial, unverified

**Effort level**:
The reasoning-effort setting a model was benchmarked at. Part of an entry's identity: the same model at two effort levels is two entries.

**Best entry**:
The leaderboard entry with the highest Pass@1 among a model's entries, compared on the raw fraction; on an exact tie the higher effort level wins. The Best view keeps only each model's best entry, which is often not its highest effort level. Chosen per model, so the same entry is best on every access route.
_Avoid_: best effort level, highest effort

**Access route**:
How you would pay to run a model: direct API, or a specific subscription tier. Every table row is an entry combined with one access route.
_Avoid_: pricing mode, plan type

**Access tag**:
The marker on a tier row naming its tier; API rows are untagged.
_Avoid_: tier badge, plan label

**Tier**:
A paid ChatGPT or Claude subscription plan (e.g. claude-max-5x, chatgpt-plus).
_Avoid_: subscription level, plan

**Filter**:
A feature and its state: what the user has applied to the leaderboard (effort view, models, access routes), held in `LeaderboardFilters`. Feature specs are named for their filter (effort-filter, model-filter, subscription-filter).
_Avoid_: using "filter" for the toolbar control itself; that is a picker

**Picker**:
A toolbar control that sets one filter: the effort buttons, the Models picker, the Subscriptions picker. The Subscriptions picker changes pricing, never row count, so its filter never removes rows.
_Avoid_: filter (for the control), selector, dropdown (as a name)

**Models picker**:
The toolbar control that sets the model filter: a checkbox per model with select-all and clear, and a toggle that lists or unlists the vendor-reported models. UI copy says "Models menu"; internal vocabulary stays "Models picker".
_Avoid_: model dropdown, model selector

**Subscriptions picker**:
The user-facing name of the access-route selector. Exactly one access route is selected per subscription family. "API" appears inside it even though API access is not a subscription; internal vocabulary stays "access route".

**Route card**:
The Subscriptions picker's popover: one column per subscription family, each a ladder of rungs (the API, then the family's tiers) with the tier's monthly price and tier discount on each rung.
_Avoid_: plan card, plan picker

**Subscription family**:
Which vendor's tiers can run a model: ChatGPT, Claude, or none. Every family has exactly one vendor, read from its model-mapping entries; that vendor's mark labels the family's column in the Subscriptions picker.

**Equivalent API spend**:
SemiAnalysis's approximation of the monthly API-priced usage a tier allows.
_Avoid_: max possible spend, usage allowance

**Usage multiplier**:
A per-model factor scaling equivalent API spend, capturing models with non-standard usage limits. Default 1.0; Fable 5 is 0.5 because Max caps Fable at 50% of weekly limits. Equivalent API spend is in dollars, so a model's higher token rates already account for it using limits faster.

**Excluded tier**:
A tier whose usage limits don't cover a model, so its subscribers run the model on usage credits at API rates. The model's subsidisation factor there is 1. Pro excludes Fable.
_Avoid_: unsupported tier (the model still runs)

**Subsidisation factor**:
Tier price ÷ (equivalent API spend × usage multiplier), or 1 on an excluded tier. What a dollar of API cost becomes on that tier.

**Tier discount**:
A subsidisation factor expressed as a percentage discount: 1 − factor. Shown in the Subscriptions picker per tier, at usage multiplier 1.0 unless labelled with a specific model.
_Avoid_: discount multiplier

**API cost**:
The entry's average cost at direct API pricing. On tier rows it appears struck out beside the effective cost, except on an excluded tier, where the two are equal.
_Avoid_: API price, list price

**Effective cost**:
The cost a row is ranked by: the API cost as-is on API rows, multiplied by the subsidisation factor on tier rows.
_Avoid_: subsidised cost, adjusted cost

**Cost per solved task**:
Effective cost ÷ Pass@1; undefined when Pass@1 is zero, even when cost is zero. The bang-for-buck number; lower is better.
_Avoid_: bang for buck, value score

**API cost per solved task**:
API cost ÷ Pass@1; undefined when Pass@1 is zero, even when API cost is zero.

**Throughput**:
The p50 tokens-per-second of a model's consumer endpoint, as measured by OpenRouter. One number per model, shared across effort levels; blank when the model has no consumer endpoint.
_Avoid_: speed, generation rate

**Consumer endpoint**:
The vendor-run API endpoint a typical non-enterprise user would hit (e.g. Anthropic direct rather than Claude on AWS, Google AI Studio rather than Vertex), selected by a per-vendor rule. Enterprise platforms, premium-speed products, and resellers are not consumer endpoints. UI copy says "consumer API"; internal vocabulary stays "consumer endpoint".
_Avoid_: official endpoint, default provider

**Average time**:
Output tokens ÷ throughput. Deliberately ignores latency, prompt processing, and tool-execution time.

**Column**:
One column of the leaderboard, with its header, cell and sort order. Every column is either a source column or a derived column.
_Avoid_: field, table column (as a name)

**Sort**:
The column the leaderboard is ordered by and its direction; there is always exactly one, and filters never change it. Blank cells go last whichever the direction.
_Avoid_: ordering, ranking

**Figure column**:
Every column but Model: one number per row, right-aligned, blank cells last whichever the sort direction.

**Source column**:
A leaderboard column reported verbatim by the DeepSWE leaderboard (Pass@1, average cost, output tokens, steps). Per-column, like derived column: on a vendor-reported entry's rows the figures come from the vendor, but the columns are still source columns.

**Enhancement**:
Anything the site adds over the DeepSWE leaderboard: the derived columns, the Subscriptions picker, and vendor-reported entries. Marked purple in the UI, the same colour as "enhanced" in the title.
_Avoid_: extra, add-on, custom column

**Derived column**:
A leaderboard column this project computes rather than takes from the DeepSWE leaderboard (cost per solved task, average time, throughput). The distinction is per-column, not per-cell: effective cost on tier rows is computed, but the Cost column is still a source column.

**Model mapping**:
The reviewed link from a leaderboard model to its display name, vendor, OpenRouter id, subscription family, usage multiplier, optional excluded tiers, and optional short name (falling back to the display name). Entries are written by hand or generated, always landing through human review.
_Avoid_: hand-curated (entries for known vendors are generated)

**Display name**:
The human-readable model name shown in the Model cell, derived from the OpenRouter listing name minus the vendor prefix and any revision token. Distinct from the leaderboard model id, which DeepSWE shows and which stays in the data.
_Avoid_: model slug, model id (as a UI term)

**Generated mapping entry**:
A model-mapping entry the refresh derives itself for a new model from a known vendor — one whose other models already appear in the mapping. Reviewed in the Refresh PR rather than written by hand; a new model from an unknown vendor still demands a hand-written entry.
_Avoid_: stub, auto-mapping

**Vendor**:
The company that makes and serves a model (Anthropic, Google, Moonshot, …), as named in the model mapping. Distinct from subscription family: family says whose tiers can run a model, vendor says who makes it.
_Avoid_: provider (OpenRouter's word for an endpoint operator), lab

**Vendor mark**:
The brand mark shown beside a model to identify its vendor — not always the vendor's corporate logo (Moonshot's mark is Kimi, Alibaba's is Qwen).
_Avoid_: provider icon, vendor logo

**Vendor mapping**:
The hand-curated link from a vendor to its consumer provider slug. Every vendor in the model mapping appears here; a vendor that runs no consumer endpoint is recorded explicitly rather than omitted.

**Consumer provider slug**:
The OpenRouter provider slug identifying a vendor's consumer endpoint (e.g. Google → google-ai-studio, not google).
_Avoid_: base slug, vendor base slug

**Org slug**:
The organisation segment of an OpenRouter model id (z-ai in z-ai/glm-5.3), used to recognise a known vendor when generating mapping entries. Not the consumer provider slug: the org slug names who publishes a model, the consumer provider slug names the endpoint that serves it.
_Avoid_: author, owner

**Data file**:
One of the checked-in JSON files the site and the refresh scripts read. Every data file is either a snapshot (DeepSWE, throughput, tiers, price revisions, vendor-reported entries) or a mapping (model mapping, vendor mapping); the site treats all of them alike, whoever last wrote them.
_Avoid_: refresh-written file, hand-maintained file (the model mapping is both), static data

**Snapshot**:
A checked-in, point-in-time capture of a source, refreshed only through human-reviewed commits, never at build or run time.
_Avoid_: live data, cache

**Refresh PR**:
The single weekly pull request through which every snapshot change and generated mapping entry reaches main; the human review gate for all of them.
_Avoid_: Friday PR, weekly PR, refresh PRs (plural)

**Price revision**:
The DeepSWE site's old and new list prices per million input, cached-input, and output tokens for a model, used to retroactively reprice that model's recorded costs. Published only inside the site's deployed bundle.
_Avoid_: rate table, repricing, display-cost factors

**Cost adjustment factor**:
The multiplier a price revision yields for one leaderboard entry: the entry's token mix priced at the new rates divided by the same mix at the old rates. Per entry, not per model; two effort levels of the same model can carry different factors. The snapshot keeps raw values beside adjusted ones.
_Avoid_: display factor, repricing factor, display-cost factor
