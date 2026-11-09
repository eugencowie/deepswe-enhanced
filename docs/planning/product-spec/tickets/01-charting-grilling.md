# Charting grilling: destination and core decisions

Type: grilling
Status: resolved

## Question

What is this effort's destination, and what shape does the subsidised leaderboard take: deliverable form, data model, subsidisation maths, table UX, stack, and hosting?

## Answer

Resolved live with the user while charting the map (2026-08-20). Vocabulary below is defined in [docs/glossary.md](../../../glossary.md).

### Destination

A **spec** at `docs/planning/product-spec/spec.md`, complete enough for a build session to execute without further decisions. Building the app is a separate, later effort.

### Source data

- Leaderboard: <https://deepswe.datacurve.ai>, specifically the **v1.1 table with all effort levels expanded**. Columns: Model, Pass@1, Average cost, Output tokens, Steps. Machine-readability unknown (ticket 02).
- Throughput: OpenRouter, one number per model (median/default across providers if multiple). API details unknown (ticket 03).
- Subscription figures: SemiAnalysis research, supplied directly by the user (screenshot transcribed below) — no research needed:

| Tier | Price | Equivalent API spend |
|---|---|---|
| claude-pro | $20/mo | $400/mo |
| claude-max-5x | $100/mo | $2,000/mo |
| claude-max-20x | $200/mo | $8,000/mo |
| chatgpt-plus | $20/mo | $700/mo |
| chatgpt-pro-5x | $100/mo | $3,500/mo |
| chatgpt-pro-20x | $200/mo | $14,000/mo |

### Row model

- Every leaderboard entry gets an **API row** (cost as published).
- Entries whose subscription family is ChatGPT or Claude additionally get **one row per tier** of that family (all six tiers in scope).
- An access-route column identifies each row; rows are never hidden for missing data — blank cells render as "–" and sort last.

### Maths

- **Subsidisation factor** = tier price ÷ (equivalent API spend × usage multiplier).
- **Usage multiplier**: per-model field in the mapping, default 1.0. **Fable 5 = 0.5** (its subscription limits are cut 50%, so e.g. claude-pro's $400/mo counts as $200/mo for Fable rows). Modelled as a general field, not a hardcoded rule.
- **Effective cost** = average cost × subsidisation factor (tier rows); average cost unchanged (API rows).
- **Average time** = output tokens ÷ throughput. No latency/step-overhead modelling — consistent roughness is the point.
- **Cost per solved task** = effective cost ÷ Pass@1, computed on every row including tier rows.

### Model mapping

Hand-curated mapping file: leaderboard model → OpenRouter id, subscription family, usage multiplier. Effort levels share one mapping entry (one throughput figure per model). Curation beats fuzzy matching at this dataset size.

### Table UX

- Columns: Model, Effort, Access, Pass@1, Effective cost, Avg time, Cost per solved task, Output tokens, Steps, Throughput.
- Filters: vendor, access route, effort level, plus per-model include/exclude (tick/untick dropdown like the DeepSWE site's).
- Default sort: Pass@1 descending.

### Stack and hosting

- **Vite + React + TypeScript + TanStack Table.** User's suggestion, confirmed after weighing alternatives: the feature set (custom sort comparators, faceted filters, row include/exclude) is exactly what TanStack Table provides, the user already works in this ecosystem, and lighter options save nothing that matters at this scale. Data is checked-in JSON **imported at build time** (typed, no runtime fetch).
- Refresh scripts in **TypeScript** (run with `tsx`), sharing data-shape types with the app.
- Hosting: **GitHub Pages** via a GitHub Actions workflow. Public repo `deepswe-enhanced` (no remote exists yet; creation is build-phase work for the spec to cover).
