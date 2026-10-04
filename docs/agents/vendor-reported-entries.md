# Adding a vendor-reported entry

A vendor-reported entry is a vendor's own DeepSWE v1.1 claim for a model the DeepSWE leaderboard hasn't published ([ADR 0009](../architecture/0009-vendor-reported-entries.md), [spec](../planning/vendor-reported-data/spec.md)). Claims don't arrive through the weekly refresh: each one is added by hand, through an ordinary PR, by following the steps below. The refresh removes them again once DeepSWE publishes the model.

## Admission rules

A claim is admitted only when every rule holds. This list is the single source of truth for them.

1. **DeepSWE v1.1 Pass@1.** The figure is a DeepSWE v1.1 pass rate over attempts. _Why:_ cost per solved task divides by Pass@1, so the column must stay one benchmark; SWE-bench Pro or Terminal-Bench figures never enter it.
2. **The vendor's own publication.** Launch posts, system cards, model cards, vendor docs, and the vendor's official social accounts. _Why:_ the marker cites the vendor; a third-party transcription adds an unverified link to the chain.
3. **A named effort level.** The source names the effort, or says "highest" where the vendor's own docs name that level (cite those docs too). _Why:_ effort is part of an entry's identity, `null` already means "the model's default effort", and an unnamed effort has no place in the effort sort or the Best-entry tiebreak.
4. **No method known to differ.** Admit an unstated harness; reject when the source says the method differs: best of several harnesses, the vendor's own scaffold, best-of-k. _Why:_ the marker already flags the figure as unverified, while a method known to differ is no longer Pass@1 on the same footing.

Text, tables and charts all count as sources for the figure. Where text and a chart give a figure for the same effort, the text wins.

## Steps

1. **Find the claim.** Search the vendor's launch post first, then the system card or model card: Anthropic, for one, reports DeepSWE only in system cards. Check `data/deepswe-v1.1.json` too: a model DeepSWE already publishes takes no claim. _Done when_ you hold the source URL, its publication date, and the figure for every effort level the source reports.
2. **Apply the admission rules.** _Done when_ every rule is answered for every effort level, each answer backed by a quoted line from the source. Record rejections with the rule that failed; they go in the PR body.
3. **Have the maintainer check every chart reading.** For each figure read off a chart, put a checklist to the maintainer: the figure, the chart's URL, the effort level. Their sign-off is the review. _Done when_ the maintainer has confirmed or corrected every reading; commit nothing read from a chart before then.
4. **Pick the model id.** Follow DeepSWE's convention: lowercase, dots and spaces become dashes (`claude-opus-5-5`, `gpt-6-1-sol`). The refresh supersedes the claim on an id match; a wrong guess is still caught by the OpenRouter-id match, since mapping entries must have unique OpenRouter ids.
5. **Write the entries** in `data/vendor-reported.json`, one per admitted effort level. `vendorReportedEntrySchema` in `src/data/schema.ts` defines the fields. The ones that take judgement:
   - `figureFrom`: `"chart"` for a figure read off a chart, else `"text"`.
   - `publishedAt`: the source's publication date, `YYYY-MM-DD`.
   - `harness`, `trials`, `average_cost_usd`, `output_tokens`, `steps`: only when the source states them.
6. **Write the model-mapping entry** in `data/model-mapping.json` for a model new to the mapping. The refresh generates entries only for models DeepSWE publishes, so these are hand-written:
   - `displayName`: the OpenRouter listing name minus the vendor prefix and any revision token (ADR 0003).
   - `openrouterId`: the revision-pinned listing (ADR 0002), or `null` when OpenRouter has none yet.
   - `family` and `vendor`: copied from the vendor's other entries.
   - `usageMultiplier`: 1 unless the vendor's subscription limits for the model are non-standard (Fable 5 is 0.5); cite the source.
   A vendor with no entries in the mapping also needs a vendor-mapping entry and a vendor mark (see the [model-data spec](../planning/model-data/spec.md)).
7. **Verify.** Run `vp check` and `vp test`; the load-time checks reject overlap with DeepSWE, duplicate OpenRouter ids, and uncovered models. Then open the dev server (`mise run dev`) and look at each new row. _Done when_ both pass and every new row shows its vendor-reported marker, with a tooltip naming the right source and date.
8. **Write the PR body.** List each entry with its source, effort, figure and `figureFrom`; the maintainer's sign-off on each chart reading; each rejected claim with the rule it failed; and the mapping facts with their sources.
