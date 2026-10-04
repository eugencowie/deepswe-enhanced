# 05: Initial vendor-reported entries

Type: task
Status: resolved
Blocked by: 03, 06

## What to do

Write the [spec's initial entries](../spec.md#initial-entries) into `data/vendor-reported.json`, following the checklist from ticket 06. Each model also needs a hand-written model-mapping entry.

1. **Re-check every figure** against its primary source, and record `source`, `sourceUrl`, `publishedAt`, `figureFrom`, and harness and trials where stated.
2. **Gemini 4 Argon** is admitted only if Google's docs name the "highest thinking level" for that model; cite them. Otherwise leave it out and say so in the PR.
3. **Chart readings.** Read GPT-6.1 Sol's max, xhigh, medium and low figures off the launch post's chart, then **stop and put a checklist to the maintainer** (figure, chart URL, effort) before committing. The maintainer's sign-off is the review. The text figure (high, 75.2%) wins over the chart's reading for high.
4. **Mapping entries.** Look up each model's OpenRouter id (revision-pinned per ADR 0002, or `null`), display name (ADR 0003's derivation), family and usage multiplier. In particular, check whether Fable 5.1 keeps Fable 5's 0.5 usage multiplier. List these facts and their sources in the PR body.
5. **Ids.** Use the best guess at DeepSWE's id (`claude-opus-5-5`, `gpt-6-1-sol`), following its existing convention.

## Acceptance criteria

- [x] Every entry meets the admission rules and cites a primary source
- [x] The maintainer has signed off every chart reading
- [x] Live data parses, and every vendor-reported row shows its marker and citation on the site
- [x] The PR body lists the mapping facts with sources
- [x] `vp check` and `vp test` pass

## Comments

**Implementation notes (2026-10-04):** 21 entries for 9 models, plus 9 hand-written mapping entries. No PR was opened in this session, so the PR-body material is recorded here.

**Maintainer decisions:**

- Signed off every chart reading: GPT-6.1 Sol's max, xhigh, medium and low; GPT-6 Sol's and GPT-6 Luna's xhigh, high, medium and low.
- Record OpenAI's cost per task. Its charts give DeepSWE's own figures for GPT-6 Astra and Claude Opus 5 exactly, score and cost, so the measure matches the Cost column. Its GPT-5.6 Luna figures don't match the board (max 62.2% at $0.53 against 67.2% at $0.61), apparently an older capture, so OpenAI's own figures may differ from a later official run.
- Add GPT-6 Sol's and Luna's other four efforts from the GPT-6 Sol and Luna post's chart. The figures are identical in the GPT-6.1 Sol post's chart.
- One "Fable" note covers Fable 5 and Fable 5.1: Fable 5.1 takes `shortName: "Fable"`, and the picker shows notes with the same label and multiplier once.

**Entries and sources:**

| Model | Effort | Pass@1 | Cost | From | Source |
|---|---|---|---|---|---|
| Claude Opus 5.5 | max | 74.2% | – | text, 5 trials | System Card §8.3, 2026-09-22 |
| Claude Sonnet 5.5 | max | 71.0% | – | text, 5 trials | System Card §8.3, 2026-09-28 |
| Claude Fable 5.1 | max | 67.4% | – | text, 5 trials | Fable 5.1 & Mythos 5.1 System Card §8.3, 2026-09-01 |
| GPT-6.1 Sol | high | 75.2% | $0.65 | text (cost from chart) | OpenAI Developers on X, 2026-09-29 |
| GPT-6.1 Sol | max / xhigh / medium / low | 71.9 / 71.9 / 73.0 / 64.4% | $1.57 / $0.79 / $0.42 / $0.17 | chart | Introducing GPT-6.1 Sol, 2026-09-29 |
| GPT-6 Sol | max | 68.8% | $2.74 | text (cost from chart) | Introducing GPT-6 Sol and Luna, 2026-09-22 |
| GPT-6 Sol | xhigh / high / medium / low | 66.6 / 65.3 / 56.6 / 37.2% | $1.00 / $0.64 / $0.38 / $0.16 | chart | same |
| GPT-6 Luna | max | 66.6% | $0.22 | text (cost from chart) | same |
| GPT-6 Luna | xhigh / high / medium / low | 61.28 / 59.29 / 44.47 / 2.43% | $0.11 / $0.084 / $0.052 / $0.0057 | chart | same |
| Grok 4.7 | high | 71.0% | – | table (footnoted high) | x.ai/news/grok-4-7, 2026-09-21 |
| DeepSeek V4.1 Flash | max | 74.2% | – | table; mini-SWE-agent, 8 samples | HF model card, 2026-09-10 |
| Muse Spark 1.3 | max | 75.4% | – | table; mini-swe-agent | dev.meta.ai model page; launch 2026-09-02 |

**Rejected:** Gemini 4 Argon (rule 3, a named effort level): Google's thinking docs don't list Argon, which is available only to a closed group of trusted security teams.

**For review:**

- DeepSeek's card also tabulates 8 harnesses and reports the best one, mini-SWE-agent, but says it chose that harness in advance; admitted under rule 4.
- Meta's methods page picks a source per model for its comparison table; Meta ran Muse Spark 1.3 itself.

**Mapping facts:**

- **OpenRouter ids:** `anthropic/claude-opus-5.5`, `anthropic/claude-sonnet-5.5`, `anthropic/claude-fable-5.1`, `openai/gpt-6.1-sol`, `openai/gpt-6-sol`, `openai/gpt-6-luna`, `x-ai/grok-4.7`, `deepseek/deepseek-v4.1-flash` and `meta/muse-spark-1.3`, from https://openrouter.ai/api/v1/models on 2026-10-04. None has a dated sibling to pin (ADR 0002). Throughput fills in at the next OpenRouter refresh.
- **Display names:** the listing names minus the vendor prefix (ADR 0003).
- **Families:** Claude for Anthropic, ChatGPT for OpenAI, none for the rest, copied from each vendor's existing entries.
- **Usage multipliers:** Claude Fable 5.1 is 0.5. Source: https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan, which says "Fable 5 and Fable 5.1 work the same way on your plan" and allows up to 50% of weekly Max limits on Fable models. Every other model is 1.

**Verified:** `vp check` and `vp test` pass on the live data. On the built site, all 21 rows show their marker; a chart reading's tooltip ends "Figure read from a chart."; the masthead reads "vendor-reported scores (2026-09-29)"; and the Subscriptions picker shows one "Fable" note per Claude tier.
