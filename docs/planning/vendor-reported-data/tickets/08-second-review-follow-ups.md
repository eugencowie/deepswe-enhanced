# 08: Second review follow-ups

Type: task
Status: resolved
Blocked by: none

## What to build

Follow-ups from the second review of [#95](https://github.com/eugencowie/deepswe-enhanced/pull/95) against `main`, after ticket 07 and the popover, masthead and rule changes that followed it; settled in a grilling with the maintainer on 2026-10-06. Vocabulary: **vendor-reported entry**, **enhancement**, **masthead** in [docs/context.md](../../../context.md).

### Code

- **Rows carry only the citation.** A row's vendor-reported provenance narrows to `source`, `sourceUrl` and `publishedAt`; `harness` and `trials` stay in the data file and its schema but no longer reach `LeaderboardRow`, since nothing shows them. The two `leaderboard.test.ts` tests about them become one: only the citation reaches the row.
- **`columnClasses` goes.** With the rule gone it only maps a column to `text-right`; the header and the cell write `meta?.align === "end" && "text-right"` themselves, as they already apply the tint.
- **`normalize` takes one input object**, like `planDeepsweRefresh`, instead of six positional parameters.
- **The name's header comment** in `vendor-reported-name.tsx` says the trigger is a span with the button role, not a button.

### Docs

- **ADR 0007** gets a "superseded in part" note: ticket 07 dropped the left rule on the first derived column, and the tint alone marks the derived block.
- **`vendor-reported-data/spec.md`**: the provenance line drops "figure origin"; the Models picker line says it gains the toggle and tinted vendor-reported items, not that the toggle is its only change.
- **`design/spec.md`**: vendor-reported rows cite their sources in the row, not the masthead (the "every source is named in the masthead" line); purple also marks vendor-reported rows, their picker items and the toggle's switch; the dotted underline marks text that opens a tooltip or popover, not only headers.
- **`leaderboard-table/spec.md`**: the masthead line notes vendor-reported data as the exception that adds no sentence.

### Kept as they are

The figure fields listed twice in `leaderboard.ts`; the three `provenance.kind === "vendor-reported"` checks; `pickerModels` and `setIncludeVendorReported` taking the model options beside the filters; the live-value Fable-note tests, a pattern `main` already has; the unhyphenated "Vendor reported" heading; design ticket 02's mention of the rule, as resolved history.

## Acceptance criteria

- [x] `LeaderboardRow`'s vendor-reported provenance has only `source`, `sourceUrl` and `publishedAt`, and a test pins it; the data file and schema keep `harness` and `trials`
- [x] `columnClasses` is gone and alignment matches before
- [x] `normalize` takes an input object, and its callers pass one
- [x] `vendor-reported-name.tsx`'s comment describes a span trigger
- [x] ADR 0007, the vendor-reported-data spec, the design spec and the leaderboard-table spec match the code
- [x] `mise run validate` passes

## Comments

**2026-10-06 — Implemented** in four commits, each passing check and the unit tests:

- **Provenance** is the citation alone: `leaderboardEntries` destructures `source`, `sourceUrl` and `publishedAt` by name rather than spreading the rest, so a field added to the entry schema doesn't reach the row unasked. One test pins the row's provenance with `toStrictEqual`, from a claim that states harness and trials.
- **Alignment** sits on the header and cell directly; the cell's `text-right tabular-nums` joined into one class pair, and every element keeps the classes it had.
- **`normalize`'s callers** are the plan and the snapshot tests.
- **Docs**: ADR 0007 notes ticket 07 dropped the rule; the vendor-reported-data spec, design spec and leaderboard-table spec match the popover, masthead, tint and underline as built.

**2026-10-06 — Reviewed.** The spec review found nothing missing or wrong. Acted on: the snapshot tests call `normalizeWith`, which fills the inputs most tests leave alone, since the input object had grown every call; the DeepSeek revision test's local revisions, which shadowed the fixture's, are renamed and passed explicitly. The design spec names the vendor-reported toggle by its glossary term and counts the popover's source link among purple items and solid-underlined links. Left: a named type for the citation's three fields, which appear only in `leaderboard.ts`.
