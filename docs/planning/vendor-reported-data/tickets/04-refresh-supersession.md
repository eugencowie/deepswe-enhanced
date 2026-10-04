# 04: Refresh supersedes vendor-reported models

Type: task
Status: ready-for-agent
Blocked by: 01

## What to build

`scripts/refresh-deepswe.ts` reads `data/vendor-reported.json` and, after generating mapping entries (ADR 0003), supersedes every vendor-reported model the refreshed snapshot now covers, as the [spec](../spec.md#supersession-by-the-refresh) and [ADR 0009](../../../architecture/0009-vendor-reported-entries.md) describe:

- **Id match.** The snapshot contains the vendor-reported model id. Delete all its vendor-reported entries; its mapping entry carries over.
- **OpenRouter id match.** A generated mapping entry has the same non-null `openrouterId` as a vendor-reported model's mapping entry. Delete all that model's vendor-reported entries and its mapping entry, keeping the generated one.

Supersession is per model: every effort level goes, even ones DeepSWE did not run. Put the logic in a pure function beside `mapping-generation.ts` with its own tests, and keep the shell thin as the other refresh scripts are. The refresh writes `vendor-reported.json` through `writeDataFile`, and the Refresh PR workflow stages it with the other data files.

The Refresh PR body gains two lists: the superseded models, with the match that superseded each, and the new DeepSWE models beside the vendor-reported models still standing. That way a duplicate a `null` generated `openrouterId` slipped past is visible to the reviewer.

## Acceptance criteria

- [ ] Unit tests: id match, OpenRouter id match, a `null` generated id leaving the model standing, every effort level removed together, untouched models kept
- [ ] The refreshed data passes every load-time invariant from ticket 01 in each case above
- [ ] `.github/workflows/refresh.yml` stages `data/vendor-reported.json`
- [ ] The PR body lists superseded models and the side-by-side lists
- [ ] `vp check` and `vp test` pass
