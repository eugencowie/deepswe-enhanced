# 07: Coding plans from other labs

Type: grilling
Status: resolved
Blocked by: 04

## Problem

Only Claude and ChatGPT have subscription tiers. SemiAnalysis's Oct 5 post ([ticket 03](03-transcribe-semianalysis-2026-10-05.md), appendix) also measured coding plans for models already on the leaderboard:

- **GLM Coding** Lite, Pro and Max: `glm-5-3` and `glm-5-3-flash`.
- **Kimi Code** Plus, Pro, Max and Ultra: `kimi-k3`.
- **SuperGrok Heavy:** `grok-4-7`.
- **Muse Code Power Usage:** `muse-spark-1-3`.

Each of these models is in family `none`, so it has only an API row and the Subscriptions picker ignores it. MiniMax-M3 (Token plans) and Cursor's Composer 2.5 (Cursor Ultra) aren't on the leaderboard.

## Questions to settle

- Which plans to add. Some families have a single measured plan, and older models in the family (`glm-5-2`, `kimi-k2-7-code`, `grok-4-5`/`4-6`, `muse-spark-1-1`/`1-2`) would fall back to the daily driver.
- How the picker scales from two families to six (layout, vendor marks).
- The daily driver and flagship for each family. GLM has two measured models. The others have one.
- Whether each family's membership needs a primary source, as Fable's exclusion had.

## Acceptance criteria

- [x] The grilling outcome is recorded here and broken into tickets.

## Comments

**Resolved (2026-10-07):** Broken into [ticket 08](08-kimi-code-tiers.md) (Kimi Code, plus the general changes) and [ticket 09](09-glm-coding-tiers.md) (GLM Coding, blocked by 08). Decisions:

- **Which plans.** GLM Coding Lite / Pro / Max and Kimi Code Plus / Pro / Max / Ultra. SuperGrok Heavy and Muse Code are left out without a ticket: their only figures come from one dashboard screenshot with "Promo" on, Grok 4.7 and Muse Spark 1.3 have only vendor-reported results, and Muse Code doesn't say it covers 1.3. GLM's values may include Z.ai's promos too, but the source is dated and nothing better exists, so they're used as published.
- **Vocabulary.** "Tier" and "subscription family" widen to any vendor's subscription. "Flagship" widens to the optional model noted beneath the daily driver.
- **Daily driver and flagship.** Kimi: Kimi K3, no flagship (its rungs show no note). GLM: GLM 5.3, with GLM 5.3 Flash as flagship, labelled "Flash".
- **Membership needs a primary source.** A model joins a family, and falls back to the daily driver's value, only when the vendor says the plan serves it. GLM 5.2 (rerouted to GLM 5.3) and Kimi K2.7 Code (only a HighSpeed variant is covered) stay in `none`. ADR 0011 records this and the optional flagship.
- **Picker.** The two-column grid wraps. Columns run Claude, ChatGPT, then the others alphabetically by vendor.
- **Ids and labels.** Families `kimi` and `glm`, headed "Kimi Code" and "GLM Coding". Tier ids `kimi-code-*` and `glm-coding-*`, short labels the plan word.
- **GLM prices** are Z.ai's undiscounted list prices, confirmed on z.ai/subscribe. The possible promo inflation goes in the research file only.
