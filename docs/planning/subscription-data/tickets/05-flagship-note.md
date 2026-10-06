# 05: Flagship note in the Subscriptions picker

Type: task
Status: ready-for-agent
Blocked by: 04

## Problem

After [ticket 04](04-per-model-api-equivalent-values.md), a picker rung gets a note for every model whose discount differs from the headline. Older models qualify too: Opus 5, Fable 5 and GPT-6 Sol. Fable 5 and Fable 5.1 both have the short name "Fable" but different values, so a rung could show two "Fable" notes. The user cares about the current generation: the daily driver (headline) and the flagship.

## What to build

- **One note per rung, always.** Each tier rung shows exactly one note: the family's flagship label and the flagship's discount on that tier. On a tier that excludes the flagship it reads "full price". It shows even when the flagship's rounded discount equals the headline's. No other model gets a note. The headline stays unlabelled, because it also covers every model without a measured value.
- **Delete `shortName`.** The label comes from the family's `flagshipLabel` (ticket 04), so remove `shortName` from the mapping schema and from both Fable entries.
- **Disclaimer copy.** Change it to: "Subscription costs are estimates: the struck-out API cost scaled by SemiAnalysis's measured value for that plan and model (agentic workload)."
- **Docs.** In the subscription-filter spec, describe the rung (fee, daily-driver headline, flagship note) and the new disclaimer. Remove the rule that merges notes keyed by label and factor.

With ticket 04's data, the rungs read:

| Rung | Headline | Note |
|---|---|---|
| Pro | −98% | Fable: full price |
| Max 5x | −98% | Fable: −92% |
| Max 20x | −98% | Fable: −92% |
| Plus | −91% | Astra: −88% |
| Pro 5x (Pro 100 after ticket 06) | −91% | Astra: −92% |
| Pro 20x (Pro 200 after ticket 06) | −90% | Astra: −93% |

## Acceptance criteria

- [ ] Every tier rung shows exactly one note, labelled with the family's flagship label. The table above holds.
- [ ] No older model (Opus 5, Fable 5, GPT-6 Sol) appears in any note. Their table rows still use their measured values.
- [ ] `shortName` is gone from the schema, the data and the code.
- [ ] The disclaimer shows the new copy.
- [ ] Unit tests cover the note (discounted, full price, equal to the headline). The e2e picker tests are updated.
- [ ] `vp check` and `vp test` pass.

## Comments

**From the grilling (2026-10-06):** The user asked for a flagship pointer next to the daily driver so the picker shows current-generation discounts only. They also suggested a `flagshipLabel` setting stored with the pointers instead of `shortName` on mapping entries, so the label and the pointer change together.
