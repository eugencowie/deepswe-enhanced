# 07: Review follow-ups

Type: task
Status: claimed
Blocked by: none

## What to build

Follow-ups from the review of [#95](https://github.com/eugencowie/deepswe-enhanced/pull/95) against `main`, settled in a grilling with the maintainer on 2026-10-06. Vocabulary: **vendor-reported entry**, **model mapping**, **Refresh PR** in [docs/context.md](../../../context.md).

### The model name replaces the marker

- **No badge.** The purple "vendor-reported" badge goes. A vendor-reported row is marked by its row tint and its model name.
- **The name links to the source**, in the same tab, so the source stays reachable by keyboard and touch (the reason ticket 03 made the marker a link). DeepSWE rows' names stay plain text.
- **Tooltip.** On hover or focus the name shows the vendor-reported note.
- **Look.** Normal text colour with a dashed purple underline; on hover the text turns purple and the underline goes solid.
- **Accessible name.** The link's name stays the display name, and the note is its description via `aria-describedby`. Fallback, if that clashes with the tooltip's own wiring: an `aria-label` of "{name}, vendor-reported: {note}".
- **No OpenRouter-id tooltips.** Every model name loses its OpenRouter-id tooltip, which served no purpose, and `LeaderboardRow` loses `openrouterId`. Throughput still reads the id from the mapping.
- **Open before merging:** the name's dashed purple underline and the column headers' dotted grey one get aligned, either dropping the purple or adopting it for the headers.

### `figureFrom` goes

Its only use was "Read from a chart." in the tooltip, which overstated the doubt: OpenAI's chart figures came from the chart's labels and data, and for three entries only the cost was chart-read. The checklist keeps the maintainer's sign-off on every chart reading, recorded in the PR body.

### The refresh's chaining becomes testable

- `planDeepsweRefresh` in `scripts/` takes the fetched inputs and returns what to write; `scripts/refresh-deepswe.ts` becomes fetch, plan, write.
- `summarizeRefresh` takes the supersession result whole, not `superseded`, `standing` and the mapping's new size.
- `normalize` loses its default for the vendor-reported models; its callers pass the set.

### Smaller fixes

- The toggle's e2e test takes its model from the data file, looking up the name and vendor through the mapping, and skips when the file has no entries. A test naming a live model fails once the refresh supersedes it (ADR 0004).
- `LeaderboardFilters.vendorReported` becomes `includeVendorReported`, set by `setIncludeVendorReported`; inside it, `unlisted` becomes `vendorReportedModels`.
- ADR 0009 and the spec say the data file is written by hand through ordinary PRs, with the refresh only deleting from it, not "hand-maintained" (avoided in the glossary).

### Kept as they are

The header and cell tints stay applied separately; the refresh still validates the mapping before any write; the toggle line keeps its grey highlight once the user has used the keyboard (the browser's `:focus-visible` heuristic).

## Acceptance criteria

- [ ] No vendor-reported badge; a vendor-reported model's name is a same-tab link to its `sourceUrl`, with a dashed purple underline, and the note as its tooltip and accessible description
- [ ] No model name has an OpenRouter-id tooltip, and `LeaderboardRow` has no `openrouterId`
- [ ] `figureFrom` is gone from the schema, data, note, tests, spec and checklist; the checklist still has the chart sign-off
- [ ] An e2e test checks, in the All view, one source link per vendor-reported entry, each to its `sourceUrl` and described with its `source`, from the data file; it skips when the file is empty
- [ ] The toggle's e2e test names no live model and skips when the file is empty
- [ ] `planDeepsweRefresh` exists, the script calls it, and a unit test shows a refresh publishing a vendor-reported model yields files that pass the load-time checks
- [ ] `summarizeRefresh` takes the supersession result; `normalize` has no default for vendor-reported models
- [ ] The filter flag is `includeVendorReported`
- [ ] ADR 0009, the spec, the checklist, the glossary and the model-data spec match the above
- [ ] The underline is aligned with the column headers' before #95 merges
- [ ] `mise run validate` passes

## Comments
