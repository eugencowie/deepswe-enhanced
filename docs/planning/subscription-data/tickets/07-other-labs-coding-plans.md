# 07: Coding plans from other labs

Type: grilling
Status: needs-triage
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

- [ ] The grilling outcome is recorded here and broken into tickets.
