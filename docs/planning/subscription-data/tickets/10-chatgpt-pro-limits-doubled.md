# 10: ChatGPT Pro limits doubled

Type: task
Status: resolved
Blocked by: 06

## Problem

On 2026-10-29 OpenAI doubled the usage limits of Pro 100, Pro 200 and Pro 500, and dropped the Pro 200 cut it had planned for the end of the grandfathering period ([research/openai-2026-10-29.md](../research/openai-2026-10-29.md)). Our ChatGPT Pro values are SemiAnalysis's 2026-10-05 measurements, so every Pro tier now understates its usage limit by half and overstates its effective cost twice over. SemiAnalysis hasn't measured since.

## What to build

- **Limit adjustment.** An optional `limitAdjustment` on a tier in `tiers.json`: `{ factor, label, source, sourceUrl, publishedAt }`. The factor is positive, `label` is the masthead's link text, and `publishedAt` is an ISO date. Any tier may carry one. The transcribed `apiEquivalentValuesUsdPerMonth` stay as SemiAnalysis published them.
- **Derivation.** A model's API-equivalent value on a tier is its measured value, or the daily driver's for an unmeasured model, times the tier's limit adjustment. The subsidisation factor stays price ÷ API-equivalent value, and 1 on an excluded tier.
- **Data.** Pro 100, Pro 200 and Pro 500 each carry factor 2, label "OpenAI", the [announcing post](https://x.com/thsottiaux/status/2115850175868727621) and 2026-10-29. Plus is unchanged. Business Premium and dots aren't tiers we model. Pro 200 takes 2× its post-cut values (about its pre-cut level), not the measured pre-cut figures.
- **Masthead.** The Sources line adds each distinct limit adjustment, by source URL, after SemiAnalysis: "OpenAI (2026-10-29)".
- **Picker disclaimer.** One clause: ChatGPT Pro values are doubled per OpenAI's 2026-10-29 limit increase.
- **Docs.** The research note, the glossary's **API-equivalent value** and new **Limit adjustment** entries, and the subscription-data and subscription-filter specs. No ADR: the adjustment is meant to be deleted once SemiAnalysis measures again, so it is easy to reverse.

Expected rungs (GPT-6.1 Sol headline / Astra note):

| Tier | Before | After |
|---|---|---|
| Pro 100 | −91% / −92% | −95% / −96% |
| Pro 200 | −90% / −93% | −95% / −97% |
| Pro 500 | −91% / −93% | −95% / −96% |

## Acceptance criteria

- [x] GPT-6 Astra on Pro 500 uses factor 500 / (6,955 × 2), and an unmeasured ChatGPT model there 500 / (5,386 × 2). Plus is unchanged at 20 / 211.
- [x] The picker shows the rungs above.
- [x] The schema rejects a limit adjustment whose factor isn't positive.
- [x] The masthead lists "OpenAI (2026-10-29)" after SemiAnalysis, linked to the post.
- [x] The research note, glossary and both specs are updated.
- [x] `vp check` and `vp test` pass.

## Comments

**Resolved (2026-10-31):** Built as specified. Departures:

- **Whole percents.** The grilling's rung table had one decimal. The picker rounds to whole percents, so the table here does too.
- **SemiAnalysis research note.** Its pre-cut Pro 200 section now points at the 2026-10-29 note, so readers don't take the pre-cut figures as the ones used.
- **Disclaimer hardcoded.** The picker clause names ChatGPT Pro and the date by hand, while the masthead derives its entry from `tiers.json`. Deleting the adjustment means deleting that clause too.
