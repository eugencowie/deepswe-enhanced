# Vendor-reported entries

How a vendor-reported entry is added, corrected or reviewed ([ADR 0009](../architecture/0009-vendor-reported-entries.md), [spec](../planning/vendor-reported-data/spec.md)). Entries land through ordinary PRs, never the weekly refresh; the refresh only supersedes them once DeepSWE publishes the model.

## Admission rules

A claim is admitted only when every rule holds.

1. **DeepSWE v1.1 Pass@1.** The figure is a DeepSWE v1.1 pass rate over attempts. _Why:_ cost per solved task divides by Pass@1, so the column must stay one benchmark; SWE-bench Pro or Terminal-Bench figures never enter it.
2. **The vendor's own publication.** Launch posts, system cards, model cards, vendor docs, and the vendor's official social accounts. _Why:_ the marker cites the vendor; a third-party transcription adds a link nobody checked.
3. **A named effort level.** The source names the effort, or says "highest" where the vendor's own docs name that level. _Why:_ effort is part of an entry's identity, `null` already means "the model's default effort", and an unnamed effort has no place in the effort sort or the Best-entry tiebreak.
4. **No method known to differ.** Admit an unstated harness; reject when the source says the method differs: best of several harnesses, the vendor's own scaffold, best-of-k. _Why:_ the marker already says DeepSWE didn't run it, while a method known to differ is no longer Pass@1 on the same footing.

## Steps

1. **Find the claim.** Look in the vendor's launch post, system card, model card, docs and official social accounts; a DeepSWE figure is sometimes only in the system card (Opus 5.5) or only in a post (GPT-6.1 Sol's high figure). Check `data/deepswe-v1.1.json` and `data/vendor-reported.json` for the model first. _Done when_ you hold, for every effort level the vendor reports, the figure, its source URL and the publication date, and the model is in neither file (or you are correcting its existing entries).
2. **Apply the admission rules.** _Done when_ every rule is answered for every effort level, each answer backed by a quoted line from the source; a "highest" effort also cites the vendor docs that name the level.
3. **Have the maintainer check every chart reading.** Text, tables and charts all count, and where text and a chart give a figure for the same effort, the text wins. For each figure read off a chart, put a checklist to the maintainer: the figure, the chart's URL, the effort level. _Done when_ the maintainer has confirmed or corrected every reading; chart figures are committed only after that.
4. **Pick the model id.** Follow DeepSWE's convention in `data/deepswe-v1.1.json`: lowercase, dots and spaces become dashes (`claude-opus-5-5`, `gpt-6-1-sol`). The refresh supersedes on an id match, and catches a wrong guess by matching OpenRouter ids instead, which works only when both mapping entries have one; a `null` on either side leaves the duplicate for the Refresh PR's reviewer. _Done when_ the id follows the convention and no existing mapping entry uses it.
5. **Write the entries** in `data/vendor-reported.json`, one per admitted effort level, to `vendorReportedEntrySchema` in `src/data/schema.ts`. The fields that take judgement:
   - `source`: the citation the tooltip shows, naming the document and section (`Claude Opus 5.5 System Card §8.3`).
   - `sourceUrl`: the most direct URL to the figures (the PDF, not the launch page that links it). One source covers every figure on the entry, so cite the document that holds them all.
   - `figureFrom`: `"chart"` when any figure on the entry, Pass@1 or a stated cost, was read off a chart.
   - `effort`: the vendor's own name for the level, lowercase as DeepSWE writes them (`max`, `xhigh`, `high`, `medium`, `low`); "highest" becomes the level the vendor's docs name.

   _Done when_ every admitted effort level has exactly one entry.
6. **Write the model-mapping entry** in `data/model-mapping.json` for each model new to the mapping; the refresh generates entries only for models DeepSWE publishes.
   - `leaderboardModel`: the entries' `model`.
   - `displayName`: the OpenRouter listing name minus the vendor prefix and any revision token (ADR 0003); `shortName` only when the Subscriptions picker needs a shorter label.
   - `openrouterId`: the revision-pinned listing where OpenRouter has one, else its listing (ADR 0002), else `null`.
   - `vendor` and `family`: copied from the vendor's other entries.
   - `usageMultiplier`: 1 unless the vendor's subscription limits for the model are non-standard (Fable 5 is 0.5); cite the source.

   A vendor new to the mapping also needs a vendor-mapping entry, a vendor mark and a family (`none` unless its tiers are in `data/tiers.json`); see the [model-data spec](../planning/model-data/spec.md). _Done when_ every model in `data/vendor-reported.json` has a mapping entry.
7. **Verify.** Run `mise run check` and `mise run test`; the load-time checks reject overlap with DeepSWE, duplicate OpenRouter ids, and uncovered models. Then look at each new row on `mise run dev`. _Done when_ both pass and every new row shows its vendor-reported marker, with a tooltip naming the right source and date, and "Read from a chart" on exactly the chart readings.
8. **Write the PR body.** _Done when_ it lists each entry with its source, effort, figure and `figureFrom`; the maintainer's sign-off on each chart reading; the vendor docs behind any "highest" effort; each rejected claim with the rule it failed; and each mapping fact with its source.
