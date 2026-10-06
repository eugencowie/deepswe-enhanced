# 04: Refresh supersedes vendor-reported models

Type: task
Status: resolved
Blocked by: 01

## What to build

`scripts/refresh-deepswe.ts` reads `data/vendor-reported.json` and, after generating mapping entries (ADR 0003), supersedes every vendor-reported model the refreshed snapshot now covers, as the [spec](../spec.md#supersession-by-the-refresh) and [ADR 0009](../../../architecture/0009-vendor-reported-entries.md) describe:

- **Id match.** The snapshot contains the vendor-reported model id. Delete all its vendor-reported entries; its mapping entry carries over.
- **OpenRouter id match.** A generated mapping entry has the same non-null `openrouterId` as a vendor-reported model's mapping entry. Delete all that model's vendor-reported entries and its mapping entry, keeping the generated one.

Supersession is per model: every effort level goes, even ones DeepSWE did not run. Put the logic in a pure function beside `mapping-generation.ts` with its own tests, and keep the shell thin as the other refresh scripts are. The refresh writes `vendor-reported.json` through `writeDataFile`, and the Refresh PR workflow stages it with the other data files.

The Refresh PR body gains two lists: the superseded models, with the match that superseded each, and the new DeepSWE models beside the vendor-reported models still standing. That way a duplicate a `null` generated `openrouterId` slipped past is visible to the reviewer.

## Acceptance criteria

- [x] Unit tests: id match, OpenRouter id match, a `null` generated id leaving the model standing, every effort level removed together, untouched models kept
- [x] The refreshed data passes every load-time invariant from ticket 01 in each case above
- [x] `.github/workflows/refresh.yml` stages `data/vendor-reported.json`
- [x] The PR body lists superseded models and the side-by-side lists
- [x] `vp check` and `vp test` pass

## Comments

**Implementation notes (2026-10-04):**

- `supersedeVendorReported` in `scripts/vendor-reported-supersession.ts` takes the refreshed snapshot's models, the vendor-reported file, the mapping and this run's generated entries, and returns the new vendor-reported file, the combined mapping and a `Supersession` per superseded model. The shell passes its mapping to `normalize`, then validates it before any write: a generated entry colliding with a vendor-reported model's mapping entry is superseded, and one colliding with an ordinary entry fails the run with every file untouched (previously `price-revisions.json` could be written first).
- The summary's side-by-side line appears whenever the run added DeepSWE models and vendor-reported models still stand; on a first run every model counts as new. `summarizeRefresh` takes the mapping counts before and after, rather than recomputing them.
- Verified against the live DeepSWE source with staged data: a claim for `gpt-6-astra` (id match), a claim for `glm-flash-guess` sharing `glm-5-3-flash`'s OpenRouter id with that model's mapping entry removed (OpenRouter-id match), and a claim for `claude-opus-5-5` (left standing). The refresh superseded the first two, swapped the mapping entry for the generated one, kept the third, and printed both kinds of match in the summary; the app's data tests passed on the result. The data was restored afterwards.
- Review follow-up, verified live: with `glm-5-3`'s OpenRouter id staged to collide with the entry the refresh generates for `glm-5-3-flash`, the run failed on the duplicate id and left every data file byte-identical.
