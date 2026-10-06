# 06: ChatGPT Plus / Pro 100 / Pro 200 / Pro 500

Type: task
Status: ready-for-agent
Blocked by: 04

## Problem

The ChatGPT tiers are still called Pro 5x and Pro 20x. OpenAI dropped the relative-usage branding and now sells Pro 100 and Pro 200 (the "$100" and "$200" Pro plans). On 2026-09-29 it halved Pro 200's limits and added a $500 Pro plan. The SemiAnalysis post ([ticket 03](03-transcribe-semianalysis-2026-10-05.md)) measured all four plans after the cut.

## What to build

- **Rename.** Pro 5x becomes Pro 100 and Pro 20x becomes Pro 200. Rename the ids, labels and short labels. Tier ids aren't persisted anywhere, so nothing needs migrating.
- **Add Pro 500.** The fee is $500, with the measured values from ticket 03: GPT-6 Astra $6,955, GPT-6.1 Sol $5,386 and GPT-6 Sol $7,352.
- **Post-cut figures only.** Pro 200 uses the post-cut values. Pro 200 subscribers who bought before the cut keep the old limits until 2026-10-29, which is ignored here.
- **Picker.** The ChatGPT family shows five rungs: API, Plus, Pro 100, Pro 200 and Pro 500. Pro 500 reads −91% with "Astra: −93%" (after ticket 05). The picker still changes pricing, never row count.
- **Docs.** Update the subscription-data and subscription-filter specs (rung list, tier list).

## Acceptance criteria

- [ ] The picker shows Plus / Pro 100 / Pro 200 / Pro 500 under ChatGPT. Pro 500 reads $500/mo and −91%.
- [ ] Every ChatGPT entry gets a Pro 500 row. GPT-6 Astra's factor there is 500 / 6,955, and unmeasured models use 500 / 5,386.
- [ ] No code, data or doc outside resolved tickets mentions `pro-5x`, `pro-20x`, "Pro 5x" or "Pro 20x".
- [ ] `vp check` and `vp test` pass.
