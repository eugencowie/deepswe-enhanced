# 07: Review follow-ups

Type: task
Status: resolved
Blocked by: none

## What to build

Follow-ups from the review of [#95](https://github.com/eugencowie/deepswe-enhanced/pull/95) against `main`, settled in a grilling with the maintainer on 2026-10-06. Vocabulary: **vendor-reported entry**, **model mapping**, **Refresh PR** in [docs/context.md](../../../context.md).

### The model name replaces the marker

- **No badge.** The purple "vendor-reported" badge goes. A vendor-reported row is marked by its row tint and its model name.
- **The name opens a popover** (revised after a prototype; first built as a link to the source with the note as a tooltip). The popover, shadcn's on Base UI with `openOnHover`, opens on hover, tap or Enter. It reads "Vendor reported" as a heading, then the source by name, linked in the same tab, then its date in muted text (revised after review; it first said "Reported by the vendor, not run by DeepSWE." and added a harness-and-trials line). Tap and Enter move focus onto the link, so the source is reachable by mouse, touch and keyboard (the reason ticket 03 made the marker a link); a tooltip can't open on tap or take focus. DeepSWE rows' names stay plain text.
- **Look.** Normal text colour with a dotted grey underline, as the column headers mark their tooltips, and the ordinary cursor rather than a pointer. The trigger is a span with the button role (Base UI's `nativeButton={false}`), so the name selects and takes the text cursor like every other model name. (First built dashed and purple, turning purple on hover; the maintainer chose the headers' style.)
- **Accessible name.** The button's name is the display name; the popover is a dialog holding the citation and the link.
- **No OpenRouter-id tooltips.** Every model name loses its OpenRouter-id tooltip, which served no purpose, and `LeaderboardRow` loses `openrouterId`. Throughput still reads the id from the mapping.

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

- [x] No vendor-reported badge; a vendor-reported model's name, underlined dotted in grey, opens a popover on hover, tap or Enter that links its `sourceUrl` in the same tab
- [x] No model name has an OpenRouter-id tooltip, and `LeaderboardRow` has no `openrouterId`
- [x] `figureFrom` is gone from the schema, data, note, tests, spec and checklist; the checklist still has the chart sign-off
- [x] An e2e test checks, in the All view, one name per vendor-reported entry, each opening by keyboard a popover whose focused link goes to its `sourceUrl` and names its `source`, from the data file; it skips when the file is empty
- [x] The toggle's e2e test names no live model and skips when the file is empty
- [x] `planDeepsweRefresh` exists, the script calls it, and a unit test shows a refresh publishing a vendor-reported model yields files that pass the load-time checks
- [x] `summarizeRefresh` takes the supersession result; `normalize` has no default for vendor-reported models
- [x] The filter flag is `includeVendorReported`
- [x] ADR 0009, the spec, the checklist, the glossary and the model-data spec match the above
- [x] The underline matches the column headers' dotted grey one
- [x] `mise run validate` passes

## Comments

**2026-10-06 — Implemented** in five commits, each passing check and the unit tests:

- **The name marker** lives in `src/components/vendor-reported-name.tsx`, because a component module may export only components (fast refresh). The note's hidden copy carries the `hidden` attribute, so it stays out of the cell's accessible name and copied text, while `aria-describedby` still reads it. Playwright confirms the accessible description; Base UI's tooltip adds no description of its own, so the fallback wasn't needed.
- **The plan** lives in `scripts/deepswe-refresh-plan.ts`. Its tests cover both kinds of supersession and a no-op run, and each shows the files pass the load-time checks. A fourth test shows a generated entry colliding with an ordinary one fails before anything is written. The shell still fetches the OpenRouter listings only when a model is unmapped. A live `refresh:deepswe` run through the plan wrote nothing, since upstream hadn't changed.
- **The spec's initial-entries table** now matches the data: GPT-6.1 Sol high cites the launch post, and GPT-6 Sol and Luna max read "text and chart".

**2026-10-06 — The popover replaces the link**, after the maintainer tried a prototype on a phone. Base UI's tooltip opens only on hover and keyboard focus, never on tap, and can't hold a reachable link; its popover with `openOnHover` does both. `shadcn add popover` vendored it. `vendorReportedNote` became `vendorReportedMethod`, the popover's harness-and-trials line, and the hidden `aria-describedby` copy went: the citation is now in the popover itself. Enter and tap focus the source link directly, which the e2e test relies on.

**2026-10-06 — The popover's wording settles** on three lines: a "Vendor reported" heading, the linked source, and its date in the muted style the harness-and-trials line had. That line goes, and `vendorReportedMethod` with it; the entries keep `harness` and `trials` as a record of the source. The e2e test also checks each popover's date.

**2026-10-06 — The masthead drops "vendor-reported scores"**, at the maintainer's request: each row's popover now dates its own source, so the item said nothing the table doesn't. Its e2e test went with it.
