# Spec: Automated refresh

Keeps the [leaderboard table](../leaderboard-table/spec.md)'s snapshots and the [model mapping](../model-data/spec.md) up to date: two refresh scripts, the weekly workflow, the Refresh PR, generated mapping entries, and the human version-bump workflow. Refreshes land only as human-reviewed commits. Vocabulary: snapshot, Refresh PR, generated mapping entry, vendor mapping, consumer provider slug, org slug, cost adjustment factor in [docs/glossary.md](../../glossary.md).

## Refresh scripts

- `scripts/refresh-deepswe.ts`: implement per the [research's refresh strategy](../product-spec/research/deepswe-leaderboard-data.md#recommended-typescript-refresh-strategy) — fetch `/artifacts/versions.json` and the pinned `v1.1` artifact, validate with zod, reject duplicate configs, apply the site's price revisions from `data/price-revisions.json` per entry (the entry's token mix at the new rates over the old; [ADR 0006](../../architecture/0006-price-revisions-scraped-from-bundle.md)), keep raw values, token means, and the per-entry factor beside adjusted costs, warn (don't switch) when the manifest's `latest` ≠ v1.1. When a fetched model is missing from `model-mapping.json`: generate the entry per [ADR 0003](../../architecture/0003-refresh-generates-mapping-entries.md) when the model matches a vendor already in the mapping, and fail the run only for an unknown vendor, which still forces a hand-written mapping decision (revised in ticket 06's grilling from failing on every unmapped model).
- Price revisions live only in the site's deployed bundle, so every DeepSWE refresh fetches the index page, finds the bundle carrying the price table, extracts it, and rewrites `data/price-revisions.json` when it differs; the change lands in the Refresh PR with a before/after section, like a generated mapping entry. Extraction failure hard-errors the DeepSWE half (ticket 10).
- `scripts/refresh-openrouter.ts`: documented `/api/v1/models/{author}/{slug}/endpoints` with `OPENROUTER_API_KEY` (required; all-null throughput across the run = hard error, the unauthenticated symptom). Consumer-endpoint selection per [ADR 0002](../../architecture/0002-throughput-consumer-endpoint.md) via `data/vendor-mapping.json` (`{ vendor, consumerProviderSlug | null }`): among default-tier standard-variant endpoints of any status (a non-zero status is captured with a warning; [ticket 11](tickets/11-capture-demoted-consumer-endpoints.md)), the tag equals the consumer provider slug or the slug + "/" + that endpoint's own `quantization` field, compared case-insensitively (live Moonshot and Z.ai endpoints never expose a bare vendor slug; product variants like `moonshotai/highspeed` never equal their quantization, so they can't match). Hard errors: a vendor missing from the vendor mapping, an ambiguous slug match, a mapped id missing from OpenRouter. Warn and omit (blank in the UI, never a stale value): a `null` slug, zero matches, or a matched endpoint with null throughput; a `null` `openrouterId` (ADR 0003 pending pin) warns and skips. All models fetched sequentially in one run under one `capturedAt`; the full capture is always written (no change-skip, no closeness threshold); 429 honoured via `Retry-After` (max 3 attempts per model). Pure `scripts/openrouter-snapshot.ts` core plus a thin shell, mirroring the DeepSWE pair; both shells share their file, fetch and summary plumbing through `scripts/refresh-io.ts` (architecture ticket 05). (Revised in ticket 02's grilling, 2026-08-27, from the research's median-of-endpoints rule and its "keep raw endpoint values" advice.)

## Schedule and the Refresh PR

Both refreshes run on a weekly schedule (ticket 03, extended by tickets 08 and 09): `.github/workflows/refresh.yml` runs `refresh:deepswe` then `refresh:openrouter` in one job and opens a single Refresh PR on the stable branch `refresh/snapshots`, using a fine-grained PAT so the PR triggers CI; the human review moves from the local diff to the PR. Running DeepSWE first means the OpenRouter half reads the mapping entries the DeepSWE half just generated (ticket 06), so a new model from a known vendor gets its throughput in the same PR and needs no human work beyond merging. The DeepSWE script skips writing when only `raw_sha256`/`source_generated_at` would change and says so in the PR body; the OpenRouter half changes every run, so the Refresh PR opens every week. A half that hard-errors leaves its files untouched, is named in the PR body, and turns the run red while the other half still lands. `OPENROUTER_API_KEY` lives in a repo secret for the workflow and a gitignored `.env` for manual runs — never in a commit (ticket 08, reversing the earlier never-in-CI rule; decided in ticket 02's grilling). `vp run refresh` runs both scripts in the same order locally. Note: the seed throughput snapshot came from the unauthenticated frontend feed, so the documented API path is unverified until the first keyed run.

## Version-bump workflow

**Version-bump workflow** (settling the fog item): the DeepSWE script's warning is the trigger. On a new `latest`: human reads the [changelog](https://deepswe.datacurve.ai/changelog), updates the version pin, reruns, reviews the diff. The refresh resolves price revisions for the pinned version itself (ticket 10 replaced the hand re-check of the bundle; an earlier sentence here relied on `source_generated_at` to flag within-version repricing, which never fired because the refresh skips writing on that field alone).

## Acceptance criteria

- Both refresh scripts run clean against live sources. The DeepSWE refresh produces no diff immediately after a snapshot is committed (modulo `raw_sha256`/`source_generated_at`); the OpenRouter refresh always rewrites — its rolling 30-minute statistic changes every run (ticket 02's write policy).

## Tickets

- [01: DeepSWE refresh script](tickets/01-deepswe-refresh-script.md)
- [02: OpenRouter refresh script](tickets/02-openrouter-refresh-script.md)
- [03: Scheduled DeepSWE refresh](tickets/03-scheduled-deepswe-refresh.md)
- [04: Extract static data to data/](tickets/04-extract-static-data.md)
- [05: Handle null DeepSWE job finish time](tickets/05-handle-null-latest-job-finished-at.md)
- [06: New-model mapping workflow](tickets/06-new-model-mapping-workflow.md)
- [07: Keep refresh snapshot counts in sync](tickets/07-refresh-count-assertions.md)
- [08: Scheduled OpenRouter refresh](tickets/08-scheduled-openrouter-refresh.md)
- [09: Single Refresh PR](tickets/09-single-refresh-pr.md)
- [10: Average cost differs from the DeepSWE site for repriced models](tickets/10-cost-drift-repriced-models.md)
