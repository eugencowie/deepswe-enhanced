# 06: New-model mapping workflow

Type: task
Status: resolved
Blocked by: none

## Problem

When the DeepSWE leaderboard gains a model that isn't in `data/model-mapping.json`, the refresh fails by design and the scheduled run emails a failure until a human adds the mapping. That happened on 2026-08-27 with `glm-5-3-flash` ([ticket 05](05-handle-null-latest-job-finished-at.md)); the mapping was deliberately left out of that ticket's scope.

Every Friday cron run fails with the mapping error until this ticket lands.

## Decide

How new leaderboard models are handled going forward:

- Can the refresh auto-populate a mapping entry (display name, vendor, OpenRouter id, subscription family, usage multiplier) so the run produces a PR instead of failing? PR review would remain the check that the determined values are correct.
- Which fields can be determined automatically and which need a human default (e.g. family `none`, multiplier `1.0`)?
- A new vendor also requires a vendor-mark entry in `src/components/vendor-mark-svgs.ts` (enforced by test); decide whether that stays a manual step that fails the run.

## Immediate case

`glm-5-3-flash` needs a mapping entry: display name, vendor (Z.ai — vendor mark already exists), OpenRouter id, subscription family, usage multiplier. The live artifact has 63 rows vs the checked-in 62; the new configuration is `mini_swe_agent_glm_5_3_flash_max`.

## Decision (grilled 2026-08-27)

A new model from a known vendor requires no human work beyond merging the Friday PR. Recorded in [ADR 0003](../../../architecture/0003-refresh-generates-mapping-entries.md); spec and glossary amended.

- On an unmapped leaderboard model, the refresh looks it up on the OpenRouter models API, considering only org slugs already present in the mapping. A match means a known vendor: the refresh generates the mapping entry, writes it to `data/model-mapping.json`, and continues. No match means a new vendor: the run fails as today (vendor string, mark, and family are judgment calls).
- Derivation rules:
  - `leaderboardModel`: the artifact row's `model` field, never parsed from `config` (ambiguous: `glm_5_3_max` vs `glm_5_3_flash_max`).
  - `openrouterId`: the OpenRouter id whose suffix, dots normalised to dashes, equals the leaderboard model id (validated against 23/25 existing entries). `null` when the matched listing has dated siblings (revision pinning is a judgment call, ADR 0002 — the undated `deepseek/deepseek-v4-pro` alias points at 0423 while we pin 0813) or when the match is ambiguous. `null` degrades to blank throughput — the reviewer's cue to pin by hand. An unreachable models API fails the run like any other fetch error; retry via `workflow_dispatch` (revised post-grilling: generating without the lookup can't determine the vendor, and the case is too rare to carry a fallback).
  - `displayName`: OpenRouter's `name` minus the `"Vendor: "` prefix, minus a trailing revision token on date-pinned ids (keeps ADR 0002's "no revisions in the UI"). Always from a matched listing — a model with no match generates nothing, so no other name source exists.
  - `vendor`, `family`: copied from existing entries with the same org slug — never from OpenRouter's vendor prefix (it says "SpaceXAI" for xAI).
  - `usageMultiplier`: 1.0; no `shortName`. A future half-rate model merging at 1.0 is the reviewer's catch. Also no `excludedTiers`: a model a tier excludes (a new Fable on Pro) is likewise the reviewer's catch (added in subscription-data ticket 02).
- The workflow's `create-pull-request` step adds `data/model-mapping.json` to `add-paths`, so one PR carries snapshot and mapping together.
- Display-name alignment: the derivation becomes the definition, so `GLM-5.3` → `GLM 5.3` and `GLM-5.2` → `GLM 5.2` in the mapping (and the spec's mirror table). The other 23 entries already match; DeepSeek names stay revision-free.
- Immediate case: `glm-5-3-flash` is deliberately **not** hand-added. After this lands, a manual `workflow_dispatch` run is the acceptance test: its PR must contain the generated entry.

## Completion criteria

- The refresh generates mapping entries per the decision above; the new-vendor case still fails with the existing actionable error.
- Tests cover the derivation rules: known-vendor match, dated-siblings → `null`, ambiguous match → `null`, new vendor → hard failure. An unreachable OpenRouter API fails the run — shell behaviour (the fetch throws), deliberately untested like the artifact fetch itself.
- `.github/workflows/refresh.yml` includes `data/model-mapping.json` in `add-paths`.
- `GLM-5.3` and `GLM-5.2` display names become `GLM 5.3` and `GLM 5.2` in `data/model-mapping.json` and the spec's mapping table.
- No hand-written `glm-5-3-flash` entry. Post-merge verification: a `workflow_dispatch` run opens a PR whose mapping entry is `glm-5-3-flash` / `GLM 5.3 Flash` / `Z.ai` / `z-ai/glm-5.3-flash` / `none` / `1.0` (id verified live on OpenRouter) and whose snapshot has 63 rows including `mini_swe_agent_glm_5_3_flash_max`.
- `mise exec -- vp check` and `mise exec -- vp test` pass.

## Comments

**2026-08-27** — Implemented: `scripts/mapping-generation.ts` (pure derivation, ADR 0003 rules) wired into `scripts/refresh-deepswe.ts`; the mapping file is written only after normalize succeeds, preserving "a tripped guard rail writes nothing". Workflow `add-paths` now includes `data/model-mapping.json`. GLM display names renamed in mapping and spec table; spec's model-mapping intro updated ("hand-curated" no longer holds). Tests cover all derivation branches (83 pass; `vp check` clean).

One point the grilling under-specified: "OpenRouter unreachable → null id with a warning" assumed generation could proceed, but the vendor also comes from the OpenRouter match. A sibling-id fallback was implemented, then stripped on review: the case (new model the same Friday OpenRouter is down) is too rare to carry ~40 lines, and its output needed hand-fixing anyway. An unreachable models API now fails the run like any other fetch error; the failure email is the alert and a manual `workflow_dispatch` the retry.

Verified end-to-end against the live artifact: the refresh generated exactly the expected `glm-5-3-flash` entry (`GLM 5.3 Flash` / `Z.ai` / `z-ai/glm-5.3-flash` / `none` / `1.0`) and wrote a 63-row snapshot including `mini_swe_agent_glm_5_3_flash_max`. Both data outputs were then reverted so the post-merge `workflow_dispatch` run produces them in the acceptance PR.

**2026-08-27** — Code-review fixes (grilled): ambiguous same-vendor matches now take the display name from the matched listing (the candidates are the same model, so either name serves; the title-case fallback is deleted); the dated-sibling scan is restricted to the match's own org; `unmappedModels` is extracted into `deepswe-snapshot.ts` and shared by the guard and the generator; `data/model-mapping.json` is deliberately canonicalised to the refresh writer's serialization (`1.0` → `1`) so generated-entry diffs stay minimal; variant/alias exclusion documented in ADR 0003; "org slug" added to the glossary. The unreachable-API criterion is reworded: the failure is shell behaviour (the fetch throws) and deliberately untested, like the artifact fetch.
