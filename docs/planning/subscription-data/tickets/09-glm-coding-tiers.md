# 09: GLM Coding tiers

Type: task
Status: ready-for-agent
Blocked by: 08

## Problem

GLM 5.3 and GLM 5.3 Flash are on the leaderboard and SemiAnalysis measured both on all three GLM Coding plans (research appendix), but they sit in family `none`. After [ticket 08](08-kimi-code-tiers.md) the schema and picker take any number of families, with an optional flagship.

## What to build

- **Family `glm`.** Vendor Z.ai. Column header "GLM Coding". GLM 5.3 is the daily driver. GLM 5.3 Flash is the flagship, with flagship label "Flash".
- **Three tiers** at Z.ai's undiscounted monthly prices, with the agentic values from the research appendix:

  | Tier id | Short label | Price | GLM 5.3 | GLM 5.3 Flash | Headline | Note |
  |---|---|---|---|---|---|---|
  | `glm-coding-lite` | Lite | $18 | $139 | $24 | −87.1% | Flash: −25% |
  | `glm-coding-pro` | Pro | $80 | $830 | $143 | −90.4% | Flash: −44.1% |
  | `glm-coding-max` | Max | $168 | $1,942 | $336 | −91.3% | Flash: −50% |

- **GLM 5.2 stays in family `none`.** Z.ai's docs say "requests for GLM-5.2/GLM-5.1 will be automatically routed to GLM-5.3", so the plans don't serve it (ADR 0011).
- **Values as published.** SemiAnalysis may have measured during Z.ai's promos (half-rate credits Sep 25 – Oct 7, doubled overnight quota Sep 3 – Oct 7). The source is dated and nothing better exists, so the values are used unadjusted. The caveat goes in the research file only, not the picker.
- **Docs.**
  - The research file: GLM's figures are used. Cite [z.ai/subscribe](https://z.ai/subscribe) (seen 2026-10-07) for the prices: it shows $9 / $40 / $84 with "Migration Exclusive 50% Off", so the list prices are $18 / $80 / $168, matching the chart. Record its "6× Lite usage" (Pro) and "14× Lite usage" (Max), which SemiAnalysis's values match (GLM 5.3: 5.97× and 13.97×; Flash: 5.96× and 14.0×), and the possible promo inflation.
  - The glossary's **Flagship** entry names Flash as GLM's.
  - The subscription-data and subscription-filter specs: family list.

## Acceptance criteria

- [ ] The picker shows a GLM Coding column after Kimi Code (Moonshot before Z.ai): API, Lite, Pro, Max, with the fees, headlines and "Flash" notes above.
- [ ] Every GLM 5.3 and GLM 5.3 Flash entry gets one row per GLM Coding tier, each priced at its own measured value. GLM 5.2 keeps only its API rows.
- [ ] The research file, glossary and both specs are updated.
- [ ] Unit tests cover the GLM factors. The e2e picker tests cover a GLM rung's note.
- [ ] `vp check` and `vp test` pass.
