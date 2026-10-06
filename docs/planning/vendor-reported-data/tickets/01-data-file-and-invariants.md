# 01: Vendor-reported data file and load-time invariants

Type: task
Status: resolved
Blocked by: none

## What to build

`src/data/schema.ts` gains `vendorReportedSnapshotSchema` for `data/vendor-reported.json`, shaped as in the [spec](../spec.md#data-file-datavendor-reportedjson): strict, `benchmark_version: "v1.1"`, `effort` never null, cost, output tokens and steps optional, per-entry provenance (`source`, `sourceUrl`, `publishedAt`, `figureFrom`, optional `harness` and `trials`), and the duplicate `(model, effort)` check the DeepSWE snapshot has.

The file lands with `entries: []`, and `src/data/sources.ts` parses it. The load-time invariants change ([ADR 0004](../../../architecture/0004-load-time-invariants-replace-count-literals.md), [ADR 0009](../../../architecture/0009-vendor-reported-entries.md)):

- `assertMappingCoverage` checks coverage across both files: every model in either has a mapping entry, and every mapping entry matches a model in one of them.
- A new check rejects any model present in both the DeepSWE snapshot and the vendor-reported file.
- `modelMappingSchema` rejects two entries sharing a non-null `openrouterId`. No entry in today's mapping does.

The refresh scripts that read the mapping use the same schemas, so `scripts/refresh-deepswe.ts` also reads the vendor-reported file wherever it now checks coverage. Supersession itself is ticket 04.

## Acceptance criteria

- [x] `data/vendor-reported.json` exists with no entries and parses at load
- [x] Unit tests reject: a null effort, an unknown key, a duplicate `(model, effort)`, a model in both files, a duplicated non-null `openrouterId`, a vendor-reported model missing from the mapping, a mapping entry matching neither file
- [x] `schema.test.ts` parses the new file with the other six
- [x] `vp check` and `vp test` pass

## Comments

**Implementation notes (2026-10-04):**

- The overlap check is `assertNoOverlap(snapshot, vendorReported)` in `src/data/schema.ts`, separate from `assertMappingCoverage`, which now takes both files.
- `scripts/refresh-deepswe.ts` reads the vendor-reported file and passes its models to `normalize`, which leaves them out of its "mapping entries with no leaderboard rows" warning: their mapping entries have no DeepSWE rows by definition. The refresh guards no other coverage. The unique-OpenRouter-id rule already applies to its mapping write through `writeDataFile`. Until ticket 04, a generated entry colliding with a vendor-reported model's mapping entry fails the refresh rather than superseding it.
- Duplicate `(model, effort)` detection is shared between the two snapshot schemas.
