# 03: Transcribe the Oct 5 SemiAnalysis figures

Type: task
Status: resolved
Blocked by: none

## Problem

The tier figures come from a [June SemiAnalysis post](https://x.com/SemiAnalysis_/status/2064815044085318040) that the user transcribed from a screenshot. Nothing in the repo records those numbers or checks them against a source. On 2026-10-05 SemiAnalysis published [Anthropic Subscriptions Offer 5x+ More Value Than OpenAI](https://newsletter.semianalysis.com/p/anthropic-subscriptions-offer-5x). It measures subscription limits per (plan, model, token type) and reports an API-equivalent value per (plan, model, workload). Tickets 04 and 06 need those figures in one place with their provenance.

## What to build

Add a research file under this feature's `research/` directory, matching the existing research files in `docs/planning/`. It should hold:

- **Source.** The post's URL, title, authors (Andrew Megalaa, Max Kan, Dylan Patel) and publication date (2026-10-05). The post is paywalled, and only the parts before the third-party section are public. Every figure here comes from the public charts.
- **Method summary.** How the API-equivalent value is defined: the plan's full monthly usage limit priced at first-party list API rates. Note the shape of the agentic workload (0.4% input, 96.6% cached input, 2.6% cache writes, 0.3% output). Note that monthly limits are capped by the weekly meters. Note that Fable's values already include Max's 50% Fable cap.
- **Claude values, agentic, per month.** Every plan for Sonnet 5.5, Opus 5.5, Fable 5.1, Opus 5 and Fable 5, marked as current or previous generation. Fable is not included in Claude Pro.
- **ChatGPT values, agentic, per month.** Use the post-cut figures (from 2026-09-29) for every plan: Plus, Pro 100, Pro 200 and Pro 500, for GPT-6 Astra, GPT-6.1 Sol and GPT-6 Sol. Record the pre-cut Pro 200 figures and the grandfathering date (2026-10-29) for context, and say they aren't used.
- **Chat-workload figures.** Note they exist only for Max 20x and aren't used.
- **Appendix: other labs.** GLM Coding Lite/Pro/Max (GLM-5.3, GLM-5.3-Flash), MiniMax Token Plus/Max/Ultra, Kimi Code Plus/Pro/Max/Ultra, Muse Code Power Usage (Muse Spark 1.3), SuperGrok Heavy (Grok 4.7) and Cursor Ultra, with their fees. This is for ticket 07.
- **Provenance.** The chart image URL beside each table, so a reviewer can check every number.

## Acceptance criteria

- [x] Every value that tickets 04 and 06 use appears in the research file, next to the URL of the chart it was read from.
- [x] A reviewer has checked each figure against its chart, not against the reading in Comments below.
- [x] Previous-generation, pre-cut and chat-workload figures are labelled, and the file says which ones are used.
- [x] `vp check` passes.

## Comments

**Reading taken during the grilling (2026-10-06).** Start from this, but verify it against the charts.

Claude, agentic. Sources: [medium models by plan](https://substack-post-media.s3.amazonaws.com/public/images/44bfcff4-5589-4822-a348-bc4e83cf478b_2048x1161.png), [flagship by plan](https://substack-post-media.s3.amazonaws.com/public/images/181ea48e-2e63-4f41-a742-c7af3d7eeb15_2048x1157.png), [Claude gross margin table](https://substack-post-media.s3.amazonaws.com/public/images/8fc90004-5853-4cd5-87ff-465898c5ee6b_2048x1033.png), [model successors](https://substack-post-media.s3.amazonaws.com/public/images/60858e51-902d-421f-808d-34bc93b4b37a_2048x1113.png).

| Plan | Fee | Sonnet 5.5 | Opus 5.5 | Fable 5.1 | Opus 5 (prev) | Fable 5 (prev) |
|---|---|---|---|---|---|---|
| Claude Pro | $20 | $1,241 | $1,178 | not included | $1,437 | not included |
| Claude Max 5x | $100 | $5,919 | $5,725 | $1,273 | $8,770 | $2,350 |
| Claude Max 20x | $200 | $12,529 | $11,726 | $2,485 | $17,275 | $4,713 |

ChatGPT, agentic, post-cut. Sources: [flagship by plan](https://substack-post-media.s3.amazonaws.com/public/images/181ea48e-2e63-4f41-a742-c7af3d7eeb15_2048x1157.png), [medium models by plan](https://substack-post-media.s3.amazonaws.com/public/images/44bfcff4-5589-4822-a348-bc4e83cf478b_2048x1161.png), [ChatGPT gross margin table](https://substack-post-media.s3.amazonaws.com/public/images/e674e5f4-cf61-425a-8db7-90395d9ade21_2048x1036.png), [model successors](https://substack-post-media.s3.amazonaws.com/public/images/60858e51-902d-421f-808d-34bc93b4b37a_2048x1113.png).

| Plan | Fee | GPT-6 Astra | GPT-6.1 Sol | GPT-6 Sol (prev) |
|---|---|---|---|---|
| ChatGPT Plus | $20 | $162 | $211 | $262 |
| ChatGPT Pro 100 | $100 | $1,322 | $1,055 | $1,482 |
| ChatGPT Pro 200 | $200 | $2,897 | $2,084 | $2,910 |
| ChatGPT Pro 500 | $500 | $6,955 | $5,386 | $7,352 |

Pro 200 before the 2026-09-29 cut was Astra $5,734 and GPT-6 Sol $5,904 ([before/after chart](https://substack-post-media.s3.amazonaws.com/public/images/2c53c9a0-1c69-4ee8-8e47-f86ae0655c0f_2048x1082.png)). These aren't used.

The GPT-6 Sol values include Pro 500, which launched with the cut, so the successor chart reports current limits for the older models. On that basis the Opus 5 and Fable 5 values are treated as current too (grilling Q8).

Max 20x chat workload ([by workload](https://substack-post-media.s3.amazonaws.com/public/images/e61e3841-450f-4662-a21f-dc0f844d05ab_2000x1126.png)): Sonnet 5.5 $7,009, Opus 5.5 $9,200, Fable 5.1 $2,480. These aren't used.

Other labs ([Chinese labs](https://substack-post-media.s3.amazonaws.com/public/images/c5c0445c-0292-4c32-9980-17c4d4fa175b_2048x1116.png), [dashboard compare](https://substack-post-media.s3.amazonaws.com/public/images/6e451f84-a586-40da-90c8-5e2fcd196222_2048x1077.png)):

- **GLM Coding:** Lite $18 (GLM-5.3 $139, Flash $24), Pro $80 ($830, $143), Max $168 ($1,942, $336).
- **MiniMax-M3:** Token Plus $22 ($427), Max $55 ($1,305), Ultra $132 ($3,088).
- **Kimi K3:** Kimi Code Plus $19 ($47), Pro $39 ($209), Max $99 ($647), Ultra $199 ($1,343).
- **Single plans:**
  - Muse Code Power Usage, $50, Muse Spark 1.3: $2,566.
  - SuperGrok Heavy, $300, Grok 4.7: $5,832.
  - Cursor Ultra, $200, Composer 2.5: $3,041.

**Resolved (2026-10-07):** [research/semianalysis-2026-10-05.md](../research/semianalysis-2026-10-05.md). The author re-read every figure from its chart image. A separate review agent then checked all 92 figures and nine chart links against the images, and every one matched. The reading above holds. Two additions:

- The successor chart's GPT-6 Sol Pro 200 tokens (9.7B) are about half the pre-cut 19.6B, which confirms the GPT-6 Sol values are post-cut.
- The dashboard screenshot's "Promo" toggle is selected, so the single-plan values (Muse Code, SuperGrok Heavy, Cursor Ultra) may include promotional limits. Ticket 07 should check before using them.
