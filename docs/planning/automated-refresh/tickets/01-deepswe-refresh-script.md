# 01: DeepSWE refresh script

Type: task
Status: resolved
Blocked by: leaderboard-table/01

## What to build

Running the DeepSWE refresh script updates the checked-in leaderboard snapshot from the live source: it fetches the versions manifest and the pinned v1.1 artifact, validates the schema, rejects duplicate configurations, applies the checked-in display-cost-factor table, and keeps raw values beside adjusted ones — per the refresh strategy in the [research findings](../../product-spec/research/deepswe-leaderboard-data.md) and the [spec](../spec.md) (Refresh scripts, version-bump workflow).

Guard rails: warn without switching when the manifest's `latest` moves past v1.1; fail when a fetched model is missing from the model mapping, so new leaderboard models force a mapping decision.

## Decisions (grilled 2026-08-25)

- Invocation: `package.json` script `refresh:deepswe` running `node scripts/refresh-deepswe.ts` (Node 26 type-stripping; the script imports only types from `src/data/types.ts`). Ticket 02 mirrors this as `refresh:openrouter`.
- Raw artifact bytes are hashed in memory for `raw_sha256` and discarded; no raw file is written. The research folder keeps the one historical raw capture.
- Entries preserve the artifact's row order (matches the committed seed; refresh diffs mirror what the site publishes).
- A mapping entry whose model no longer appears in the fetched rows warns; only a fetched model missing from the mapping fails. A cost-factor model absent from the fetched rows also warns.
- The cost adjustment factor table is an inline constant in the script (it is what a human edits in the version-bump workflow). The snapshot's `cost_adjustments` records the table verbatim, matching the seed.
- Structure: pure `normalize(manifest, artifact, mapping)` plus a thin fetch/write shell. Zod schemas live in `scripts/` (zod as devDependency; the app bundle never sees it). Unit tests in `scripts/` cover the guard rails: duplicate config throws, missing mapping throws naming the model, factor application, latest-moved warning.
- Failure is all-or-nothing: nothing is written on error. The `latest` ≠ v1.1 warning goes to stderr and the run exits 0. Manifest-vs-artifact task-count mismatch and an absent `latest_job` are hard errors. A null `finished_at` was originally a hard error too; [ticket 05](05-handle-null-latest-job-finished-at.md) made it valid provenance after observing it live (DeepSWE displays the rows while the job runs). Written JSON must match oxfmt output so `vp check` produces no reformat diff.
- Glossary: "Cost adjustment factor" added to [docs/glossary.md](../../../glossary.md).

## Acceptance criteria

- [x] Script fetches live source, validates, and writes the snapshot in the checked-in shape
- [x] Display-cost factors (Luna 0.2, Terra 0.8, Gemini 3.6 Flash 0.5) applied; raw values and factors retained
- [x] Rerun immediately after committing a snapshot produces no diff (modulo the source timestamp)
- [x] A fetched model absent from the mapping fails the run with a clear message
- [x] A manifest `latest` ≠ v1.1 warns but stays pinned
- [x] `vp run ready` passes

## Comments

**2026-08-25** — Implemented as `scripts/deepswe-snapshot.ts` (schemas, factor table, pure `normalize` returning `{ snapshot, warnings }`) plus the `scripts/refresh-deepswe.ts` shell, run via `vp run refresh:deepswe`. Eight guard-rail tests in `scripts/deepswe-snapshot.test.ts`; `scripts/` added to `tsconfig.node.json`; zod 4 as a devDependency.

Live-run findings: the upstream artifact gained a per-row `mean_cache_tokens` field *without* bumping `generated_at`, so `raw_sha256` changed (`41940b…` → `512aa3…`) while every consumed field stayed identical — confirming the research's warning that the version pin alone doesn't make the artifact reproducible. The refreshed snapshot also normalizes the Python-seeded `44.0` floats to `44` (two entries' `steps`); values are unchanged. Two consecutive fetches were byte-identical, and rerunning the script after a run produces a byte-identical snapshot.

**2026-08-26** — Decision reversed by [ticket 04](04-extract-static-data.md): the cost adjustment factor table moved from an inline constant to `data/cost-adjustments.json` under the later-decided principle that transcribed upstream facts live in `data/`. The version-bump workflow is unchanged — a human still re-checks the deployed bundle and edits the table, now in the data file. `normalize` takes the factors as a parameter; the shell loads and validates the file.
