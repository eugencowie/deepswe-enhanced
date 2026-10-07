# 08: Kimi Code tiers

Type: task
Status: ready-for-agent
Blocked by: 07

## Problem

Only Claude and ChatGPT have subscription families. Kimi K3 is on the leaderboard and SemiAnalysis measured it on all four Kimi Code plans (research appendix), but it sits in family `none`, so it has only an API row. The picker and schema assume two families, each with a flagship.

## What to build

- **Family `kimi`.** Vendor Moonshot. Column header "Kimi Code". Kimi K3 is the daily driver and the only member.
- **Four tiers** at Moonshot's monthly prices, with Kimi K3's agentic values from the research appendix:

  | Tier id | Short label | Price | Kimi K3 | Tier discount |
  |---|---|---|---|---|
  | `kimi-code-plus` | Plus | $19 | $47 | −59.6% |
  | `kimi-code-pro` | Pro | $39 | $209 | −81.3% |
  | `kimi-code-max` | Max | $99 | $647 | −84.7% |
  | `kimi-code-ultra` | Ultra | $199 | $1,343 | −85.2% |

- **Optional flagship.** A family may have no flagship. Its rungs show the fee and the daily driver's headline, with no note. Kimi has none. Claude and ChatGPT keep theirs, and every rung of a family with a flagship still shows exactly one note (ticket 05).
- **Sourced membership.** Kimi K2.7 Code stays in family `none`: Kimi Code covers only "K2.7 Code HighSpeed" (Pro and above), which may not be the model DeepSWE ran. A model joins a family only when a primary source says the plan serves it; only then does it fall back to the daily driver's value.
- **Picker past two families.** The two-column grid wraps. Columns run Claude, ChatGPT, then the other families alphabetically by vendor. The trigger lists non-API picks in column order, as now.
- **Docs.**
  - Glossary: **Tier** and **Subscription family** cover any vendor's subscription, not just ChatGPT and Claude. **Flagship** becomes the optional model noted beneath the daily driver on each rung, usually the family's top model.
  - ADR 0011: the optional flagship (amends ticket 05's "one note per rung, always") and sourced family membership (narrows ADR 0010's fallback).
  - The subscription-data and subscription-filter specs: family list, rung shape without a note, column order.
  - The research file: Kimi's figures are used. Record why SuperGrok Heavy, Muse Code, MiniMax and Cursor aren't: the single-plan figures come from one dashboard screenshot with "Promo" on, Grok 4.7 and Muse Spark 1.3 have only vendor-reported results, Muse Code doesn't say it covers 1.3, and MiniMax-M3 and Composer 2.5 aren't on the leaderboard.

## Acceptance criteria

- [ ] The picker shows a Kimi Code column after ChatGPT: API, Plus, Pro, Max, Ultra, with the fees and discounts above and no note.
- [ ] Every Kimi K3 entry gets one row per Kimi Code tier, priced at the tier's price over K3's value. Kimi K2.7 Code keeps only its API rows.
- [ ] Claude and ChatGPT rungs are unchanged.
- [ ] Loading still fails for a tier missing its family's daily driver, or missing a flagship the family declares.
- [ ] Glossary, ADR 0011, both specs and the research file are updated.
- [ ] Unit tests cover a family without a flagship. The e2e picker tests cover the Kimi column.
- [ ] `vp check` and `vp test` pass.

## Comments

**From the grilling (2026-10-07, [ticket 07](07-other-labs-coding-plans.md)):** Kimi goes first because it's the simpler family (one model, no note) and carries the general changes, so [ticket 09](09-glm-coding-tiers.md) only adds data and a flagship.
