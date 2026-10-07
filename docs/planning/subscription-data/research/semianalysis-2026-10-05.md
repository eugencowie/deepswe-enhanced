# SemiAnalysis subscription values, 2026-10-05

Transcribed on 2026-10-07 from the public charts of [Anthropic Subscriptions Offer 5x+ More Value Than OpenAI](https://newsletter.semianalysis.com/p/anthropic-subscriptions-offer-5x) by Andrew Megalaa, Max Kan and Dylan Patel, published 2026-10-05.

The post is paywalled. Only the parts before the third-party section ("Third party plans are worse than first party") are public, and every figure below comes from a public chart. Each table links the chart images it was read from, so a reviewer can check every number.

## Which figures are used

[Ticket 04](../tickets/04-per-model-api-equivalent-values.md) and [ticket 06](../tickets/06-chatgpt-tier-lineup.md) use only the **agentic** values in the Claude table and the post-cut ChatGPT table. That includes the previous-generation columns (Opus 5, Fable 5 and GPT-6 Sol), which price those models' own rows.

These figures are recorded for context and **aren't used**:

- the pre-cut ChatGPT Pro 200 values;
- the chat-workload values;
- the other labs' plans (appendix), until [ticket 07](../tickets/07-other-labs-coding-plans.md) is triaged.

## Method

- **API-equivalent value** is the plan's full monthly usage limit priced at first-party list API rates. SemiAnalysis measures how far each plan's usage meters move per million tokens of each type (input, cache write, cache read, output). It converts that into tokens per limit, then prices a workload mix at API rates.
- **Agentic workload:** 0.4% input, 96.6% cached input, 2.6% cache writes, 0.3% output. This is SemiAnalysis's own usage mix in September 2026.
- **Chat workload:** 2% input, 75% cached input, 13% cache writes, 10% output.
- **Monthly cap.** The 5-hour limit resets many times a week, so a month is capped by the weekly meters.
- **Fable cap.** On Max, Fable can use at most half of the plan's usage limit. Fable's values already include that cap.

## Claude, agentic, per month

Sources:

- [flagship by plan](https://substack-post-media.s3.amazonaws.com/public/images/181ea48e-2e63-4f41-a742-c7af3d7eeb15_2048x1157.png) (Fable 5.1)
- [medium models by plan](https://substack-post-media.s3.amazonaws.com/public/images/44bfcff4-5589-4822-a348-bc4e83cf478b_2048x1161.png) (Opus 5.5)
- [Claude gross margin table](https://substack-post-media.s3.amazonaws.com/public/images/8fc90004-5853-4cd5-87ff-465898c5ee6b_2048x1033.png) (Sonnet 5.5, Opus 5.5, Fable 5.1)
- [model successors](https://substack-post-media.s3.amazonaws.com/public/images/60858e51-902d-421f-808d-34bc93b4b37a_2048x1113.png) (Opus 5 → Opus 5.5, Fable 5 → Fable 5.1)

| Plan | Fee | Sonnet 5.5 | Opus 5.5 | Fable 5.1 | Opus 5 (previous) | Fable 5 (previous) |
|---|---|---|---|---|---|---|
| Claude Pro | $20 | $1,241 | $1,178 | not included | $1,437 | not included |
| Claude Max 5x | $100 | $5,919 | $5,725 | $1,273 | $8,770 | $2,350 |
| Claude Max 20x | $200 | $12,529 | $11,726 | $2,485 | $17,275 | $4,713 |

Sonnet 5.5, Opus 5.5 and Fable 5.1 are the current generation. Opus 5 and Fable 5 are the previous generation. Their values come from the successor chart's "before" figures.

Fable isn't included in Claude Pro. The flagship chart and the gross margin table both say so, and the successor chart has no Pro row for Fable.

## ChatGPT, agentic, per month, after the 2026-09-29 cut

Sources:

- [flagship by plan](https://substack-post-media.s3.amazonaws.com/public/images/181ea48e-2e63-4f41-a742-c7af3d7eeb15_2048x1157.png) (GPT-6 Astra: Plus, Pro 100, Pro 200)
- [medium models by plan](https://substack-post-media.s3.amazonaws.com/public/images/44bfcff4-5589-4822-a348-bc4e83cf478b_2048x1161.png) (GPT-6.1 Sol: Plus, Pro 100, Pro 200)
- [ChatGPT gross margin table](https://substack-post-media.s3.amazonaws.com/public/images/e674e5f4-cf61-425a-8db7-90395d9ade21_2048x1036.png) (GPT-6 Astra and GPT-6.1 Sol on every plan, including Pro 500)
- [model successors](https://substack-post-media.s3.amazonaws.com/public/images/60858e51-902d-421f-808d-34bc93b4b37a_2048x1113.png) (GPT-6 Sol → GPT-6.1 Sol)

| Plan | Fee | GPT-6 Astra | GPT-6.1 Sol | GPT-6 Sol (previous) |
|---|---|---|---|---|
| ChatGPT Plus | $20 | $162 | $211 | $262 |
| ChatGPT Pro 100 | $100 | $1,322 | $1,055 | $1,482 |
| ChatGPT Pro 200 | $200 | $2,897 | $2,084 | $2,910 |
| ChatGPT Pro 500 | $500 | $6,955 | $5,386 | $7,352 |

GPT-6 Astra and GPT-6.1 Sol are the current generation. GPT-6 Sol is the previous generation, and its values come from the successor chart's "before" figures. Those figures are post-cut too. The chart has a Pro 500 row, and Pro 500 launched with the cut. Its GPT-6 Sol Pro 200 tokens (9.7B a month) are also about half the pre-cut figure (19.6B). The Opus 5 and Fable 5 values from the same chart are treated as current on the same basis.

OpenAI no longer advertises relative usage ("5x", "20x"). The plans are named by price: Plus, Pro 100, Pro 200 and Pro 500.

### Pre-cut Pro 200 (not used)

Source: [Pro 200 before and after](https://substack-post-media.s3.amazonaws.com/public/images/2c53c9a0-1c69-4ee8-8e47-f86ae0655c0f_2048x1082.png).

On 2026-09-29 OpenAI halved Pro 200's limits and added Pro 500.

| Model | Before | After |
|---|---|---|
| GPT-6 Astra | $5,734 (3.8B tokens) | $2,897 (1.9B tokens) |
| GPT-6 Sol → GPT-6.1 Sol | $5,904 (19.6B tokens) | $2,084 (10.2B tokens) |

Pro 200 plans bought before the cut keep the old limits until 2026-10-29. New plans get the lower limits straight away. These figures aren't used, because the grandfathered limits expire within a month.

## Chat workload, Claude Max 20x (not used)

Source: [Max 20x by model and workload](https://substack-post-media.s3.amazonaws.com/public/images/e61e3841-450f-4662-a21f-dc0f844d05ab_2000x1126.png).

| Model | Agentic | Chat |
|---|---|---|
| Sonnet 5.5 | $12,529 | $7,009 |
| Opus 5.5 | $11,726 | $9,200 |
| Fable 5.1 | $2,485 | $2,480 |

The public charts have chat-workload figures only for Max 20x. DeepSWE measures agentic coding, so the agentic values are used everywhere.

## Appendix: other labs (for ticket 07)

All values are agentic, per month.

### Chinese labs

Source: [Chinese labs' coding plans](https://substack-post-media.s3.amazonaws.com/public/images/c5c0445c-0292-4c32-9980-17c4d4fa175b_2048x1116.png).

| Lab | Plan | Fee | Model | Value |
|---|---|---|---|---|
| Z.ai | GLM Coding Lite | $18 | GLM-5.3 | $139 |
| Z.ai | GLM Coding Lite | $18 | GLM-5.3-Flash | $24 |
| Z.ai | GLM Coding Pro | $80 | GLM-5.3 | $830 |
| Z.ai | GLM Coding Pro | $80 | GLM-5.3-Flash | $143 |
| Z.ai | GLM Coding Max | $168 | GLM-5.3 | $1,942 |
| Z.ai | GLM Coding Max | $168 | GLM-5.3-Flash | $336 |
| MiniMax | Token Plus | $22 | MiniMax-M3 | $427 |
| MiniMax | Token Max | $55 | MiniMax-M3 | $1,305 |
| MiniMax | Token Ultra | $132 | MiniMax-M3 | $3,088 |
| Moonshot | Kimi Code Plus | $19 | Kimi K3 | $47 |
| Moonshot | Kimi Code Pro | $39 | Kimi K3 | $209 |
| Moonshot | Kimi Code Max | $99 | Kimi K3 | $647 |
| Moonshot | Kimi Code Ultra | $199 | Kimi K3 | $1,343 |

### Single plans

Source: [dashboard screenshot, "Compare" tab](https://substack-post-media.s3.amazonaws.com/public/images/6e451f84-a586-40da-90c8-5e2fcd196222_2048x1077.png).

| Plan | Fee | Model | Value |
|---|---|---|---|
| Muse Code Power Usage | $50 | Muse Spark 1.3 | $2,566 |
| SuperGrok Heavy | $300 | Grok 4.7 | $5,832 |
| Cursor Ultra | $200 | Composer 2.5 | $3,041 |

The screenshot shows only each lab's top plan. Its "Promo" toggle is selected, so these values may include promotional limits. Check that before using them. The same screenshot's figures for MiniMax Token Ultra, ChatGPT Pro 200 and Pro 500 (Astra), Claude Max 20x (Fable 5.1), GLM Coding Max and Kimi Code Ultra match the charts above.
