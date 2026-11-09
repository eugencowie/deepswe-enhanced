# 09: Single Refresh PR

Type: task
Status: resolved
Blocked by: 08

## What to build

Collapse the two parallel jobs in `.github/workflows/refresh.yml` into one job that runs the DeepSWE refresh and then the OpenRouter refresh, and opens one pull request, the Refresh PR, carrying both snapshots and any generated mapping entries.

This reverses ticket 08's two-jobs-two-PRs decision. Its reasons and why they no longer hold:

- *Different rhythms*: a no-op DeepSWE week rides along with the always-changing OpenRouter diff. Accepted; the DeepSWE summary now says so explicitly (see Decisions).
- *A stale unmerged PR for one half blocks review of the other*: in practice both PRs merge within minutes of each other every Friday.
- *Independent failure*: preserved inside the single job (see Decisions).

The driver is a coupling the split ignored: `refresh-openrouter.ts` reads `data/model-mapping.json`, so when the DeepSWE half generates a mapping entry for a new model, the parallel OpenRouter job runs against the old mapping. The new model then ships with blank throughput until the DeepSWE PR is merged and the workflow is re-run by hand to rewrite the OpenRouter PR.

## Decisions (grilled 2026-09-03)

- Shape: one job, DeepSWE step first, OpenRouter step second, so the OpenRouter step reads the mapping entries the DeepSWE step just generated and a new known-vendor model gets its throughput in the same Refresh PR.
- Failure: both refresh steps run with `continue-on-error`. The Refresh PR carries whichever half wrote files (both scripts already write nothing on a hard error, so a half-PR is always coherent), the body names the failed half, and a final step marks the job red so the failure email still arrives. If DeepSWE fails before generating entries, OpenRouter runs against the committed mapping, which is today's behaviour.
- Generated id that 404s: the OpenRouter step still hard-errors. The Refresh PR then carries the snapshot and the generated entry, the OpenRouter half is absent, the job is red, and the reviewer pins the id on the branch and re-runs. Softening the 404 for generated entries would let a wrong id merge silently.
- No-op DeepSWE week: the DeepSWE summary states "No content change" explicitly. The before/after table alone cannot distinguish unchanged from changed-with-equal-counts.
- Branch and PR: stable branch `refresh/snapshots`, title "chore(deps): Refresh snapshots", label `chore`. The old remote branches `refresh/deepswe` and `refresh/openrouter` are deleted after the new workflow has run green once.
- PR body: two sections, one per source, each keeping its current review guidance and summary. Each script's summary heading names its source so the two do not collide. The failed-half text is selected with inline GitHub expressions on the step outcome (`outcome == 'failure' && '<failed line>' || outputs.summary`); action inputs are not shell, so splicing upstream text there is injection-safe and no compose step is needed.
- `workflow_dispatch` still runs both halves with no input (ticket 08 decision stands).
- Local mirror: a `refresh` script in `package.json` and a matching mise task run both scripts in workflow order, so a manual run reproduces the Refresh PR contents.
- Glossary: "Refresh PR" added to [docs/glossary.md](../../../glossary.md); ADR 0003's "Friday PR" reworded to match. No ADR for this ticket: the decision is cheap to reverse and this ticket records the trade-off.

## Acceptance criteria

- [x] `refresh.yml` has one job running DeepSWE then OpenRouter and opening one PR on `refresh/snapshots` with both snapshots and any generated mapping entries
- [x] A hard error in either half leaves that half unwritten, the PR carries the other half with the failure named in the body, and the run is red
- [x] A no-op DeepSWE week is stated as such in the PR body
- [x] `vp run refresh` / `mise run refresh` run both scripts in workflow order
- [x] Spec's scheduled-refresh paragraph and ticket 08 cross-reference the reversal
- [x] `vp run ready` passes

## Comments

**2026-09-03 (implementation):** Built per the Decisions. `refresh.yml` is one `refresh` job: checkout, setup-vp, `vp run refresh:deepswe` then `vp run refresh:openrouter` (both `continue-on-error`, the latter with the secret in step env), `create-pull-request` on `refresh/snapshots` with all three data paths, and a final step that exits 1 when either half's outcome is `failure`. The body has a DeepSWE and an OpenRouter section, each keeping its review guidance, with the summary or a fixed failed-half line chosen by an inline expression on the step outcome. Both scripts' summary text moved into their pure cores as `summarizeRefresh` (tested; headings now name the source), and the DeepSWE summary states "No content change" when the write was skipped. `refresh` script and mise task added. Spec paragraph amended; ticket 08 cross-referenced. Verified: `vp check` and `vp test` pass (112 tests); a live local `refresh:deepswe` with `GITHUB_OUTPUT` set emitted the new summary with the no-op line. Remaining human steps: merge, test-drive with `gh workflow run refresh.yml`, then delete the `refresh/deepswe` and `refresh/openrouter` remote branches after the first green run.

**2026-09-03 (code review):** Two-axis review of the commit, findings settled. Fixed: the spec's scheduled-refresh paragraph still said the PR opens only when the snapshot changed (rewritten around the weekly Refresh PR); the PR body's guidance paragraphs were wrapped across lines under a literal block, which GitHub renders as hard breaks (one line per paragraph now); the OpenRouter summary took `capturedAt` separately from the snapshot that already carries it (parameter dropped); remaining "weekly refresh PR" / "refresh PR" wording in `mapping-generation.ts`, the Generated mapping entry glossary line, and ADR 0004 aligned to the glossary term. Accepted, not changed: when a run stages no changes at all (both halves failed, or a no-op DeepSWE week with an OpenRouter failure) `create-pull-request` finds no diff, so the failure is reported only by the red run, not a PR body, and an unmerged Refresh PR from a previous week is closed with its branch; this matches the old per-branch behaviour. The local `vp run refresh` stops at the first failing half rather than continuing like the workflow; a local operator sees the failure and can run the other half directly.
