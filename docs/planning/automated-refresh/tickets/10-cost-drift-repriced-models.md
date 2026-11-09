# 10: Average cost differs from the DeepSWE site for repriced models

Type: task
Status: resolved
Blocked by: none

## Problem

Seen 2026-09-05 while comparing the Best view against the site, first for two models; the 2026-09-06 investigation below found four. Every affected entry has cost adjustment factor 1 in our snapshot, so the Best rule is not the cause.

| Entry | DeepSWE site | Our snapshot |
|---|---|---|
| glm-5-3-flash [max] | $0.24 | $0.48 |
| deepseek-v4-pro [max] | $1.67 | $0.24 |
| deepseek-v4-flash [max] | $0.46 | $0.10 |
| gpt-5-6-sol [max] | $6.46 | $8.39 |
| gpt-5-6-sol [xhigh] | $3.60 | $4.70 |
| gpt-5-6-sol [high] | $2.66 | $3.47 |
| gpt-5-6-sol [medium] | $1.42 | $1.86 |
| gpt-5-6-sol [low] | $0.82 | $1.07 |

Root cause: the site does not store cost adjustment factors. It stores a price revision per model (old and new list prices per million input, cached-input, and output tokens) and derives a factor per row from that row's mean token counts. Our `data/cost-adjustments.json` is a hand-typed scalar per model. It was missing four of the site's seven models, and a scalar cannot express gpt-5-6-sol's non-uniform revision, whose factor ranges from 0.760 to 0.770 across effort levels. Vocabulary: price revision, cost adjustment factor in [docs/glossary.md](../../../glossary.md). Decision record: [ADR 0006](../../../architecture/0006-price-revisions-scraped-from-bundle.md).

## Design

Settled in the 2026-09-06 grilling.

### Data

- `data/cost-adjustments.json` becomes `data/price-revisions.json`: `source`, `sourceUrl`, and `revisions`, a map from leaderboard model id to `{ from: { input, cached, output }, to: { input, cached, output } }` in USD per million tokens. Only the rates that apply to the pinned benchmark version are stored, flattened. The bundle keys deepseek-v4-pro by version; the extractor resolves the pinned version the way the site does (an entry with `from`/`to` applies to every version, otherwise look up the version key), and a model with rates only for another version is omitted.
- The artifact schema requires `mean_input_tokens` and `mean_cache_tokens` on every row (all 70 rows carry them today). A row without them is a hard error. The site's fallback, which silently applies no adjustment when the revision is non-uniform, is deliberately not copied.
- Snapshot entries gain `input_tokens` and `cached_tokens` beside `output_tokens`. The snapshot's `cost_adjustments` list becomes `price_revisions`, mirroring the file, so the drift test between file and snapshot keeps working. `schema_version` becomes 2. Nothing in `src/` reads the renamed or added fields.
- Per entry, factor = weighted(to) / weighted(from), where weighted(rate) = (input − cached) × rate.input + cached × rate.cached + output × rate.output, using the entry's mean token counts. `average_cost_usd` = raw × factor. `cost_adjustment_factor` stays per entry.

### Bundle check in the refresh

- Every DeepSWE refresh fetches the site's index page, collects every `/assets/index-*.js` it references, and searches each for an object literal whose values all have the `from`/`to` rate shape or are version-keyed maps of it. Exactly one match across all bundles is required. The literal is not JSON (unquoted keys, bare `.15` decimals); a small tolerant conversion then a zod parse turns it into the file shape.
- When the resolved table differs from `data/price-revisions.json`, the refresh writes the file and it lands in the Refresh PR like a generated mapping entry (ADR 0003). The PR body's DeepSWE summary gains a "Price revisions" section listing each changed model with old and new rates and the entries whose cost changed. Unchanged runs add nothing.
- Extraction failure (index page unreadable, no bundle or more than one bundle contains a recognisable table, parsed table fails the schema) hard-errors the DeepSWE half, leaving its files untouched and naming the failure in the PR body. Warn-and-continue was rejected: a silent warning is how the current table went stale.

### Code

- New pure module `scripts/deepswe-price-revisions.ts`: the extractor, version resolution, and the per-entry factor formula. Tested against a checked-in excerpt of today's bundle and against the DeepSeek and gpt-5-6-sol worked examples below.
- `scripts/refresh-deepswe.ts` (shell) fetches the index page and bundles, calls the extractor, writes the file on change.
- `scripts/deepswe-snapshot.ts` takes the resolved revisions in place of the factor map; the "factors with no leaderboard rows" warning becomes "price revisions with no leaderboard rows".

### Docs

- Automated-refresh spec: drop the inline factor list; the version-bump workflow's "re-checks the deployed bundle" step is replaced by the automatic check; the within-v1.1 trigger sentence is removed since `source_generated_at` never triggered anything.
- Research doc `deepswe-leaderboard-data.md`: left as a dated record with a note pointing here, since its deepseek-v4-pro claim was true when written.

## Acceptance criteria

- After a refresh, every entry's `average_cost_usd` matches the site's rendered cost to display precision for all 70 rows, including the eight above.
- Deleting a model from `data/price-revisions.json` and running the refresh restores it and the Refresh PR body names it.
- Corrupting the extractor's search pattern makes the DeepSWE half hard-error with the snapshot untouched.
- `vp check` and `vp test` pass; the drift test between file and snapshot is updated for the new shape.

## Comments

### 2026-09-06: Grilling scope decision

Keep this ticket focused on explaining and correcting the two discrepancies, with evidence recorded here. Automated checks for future differences are outside this ticket. If the investigation identifies a recurring detection gap, capture it in a separate ticket.

Repository inspection confirms that `scripts/refresh-deepswe.ts` reads the versioned artifact, not the site's dehydrated data. `scripts/deepswe-snapshot.ts` derives snapshot `average_cost_usd` from artifact `mean_cost_usd` multiplied by the checked-in cost adjustment factor. Compare the exact artifact values and deployed site factors before choosing a correction; rounded display costs alone cannot establish a factor.

### 2026-09-06: Live evidence

Verified at 14:37:36 UTC against the [deployed bundle](https://deepswe.datacurve.ai/assets/index-C8-z8dCr.js) and the artifact below. DeepSeek's rates below apply to v1.1; the bundle has different rates for v1.

The [v1.1 artifact](https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json) has SHA-256 `005cbedb49f988ba3f0d9636300862ad7ace93ce1992b37faf9945fe5b383415`, exactly matching the committed snapshot's `raw_sha256`. Neither discrepancy is raw snapshot drift.

The deployed site's `index-C8-z8dCr.js` computes a cost adjustment factor from old and new input, cached-input, and output rates. For token counts `input`, `cached`, and `output`, the weighted amount is `(input - cached) * rate.input + cached * rate.cached + output * rate.output`. The factor is the new weighted amount divided by the old weighted amount; the site multiplies the artifact's raw cost by that factor.

- GLM max has raw cost `0.48196371245535713`. Its rates change uniformly by a factor of `0.5`, giving `0.24098185622767856`, displayed as `$0.24`.
- DeepSeek max has raw cost `0.24138687892256638`. Its old input/cached/output rates are `0.435 / 0.003625 / 0.87`; its new rates are `1.32 / 0.044 / 3.96`. Mean input/cached/output token counts are `24191606.099557523 / 24049100.743362833 / 105998.91814159292`. These yield factor `6.901879779721177` and cost `1.6660232187256647`, displayed as `$1.67`.

Both models currently have only a max-effort entry in v1.1. DeepSeek's formula depends on token mix, so a fixed model multiplier would only reproduce the current capture. How to represent this adjustment remains an open grilling decision.

### 2026-09-06: Grilling outcome

Supersedes the scope decision above: the detection gap is fixed here rather than in a separate ticket, because without it the corrected table decays the same way the current one did.

The bundle's full table, resolved for v1.1 (USD per million tokens, input / cached / output):

| Model | From | To | Uniform? |
|---|---|---|---|
| glm-5-3-flash | 0.15 / 0.03 / 0.5 | 0.075 / 0.015 / 0.25 | yes, 0.5 |
| gpt-5-6-luna | 1 / 0.1 / 6 | 0.2 / 0.02 / 1.2 | yes, 0.2 |
| gpt-5-6-terra | 2.5 / 0.25 / 15 | 2 / 0.2 / 12 | yes, 0.8 |
| gpt-5-6-sol | 5 / 0.5 / 30 | 4 / 0.4 / 20 | no |
| deepseek-v4-pro (v1.1 key) | 0.435 / 0.003625 / 0.87 | 1.32 / 0.044 / 3.96 | no |
| deepseek-v4-flash | 0.14 / 0.0028 / 0.28 | 0.44 / 0.014 / 1.32 | no |
| gemini-3-6-flash | 1.5 / 0.15 / 7.5 | 0.75 / 0.075 / 3.75 | yes, 0.5 |

Computed per-row factors against the artifact matching `raw_sha256` above: gpt-5-6-sol max 0.7698, xhigh 0.7651, high 0.7671, medium 0.7603, low 0.7605; deepseek-v4-flash max 4.6298. The three models already in `data/cost-adjustments.json` reproduce the site exactly because their revisions are uniform. The site's index page references two `index-*.js` bundles today; only one contains the table.

Why the old design could not have caught this: the spec relied on `source_generated_at` changing to prompt a changelog check, but the refresh deliberately skips writing when only that field changes, and the table grew from three to seven models inside v1.1 with no other signal.

### 2026-09-06: Implemented

`scripts/deepswe-price-revisions.ts` (factor formula, bundle extraction keyed on the table's shape, version resolution) with tests against a checked-in excerpt of `index-C8-z8dCr.js` and the worked examples above. `normalize` takes resolved revisions and computes the factor per entry; the artifact schema requires the token means; snapshot `schema_version` is 2 with `price_revisions` and per-entry `input_tokens`/`cached_tokens`. The shell fetches the index page and every `index-*.js` it references, extracts the table, rewrites `data/price-revisions.json` on change, and the PR body lists changed models with old and new rates and the entries whose cost moved. `.github/workflows/refresh.yml` commits the new file.

Verified: the live refresh reproduces all eight entries above to display precision; a second run is a no-op; deleting glm-5-3-flash from the file alone and rerunning restores it byte-identical, leaves the snapshot untouched, and the PR body names it. Extraction failure is covered by the unit tests (zero, empty, or multiple matches throw) and by the shell's ordering: extraction runs before any write.

Code review caught and fixed before commit: the PR-body section first diffed against the previous snapshot rather than the file, so the file-only deletion case produced an empty table; `{}` matched as a version-keyed table; the "entries moved" list now keys on a changed factor rather than a changed cost, so raw artifact drift in the same run is not reported as a repricing; a token mix that costs nothing at the old rates is a hard error rather than the site's silent no-adjustment. The failure branch of the workflow body still names only the half, not the specific error; the run log carries that.
