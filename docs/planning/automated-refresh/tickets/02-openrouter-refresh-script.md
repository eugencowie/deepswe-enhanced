# 02: OpenRouter refresh script

Type: task
Status: resolved
Blocked by: avg-time-data/01

## What to build

Running the OpenRouter refresh script updates the checked-in throughput snapshot: for every mapped model it calls the documented model-endpoints API with a bearer key, selects the vendor's consumer endpoint per [ADR 0002](../../../architecture/0002-throughput-consumer-endpoint.md), and writes all models in one run under a single capture timestamp — per the reproducible fetch in the [research findings](../../product-spec/research/openrouter-throughput.md) and the [spec](../spec.md).

Consumer-endpoint selection reads `data/vendor-mapping.json` (new in this ticket): an array of records keyed by the exact `vendor` strings in `model-mapping.json`, each with a consumer provider slug or `null` for a vendor that deliberately runs no consumer endpoint. The script matches the slug exactly against standard-variant endpoints. Seed the file from the frontend-feed research and commit it; the first keyed run verifies the seeds.

Guards: a mapped model id missing from OpenRouter is a hard error (the mapping is wrong — ids are revision-pinned); a vendor present in `model-mapping.json` but absent from `vendor-mapping.json` is a hard error (forgot-to-map, distinct from decided-no-endpoint); more than one standard-variant endpoint matching a vendor's slug is a hard error (a human decides which is the consumer endpoint); zero matches for a non-null slug, or a `null` slug, is a warning and the model is omitted from the snapshot (blank in the UI — this happened to the unpinned DeepSeek V4 Pro listing between 2026-08-20 and 08-25).

Key handling: `OPENROUTER_API_KEY` is never committed — a gitignored local `.env` serves manual runs, and a repo secret serves the scheduled workflow once [ticket 08](08-scheduled-openrouter-refresh.md) lands; a missing key or all-null throughput (the unauthenticated symptom) is a hard error. Handle 429 with `Retry-After`. This first keyed run also verifies the documented API path, which the seed and 2026-08-25 snapshots (frontend feed) never exercised — flag any discrepancy against the research findings.

## Decisions (grilled 2026-08-27)

- Snapshot shape: unchanged from the seed — `{ source, sourceUrl, capturedAt, models: { <openrouterId>: { consumerP50 } } }`, one run-start ISO-UTC `capturedAt`. No raw endpoint values: post-ADR-0002 selection is a guarded exact match, so the audit trail is the run's warnings and errors, not arrays in the file (mirrors ticket 01's discard-the-raw-artifact decision), and endpoint arrays would churn hundreds of unread numbers per refresh. Supersedes the spec's "endpoints detail joins the type with ticket 02" line and the research's median-era "keep raw endpoint values" advice; UI and `src/data/types.ts` untouched.
- `data/vendor-mapping.json`: array of `{ vendor, consumerProviderSlug | null }`, nothing else; the per-vendor rationale stays in ADR 0002 rather than a `note` field that would drift.
- Warn + omit, never a stale substitute (ADR 0002: "a blank, never a substitute statistic"): a `null` slug, zero slug matches, and a matched consumer endpoint whose `throughput_last_30m`/`p50` is null all omit the model with a warning. A model present in the checked-in snapshot but omitted now is warned with its previous value (ADR 0002's disappearance consequence) — the old number lives in the review, not the data.
- `openrouterId: null` (ADR 0003 pending pin) warns and skips; it is not the missing-id hard error. A pending editorial decision must not block every refresh.
- Write policy: always write the full fresh capture. No meaningful-change skip (a rolling 30-minute statistic always changes) and no closeness threshold (hysteresis would mix weeks under one `capturedAt` and make runs state-dependent). Any hard error aborts before writing.
- Fetching: sequential across the ~25 models, keeping the capture window tight; on 429 wait `Retry-After` (default 30 s when the header is absent, capped at 120 s), max 3 attempts per model, then hard error.
- Key loading: `process.loadEnvFile()` on `.env` when present, else the ambient environment; a missing key hard-errors naming both the variable and the file.
- Schema: zod over only the fields the script reads (unknown fields tolerated); a mismatch is a hard error — a lenient parse would disguise a wrong field-name guess as 25 quiet endpoints.
- Structure: pure `scripts/openrouter-snapshot.ts` plus a thin `scripts/refresh-openrouter.ts` shell, package script `refresh:openrouter`, guard-rail unit tests in `scripts/` (mirrors ticket 01).
- The 30-minute window is the only documented statistic — no weekly or historical aggregate exists in the public API. If week-to-week jitter ever misleads, smoothing is its own future design, not a write-policy tweak.
- Scheduling on CI was decided (reversing ticket 03's manual-only scope) and split out as [ticket 08](08-scheduled-openrouter-refresh.md).

## Acceptance criteria

- [x] `data/vendor-mapping.json` covers every vendor in `model-mapping.json`, seeded from the research; refresh hard-fails on a missing vendor or an ambiguous slug match
- [x] Script writes the snapshot in the checked-in shape: per-model consumer endpoint p50, one `capturedAt`
- [x] Missing key and all-null throughput each fail with a clear message
- [x] Flex/priority service-tier endpoints excluded from selection
- [x] 429 responses respected via `Retry-After`
- [x] First keyed run's shape matches the documented API per the research, or discrepancies are reported
- [x] `vp run ready` passes

## Comments

**2026-08-26 (static-data grilling):** The ADR 0002 slug table now lives in `data/vendor-mapping.json` rather than a script constant, following the decided criterion "transcribed upstream facts live in data/". This supersedes the earlier selection wording "base slug or base + '/' + quantization; median of the p50s if several remain": matching is now exact against standard-variant endpoints, and an ambiguous match is a hard error instead of a median. Glossary gained "Vendor", "Vendor mapping", and "Consumer provider slug" (`docs/glossary.md`). Related extractions (cost adjustment factors, provenance URLs) are ticket 04, deliberately out of this ticket's scope. Snapshot shape, null handling, write policy, 429 details, key loading, and schema strictness from the earlier grilling remain open.

**2026-08-27 (grilling):** The open items above are settled in the Decisions section. AC 2's "per-model median plus raw endpoint values" was stale on both counts (the median died with ADR 0002; raw values were rejected following ticket 01's precedent) and now reads "consumer endpoint p50". The spec's snapshot-shape and refresh-scripts sections were amended to match, including its "never in repo secrets or CI" rule, reversed in favour of [ticket 08](08-scheduled-openrouter-refresh.md).

**2026-08-27 (implementation):** Built as `scripts/openrouter-snapshot.ts` (schemas, `buildSnapshot`, `retryAfterMs`) plus the `scripts/refresh-openrouter.ts` shell, run via `vp run refresh:openrouter`; 15 guard-rail tests in `scripts/openrouter-snapshot.test.ts`, `VendorMappingEntry` added to `src/data/types.ts`.

One decided rule fell to live data: **exact slug matching cannot cover Moonshot.** Seeding `vendor-mapping.json` from the live frontend feed showed Kimi K3's vendor endpoint is `moonshotai/mxfp4` while Kimi K2.7 Code's is `moonshotai/int4` (and Z.ai's is always `z-ai/fp8`) — one exact slug per vendor can't match both Kimis. Selection therefore uses avg-time-data ticket 02's mechanical rule minus its median fallback: an endpoint matches when its tag equals the consumer provider slug, or the slug + `/` + that endpoint's own `quantization` field (which excludes product variants like `moonshotai/highspeed`); several survivors remain a hard error. The spec's selection bullet was amended. Also of note: the April-preview permaslug for DeepSeek V4 Pro lists no `deepseek` endpoint at all while the pinned 0813 revision does — the revision-pinning decision (ADR 0002) is what makes DeepSeek's consumer endpoint findable.

Verified: `vp run ready` passes (103 tests); a keyless run fails with the clear `OPENROUTER_API_KEY is required` message and writes nothing. Remaining: the first keyed run (needs the user's key in `.env`), which verifies the seeds and the documented API's field names — the zod schema hard-fails on any discrepancy by design.

**2026-08-27 (first keyed run):** Success, no discrepancies: the documented API's field names (`tag`, `status`, `quantization`, `throughput_last_30m`) match the research, and every vendor slug seed matched exactly one endpoint — all 26 mapped models captured, zero warnings, zero omissions. The refreshed snapshot also picks up `z-ai/glm-5.3-flash`, which the ticket-18-era mapping had but the 08-25 seed predated. Value moves against the seed sit within rolling-30-minute jitter (largest: kimi-k2.7-code 31.5 → 20, muse-spark-1.1 228 → 174); DeepSeek V4 Flash still reads its consumer endpoint (~76), confirming the selection didn't regress to the median-era bug. `vp run ready` passes against the refreshed data. Ticket resolved.

**2026-08-27 (code review):** Two-axis review against `main`, findings grilled and settled. Fixed: `mise.toml` gains the `refresh:openrouter` task (ADR 0001's discovery rule — the one hard violation); the disappearance warning now also covers a model removed from the mapping while present in the old snapshot (catch-all pass, closing the ADR 0002 letter-of-the-law gap); slug/tag matching is case-insensitive on both sides (was asymmetric — only quantization was lowercased); the `status === 0` active-endpoint filter, from the research's "keep active endpoints" step, is now documented in the spec's selection bullet. Reviewed and declined: deduplicating the "mapping is wrong" message across the shell's 404 path and the core's missing-data path (two distinct failures sharing advice text); replacing the coverage test's independent set-difference with an exported helper (independence is the point); stripping `retryAfterMs`'s RFC 9110 HTTP-date branch (legitimate header form, correctly capped). The `labels: chore` workflow commit predates this ticket's work and rides along.
