# 02: Fable models on Claude Pro

Type: task
Status: resolved
Blocked by: none

## Problem

Anthropic's [Claude Fable models on your plan](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan) (modified 2026-09-02) says:

- Pro: "Fable 5 and Fable 5.1 aren't included in your plan's usage limits. You can use them with usage credits."
- Max: "You can use up to 50% of your weekly usage limits on Fable models at no extra cost."

[Manage usage credits for paid Claude plans](https://support.claude.com/en/articles/12429409-manage-usage-credits-for-paid-claude-plans) (modified 2026-09-24): "Usage credits are billed at standard API rates."

The leaderboard treats Fable the same on every Claude tier: a 0.5 usage multiplier, so the Subscriptions picker's Pro rung shows a "Fable: −90%" note, and Fable's Pro rows show a subsidised effective cost. On Pro, Fable runs on usage credits at API rates, so neither holds. The 0.5 multiplier is right for Max: equivalent API spend is in dollars, so Fable's higher price already accounts for it burning limits faster, and 0.5 encodes the 50% cap.

Found while adding Claude Fable 5.1 as a vendor-reported entry (vendor-reported-data ticket 05, in [#95](https://github.com/eugencowie/deepswe-enhanced/pull/95)). Fable 5.1 inherits the problem from Fable 5.

## What to build

- **Data.** Model mapping entries gain an optional `excludedTiers`: tier ids whose usage limits don't cover the model. The schema rejects ids not in `tiers.json`. `claude-fable-5` gets `["claude-pro"]` and keeps `usageMultiplier: 0.5`. Fable 5.1 isn't on `main` yet (see Comments).
- **Derivation.** On a tier in the entry's `excludedTiers`, the subsidisation factor is 1, so the effective cost is the API cost. Row expansion is unchanged: excluded tiers still get a row, because the picker changes pricing, never row count. Still 185 rows.
- **Table.** Tier-row Cost and Cost/perf cells drop the struck-out API cost when the factor is 1 (it would just repeat the value). The access tag stays. No cell marker.
- **Picker.** On a tier that excludes a model, that model's note reads "Fable: full price" (reusing the API rung's caption) instead of a discount. Max 5x and Max 20x keep "Fable: −90%" and "Fable: −95%".
- **Docs.**
  - Glossary (`docs/context.md`): the usage multiplier entry says Fable is 0.5 because Max caps it at 50% of weekly limits, not "halved". Add a term for the tier exclusion.
  - Subscription-data spec: add `excludedTiers` to the model mapping fields and the factor-1 rule to the derivation rules.
  - Subscription-filter spec: add the "full price" note.
  - Credit both edits to this ticket.
- **Mapping workflow.** Extend the reviewer note in [automated-refresh ticket 06](../../automated-refresh/tickets/06-new-model-mapping-workflow.md) (and wherever that workflow's checklist lives now): a new Fable-class model needs `excludedTiers` checked as well as the multiplier. No automation.

## Out of scope

- Usage bundles: prepaid credits at up to 30% off. They're an optional purchase, and the source was only seen through a search summary.
- Team and Enterprise seats: `tiers.json` has no such tiers.

## Acceptance criteria

- [x] Fable 5 claude-pro rows use factor 1. Their Max 5x rows use 0.10 and their Max 20x rows 0.05. Other Claude models are unchanged.
- [x] The dataset still derives 185 rows. The picker still shows Best 25 and All 62 in every state.
- [x] Fable Pro rows show the plain API cost with no strikeout, and keep the "Pro" tag.
- [x] The Pro rung shows "Fable: full price". The Max rungs' Fable notes are unchanged.
- [x] An `excludedTiers` id not in `tiers.json` fails validation.
- [x] Unit tests cover the excluded-tier factor, the strikeout rule, and the picker note.
- [x] Glossary, both specs, and the automated-refresh reviewer note are updated.
- [x] `vp check` and `vp test` pass.

## Comments

**From the ticket 02 grilling (2026-10-04):**

- Pro Fable rows show the API cost, because Pro runs Fable on usage credits billed at standard API rates. Hiding the row was ruled out because the picker never changes row count. Showing it blank was ruled out because it breaks sorting.
- Exclusion is a per-model field, `excludedTiers`, not a per-tier multiplier map, because no multiplier value means "excluded". It's also not a list in `tiers.json`, which holds SemiAnalysis's figures verbatim. The scalar multiplier stays, because both Max tiers share 0.5.
- The Max 0.5 multiplier stays. "Uses limits faster" is Fable's higher token rates, which equivalent API spend already captures in dollars.

**Rebuilt on `main` (2026-10-04):** first built on top of #95, then rebuilt on `main` so it doesn't depend on #95, which is still in progress in a separate worktree. When #95 merges `main`, it needs to:

- Add `"excludedTiers": ["claude-pro"]` to `claude-fable-5-1`.
- Add an `excludedTiers` line to the mapping checklist in `docs/agents/vendor-reported-entries.md`: only for tiers whose usage limits don't cover the model (Fable sets `["claude-pro"]`), citing the source.
- Merge its one-note-per-label rule with this ticket's note condition. A model gets a note when its factor on the tier differs from the tier-wide one, and its discount is 1 − that factor. Key notes by label and factor, so Fable 5 and Fable 5.1 share one note per rung.
- Keep this version of the ticket file and drop the one #95 filed.
