# 06: Checklist for adding a vendor-reported entry

Type: task
Status: resolved
Blocked by: none

## What to write

A short doc, `docs/agents/vendor-reported-entries.md`, for an agent adding a vendor-reported entry. Vendor claims don't arrive through the weekly refresh, so this doc is how they get added. It covers:

- The [spec's admission rules](../spec.md#admission-rules), each with one line on why it exists.
- Where to look: launch posts, system cards (DeepSWE figures are sometimes only there, as with Opus 5.5), model cards, docs, the vendor's official social accounts.
- The chart rule: read the figure, then put a checklist to the maintainer before committing. Text beats chart for the same effort.
- The entry's fields, and the hand-written mapping entry each new model needs.
- Picking the model id: the best guess at DeepSWE's convention, and why a wrong guess is still caught (unique OpenRouter ids, ADR 0009).
- What happens later: the refresh supersedes the model once DeepSWE publishes it.

A recurring agent task that scans vendor launches can come later on top of this checklist.

## Acceptance criteria

- [x] The doc exists and links the spec and ADR 0009
- [x] The rules match the spec's
- [x] AGENTS.md or the issue-tracker doc points to it, so an agent adding an entry finds it

## Comments

**Implementation notes (2026-10-04):**

- The doc is the single source of truth for the admission rules; the spec's Admission rules section points to it, so the two can't drift. The spec's rule 3 (text or chart) became a note under the rules plus the maintainer-check step.
- Field shapes stay in `vendorReportedEntrySchema`; the doc covers only the fields that take judgement.
- AGENTS.md points to the doc in its own section.
- Review follow-up: every step ends on a completion criterion; step 5 covers the fields that take judgement (`source`, `sourceUrl`, `effort`) instead of restating the schema; step 4 states that the OpenRouter-id match needs both ids non-null; the spec's section is now a bare pointer.

**2026-10-06 — The guide is folded in**, at the maintainer's request on #95: most of it restated what an agent finds in the source (the id convention in the data, the field shapes in the schema, the checks in `mise run check`). Its policy moved where the decisions and fields live: the admission rules, the "highest" effort and the chart sign-off to [ADR 0009](../../../architecture/0009-vendor-reported-entries.md#admission), with what a PR body must show as a consequence; the `source`, `sourceUrl` and `effort` judgements to comments on `vendorReportedEntrySchema`. `AGENTS.md` points at the ADR and names the chart sign-off, the step an agent must not skip.
