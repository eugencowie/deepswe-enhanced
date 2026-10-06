# 04: Price tier rows from measured per-model values

Type: task
Status: ready-for-agent
Blocked by: 03

## Problem

Today each tier carries one equivalent API spend figure, and each model scales it by a usage multiplier (Fable 0.5). SemiAnalysis's Oct 5 post ([ticket 03](03-transcribe-semianalysis-2026-10-05.md)) shows that the multiplier model can't fit the data. On Max 20x, Opus 5.5 is worth $11,726 a month and Fable 5.1 $2,485, a ratio of about 0.21, not 0.5. Opus 5 ($17,275) and Opus 5.5 differ as well. The value depends on the (plan, model) pair.

## What to build

- **API-equivalent value per (tier, model).** `tiers.json` stores SemiAnalysis's agentic-workload values from ticket 03 for each tier and each measured model: Opus 5.5, Sonnet 5.5, Fable 5.1, Opus 5, Fable 5, GPT-6.1 Sol, GPT-6 Sol and GPT-6 Astra. Keep the existing ChatGPT tier ids for now. Pro 5x takes the Pro 100 figures and Pro 20x the post-cut Pro 200 figures. [Ticket 06](06-chatgpt-tier-lineup.md) renames them.
- **Family pointers.** `tiers.json` gains a per-family block with:
  - `dailyDriverModel`: Opus 5.5 for Claude and GPT-6.1 Sol for ChatGPT.
  - `flagshipModel`: Fable 5.1 and GPT-6 Astra.
  - `flagshipLabel`: "Fable" and "Astra".

  This ticket uses only the daily driver. The flagship fields are added now so the schema changes once ([ticket 05](05-flagship-note.md) reads them).
- **Subsidisation factor.** On a tier, the factor is the tier's fee ÷ the model's API-equivalent value on that tier. A model with no measured value uses the daily driver's value. A tier in the model's `excludedTiers` still has factor 1.
- **Delete the old model.** Remove the tier-wide equivalent API spend and `usageMultiplier` everywhere: schema, data, derivation, tests and the refresh's generated mapping entries. A newly generated entry then just falls back to the daily driver. ADR 0003's reviewer note about multipliers no longer applies, so the reviewer now checks `excludedTiers` and whether the new model should become a daily driver or flagship.
- **Validation** fails at load if:
  - a value names a model that isn't in the mapping, or a model outside the tier's family;
  - a family's daily driver or flagship has neither a measured value nor an exclusion on any tier in that family.
- **Picker headline.** Each rung's discount becomes the daily driver's discount on that tier. Notes keep today's rule ("a model whose factor differs from the headline"), reading from values. This is interim, because ticket 05 replaces it.
- **Masthead.** The SemiAnalysis source links the Oct 5 post with its date.
- **Docs.**
  - Glossary: replace "equivalent API spend" with "API-equivalent value" (per tier and model, agentic workload). Add "daily driver" and "flagship". Delete "usage multiplier".
  - Subscription-data spec: rewrite the data file, mapping fields and derivation rules.
  - ADR 0010: record the switch from tier figure × multiplier to per-(tier, model) values with a daily-driver fallback, and why. The considered options were recalibrated multipliers, and measured pairs only with no fallback.

## Out of scope

- The flagship-only note, `shortName` removal and disclaimer copy (ticket 05).
- Renaming the ChatGPT tiers and adding Pro 500 (ticket 06).
- Other labs' plans (ticket 07).

## Acceptance criteria

- [ ] Each of these rows has the factor shown:

  | Model | Tier | Factor | Why |
  |---|---|---|---|
  | Fable 5.1 | Claude Max 20x | 200 / 2,485 | measured |
  | Opus 5 | Claude Max 20x | 200 / 17,275 | measured |
  | Sonnet 4.6 | Claude Max 20x | 200 / 11,726 | Opus 5.5 fallback |
  | Fable 5 and Fable 5.1 | Claude Pro | 1 | excluded |
  | GPT-5.6 Sol | Pro 20x | 200 / 2,084 | GPT-6.1 Sol fallback |
- [ ] No schema, data file, script or test mentions `usageMultiplier` or equivalent API spend.
- [ ] Each of these fails validation, with a test for each:
  - a value for an unknown model;
  - a value for a model from another family;
  - a daily driver or flagship missing on a tier.
- [ ] The picker headlines show the daily driver's discount, e.g. Max 20x −98%.
- [ ] The masthead links the Oct 5 post.
- [ ] The glossary, spec and ADR 0010 are updated.
- [ ] `vp check` and `vp test` pass.

## Comments

**From the grilling (2026-10-06):**

- Agentic only. DeepSWE is agentic coding, and SemiAnalysis measured agentic on every plan, but chat only on Max 20x.
- Values live in `tiers.json`, not the mapping. That file holds SemiAnalysis's figures, the refresh auto-generates mapping entries (ADR 0003), and `excludedTiers` stays in the mapping because it comes from Anthropic's docs.
- The family pointers are per family, not per tier, because the daily driver and flagship are the same on every tier of a family.
- Previous-generation values (Opus 5, Fable 5, GPT-6 Sol) still price their own rows. Without one, Fable 5 would fall back to Opus 5.5's value.
