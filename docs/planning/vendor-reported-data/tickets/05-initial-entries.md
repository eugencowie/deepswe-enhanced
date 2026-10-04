# 05: Initial vendor-reported entries

Type: task
Status: ready-for-agent
Blocked by: 03, 06

## What to do

Write the [spec's initial entries](../spec.md#initial-entries) into `data/vendor-reported.json`, following the checklist from ticket 06. Each model also needs a hand-written model-mapping entry.

1. **Re-check every figure** against its primary source, and record `source`, `sourceUrl`, `publishedAt`, `figureFrom`, and harness and trials where stated.
2. **Gemini 4 Argon** is admitted only if Google's docs name the "highest thinking level" for that model; cite them. Otherwise leave it out and say so in the PR.
3. **Chart readings.** Read GPT-6.1 Sol's max, xhigh, medium and low figures off the launch post's chart, then **stop and put a checklist to the maintainer** (figure, chart URL, effort) before committing. The maintainer's sign-off is the review. The text figure (high, 75.2%) wins over the chart's reading for high.
4. **Mapping entries.** Look up each model's OpenRouter id (revision-pinned per ADR 0002, or `null`), display name (ADR 0003's derivation), family and usage multiplier. In particular, check whether Fable 5.1 keeps Fable 5's 0.5 usage multiplier. List these facts and their sources in the PR body.
5. **Ids.** Use the best guess at DeepSWE's id (`claude-opus-5-5`, `gpt-6-1-sol`), following its existing convention.

## Acceptance criteria

- [ ] Every entry meets the admission rules and cites a primary source
- [ ] The maintainer has signed off every chart reading
- [ ] Live data parses, and every vendor-reported row shows its marker and citation on the site
- [ ] The PR body lists the mapping facts with sources
- [ ] `vp check` and `vp test` pass
