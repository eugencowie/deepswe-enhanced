# Tier rows are priced from per-model API-equivalent values with a daily-driver fallback

Each tier carried one equivalent API spend figure from SemiAnalysis's June tweet, and a per-model usage multiplier in the model mapping scaled it for models with tighter limits: Fable at 0.5, because Max caps Fable at half the weekly limits. SemiAnalysis's Oct 5 post measured each model on each tier instead, and the multiplier can't fit those values. On Max 20x Opus 5.5 is worth $11,726 a month and Fable 5.1 $2,485, a ratio of about 0.21, not 0.5, though the value already includes Max's cap on Fable. Opus 5 ($17,275) and Opus 5.5 differ too, so the value belongs to the (tier, model) pair, not the tier. We decided `tiers.json` stores SemiAnalysis's agentic-workload **API-equivalent value** for each tier and each model they measured, and a model they didn't measure takes the value of its family's **daily driver** (Opus 5.5, GPT-6.1 Sol), named once per family beside the **flagship** (Fable 5.1, GPT-6 Astra). The subsidisation factor is the tier's price over the model's value there, or 1 on a tier that excludes the model. The usage multiplier is deleted.

The values live in `tiers.json`, not the mapping: they are SemiAnalysis's figures, transcribed and dated with the rest of that file, while the refresh writes mapping entries (ADR 0003). `excludedTiers` stays in the mapping because it comes from Anthropic's docs. Load-time checks (ADR 0004) reject a value for a model missing from the mapping or outside the tier's family, a tier with no value for its family's daily driver, and a tier with neither a value nor an exclusion for its flagship.

## Considered options

- **Recalibrated multipliers**, a tier figure per tier and a multiplier per model fitted to the new values: keeps the old schema, but one multiplier per model can't match every tier at once (Opus 5 is worth 1.22 times Opus 5.5 on Pro but 1.53 times on Max 5x), and the fitted numbers would no longer be anyone's measurement.
- **Measured pairs only, with no fallback**: every factor is a measurement, but SemiAnalysis measured eight models and the leaderboard has seventeen in these families. The rest would lose their tier rows, or every new model would wait on a new post.

## Consequences

- An unmeasured model is priced as if it were the daily driver. That's close for its siblings (Sonnet 5.5 is within 7% of Opus 5.5 on every Claude tier) and wrong for a model on tighter limits, which is why the flagship must be measured or excluded on every tier.
- A generated mapping entry needs no subscription field: it falls back to the daily driver. The reviewer now checks `excludedTiers`, and whether the new model should become a family's daily driver or flagship, which means new values in `tiers.json`.
- The picker headline is the daily driver's discount, and measured models whose factor differs get a note each. Fable 5 and Fable 5.1 share the short name "Fable" at different values, so Max rungs show two "Fable" notes until [subscription-data ticket 05](../planning/subscription-data/tickets/05-flagship-note.md) replaces the notes with a flagship note.
- Supersedes the usage multiplier in [ADR 0003](0003-refresh-generates-mapping-entries.md)'s derivation and reviewer note, and in [ADR 0009](0009-vendor-reported-entries.md)'s PR evidence.
