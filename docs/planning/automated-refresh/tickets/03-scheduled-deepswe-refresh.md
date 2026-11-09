# 03: Scheduled DeepSWE refresh

Type: task
Status: resolved
Blocked by: 01

## What to build

A scheduled GitHub Actions workflow that runs the DeepSWE refresh script and opens a pull request when the snapshot changed, keeping a human review between upstream data and `main`. Plus a tweak to the refresh script itself: skip writing when nothing meaningful changed, so no-op upstream churn never reaches the workflow's diff check.

## Decisions (grilled 2026-08-25)

- Scope: DeepSWE only. The OpenRouter refresh (ticket 02) stays manual — scheduling it would put `OPENROUTER_API_KEY` in repo secrets, which the spec rules out. The workflow needs no secrets beyond the PR token.
- Token: a fine-grained PAT (contents + pull-requests write, this repo only) stored as the `REFRESH_PR_TOKEN` repo secret, because PRs created with the default `GITHUB_TOKEN` don't trigger the `ready`/`e2e` checks. Provisioned via a one-off wizard script (run once, not committed); the token was created without an expiry, so no renewal chore.
- Cadence: weekly cron plus `workflow_dispatch`, in a separate `.github/workflows/refresh.yml` (its triggers and permissions differ from `ci.yml`).
- Skip logic lives in `scripts/refresh-deepswe.ts`, not the workflow: the script compares the fresh snapshot against the checked-in file and leaves it untouched when the only differences are `raw_sha256` and/or `source_generated_at` — both ride along with the next real change. Rationale: upstream regenerates the "live" artifact (observed: a new `mean_cache_tokens` field with identical consumed fields), and the footer date should only advance when the data actually changed. Manual runs get the same behavior for free.
- Branch/PR model: one stable branch (`refresh/deepswe`) force-updated per run, so there is at most one open refresh PR, updated in place. `peter-evans/create-pull-request` handles no-diff runs, branch reuse, and PR creation.
- Guard-rail trips (new unmapped model) fail the workflow run; the failure notification is the alert. No GitHub issue — the repo's tracker is local Markdown.
- No auto-merge: the PR always waits for human review. The refresh job stays minimal (fetch + script + PR); validation is the PR's normal CI.
- Glossary: "Snapshot" reworded in [docs/glossary.md](../../../glossary.md) from "refreshed manually" to "refreshed only through human-reviewed commits, never at build or run time" — the invariant is human review and build-time-static data, not who types the command. Spec's refresh-scripts section amended to match.

## Acceptance criteria

- [x] `vp run refresh:deepswe` leaves the snapshot untouched when only `raw_sha256`/`source_generated_at` differ, and says so; the skip logic is unit-tested
- [x] `.github/workflows/refresh.yml`: weekly cron + `workflow_dispatch`, runs the refresh script, opens/updates a PR on `refresh/deepswe` only when the snapshot changed
- [x] The PR is created with the PAT secret so `ready`/`e2e` run on it — secret provisioned; the user test-drives after merge and will open a new ticket if the run misbehaves
- [x] A guard-rail failure (e.g. unmapped model) fails the workflow run without writing anything
- [x] `vp run ready` passes

## Comments

**2026-08-25** — Implemented: `hasMeaningfulChange` in `scripts/deepswe-snapshot.ts` (strips `raw_sha256` + `source_generated_at`, compares the rest), the skip in `scripts/refresh-deepswe.ts`, three new tests (66 total), and the workflow (Friday 16:00 UTC cron + dispatch, `peter-evans/create-pull-request@v8`, `add-paths: data/deepswe-v1.1.json`). Verified live: a run against unchanged upstream prints "No content change" and leaves the file untouched.

The PAT was provisioned with a one-off wizard script (run once and discarded, not committed): fine-grained, this repo only, contents + pull-requests write, no expiry, stored as the `REFRESH_PR_TOKEN` secret. Remaining human step: merge to `main`, then optionally test-drive with `gh workflow run refresh.yml`. Note GitHub disables cron workflows after 60 days of repo inactivity.

**2026-08-25** — Ticket closed complete at the user's direction; the post-merge test drive happens outside this ticket, with any failure tracked as a new ticket.

**2026-08-27** — The post-merge test drive failed because the live artifact returned a null `latest_job.finished_at`; findings and the follow-up decision are recorded in [ticket 05](05-handle-null-latest-job-finished-at.md).

**2026-08-27** — The "OpenRouter refresh stays manual" scope decision was reversed in ticket 02's grilling: [ticket 08](08-scheduled-openrouter-refresh.md) schedules it in this workflow with `OPENROUTER_API_KEY` as a repo secret.
