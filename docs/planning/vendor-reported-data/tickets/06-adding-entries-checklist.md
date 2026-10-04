# 06: Checklist for adding a vendor-reported entry

Type: task
Status: ready-for-agent
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

- [ ] The doc exists and links the spec and ADR 0009
- [ ] The rules match the spec's
- [ ] AGENTS.md or the issue-tracker doc points to it, so an agent adding an entry finds it
