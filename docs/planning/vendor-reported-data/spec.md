# Spec: Vendor-reported data

Adds vendor-reported entries to the [leaderboard](../leaderboard-table/spec.md): DeepSWE v1.1 scores that vendors publish for models the DeepSWE leaderboard has not run. The DeepSWE leaderboard has published nothing since GPT-6 Astra (job finished 2026-09-01), while Claude Opus 5.5, GPT-6.1 Sol and about ten other models ship with vendor-stated DeepSWE v1.1 figures. Vocabulary: vendor-reported entry, snapshot, model mapping in [docs/context.md](../../context.md). Decision record: [ADR 0009](../../architecture/0009-vendor-reported-entries.md). Decided in a grilling session on 2026-10-04.

## Admission rules

The rules a vendor claim must meet, with the reason for each, live in [docs/agents/vendor-reported-entries.md](../../agents/vendor-reported-entries.md) (ticket 06), the single source of truth for adding, correcting or reviewing an entry.

## Data file: `data/vendor-reported.json`

A snapshot of vendor claims, written by hand through ordinary PRs; the Refresh PR only deletes from it, when it supersedes a model. Each entry carries its own provenance, because each has a different source:

```ts
// No file-level source/sourceUrl pair: no single page covers the file, and
// the masthead item is unlinked.
type VendorReportedSnapshot = {
  benchmark_version: "v1.1";      // pinned like the DeepSWE snapshot; moving the pin clears or replaces this file
  entries: {
    model: string;                // our best guess at DeepSWE's id: "claude-opus-5-5", "gpt-6-1-sol"
    effort: string;               // never null (admission rules: a named effort level)
    pass_at_1: number;            // fraction, 0..1
    average_cost_usd?: number;    // only if the vendor states it; OpenAI's DeepSWE charts do
    output_tokens?: number;
    steps?: number;
    source: string;               // e.g. "Claude Opus 5.5 System Card §8.3"
    sourceUrl: string;
    publishedAt: string;          // the vendor's publication date, YYYY-MM-DD
    harness?: string;             // when stated, e.g. "mini-swe-agent"
    trials?: number;              // when stated
  }[];
};
```

Strict like every other data-file schema, with the same duplicate `(model, effort)` check as the DeepSWE snapshot.

## Load-time invariants (ADR 0004)

- **No overlap.** No model appears in both the DeepSWE snapshot and `vendor-reported.json`.
- **Unique OpenRouter ids.** No two model-mapping entries share a non-null `openrouterId`. This catches a wrong id guess: if DeepSWE publishes our `gpt-6-1-sol` as `gpt-6.1-sol-2026-10`, the generated mapping entry collides with ours.
- **Coverage across both files.** Every model in either file has a mapping entry, and every mapping entry matches a model in one of the two.

The refresh supersedes vendor-reported models (next section) so that a healthy Refresh PR never trips these checks.

## Supersession by the refresh

Once DeepSWE publishes a model, the DeepSWE refresh deletes **all** of that model's vendor-reported entries in the Refresh PR. Supersession is per model, never per effort level, so a model's Best entry never compares a DeepSWE figure against a vendor's. A vendor-reported model is superseded when the refreshed snapshot contains:

- its model id, in which case its hand-written mapping entry carries over unchanged; or
- a model whose generated mapping entry has the same `openrouterId` as the vendor-reported model's mapping entry. The refresh also deletes the vendor-reported model's mapping entry, and the generated one replaces it.

A generated `openrouterId` falls back to `null` when the revision is ambiguous (ADR 0003), which defeats the second match. To cover that case, the Refresh PR body lists the run's new DeepSWE models beside the vendor-reported models still standing, so a duplicate under two ids is visible to the reviewer.

## Leaderboard

- `LeaderboardSources` gains `vendorReported`, and `createLeaderboard` derives rows from both sources ([ADR 0005](../../architecture/0005-leaderboard-module-owns-tier-join.md)). Each row records its provenance: DeepSWE, or the vendor claim with its citation, figure origin, harness and trials.
- `LeaderboardRow.cost` becomes `CostPair | undefined`, like `costPerSolvedTask`. Missing cost, output tokens or steps leave the matching cells blank. Cost per solved task and average time are blank too, while throughput is still filled, since it comes from OpenRouter. On tier rows the effective cost is blank as well, and the row still exists, so the Subscriptions picker still never changes row count.
- Blank cells sort last ([ADR 0008](../../architecture/0008-tanstack-owns-sorting.md)). The sort is otherwise unchanged: vendor figures mostly exceed the official board's best, so vendor-reported rows will top the default Pass@1 view. If that misleads, the fix is a filter on provenance, never a special case in the sort: the Models picker's vendor-reported toggle is that filter, on by default.
- Best entry and the effort filter apply unchanged. The Models picker gains a vendor-reported toggle ([model-filter spec](../model-filter/spec.md)), its only change. Supersession is per model, so no model ever mixes the two sources.

## App

- **Marker.** A vendor-reported row's model name is its marker, on a row in the enhancement tint: underlined dotted in grey, as the column headers mark their tooltips, and selectable with the text cursor like every other model name. It opens a popover on hover, tap or Enter, in three lines: "Vendor reported."; the source by name, linked in the same tab like the masthead's sources; and its publication date, in muted text. The harness and trials stay in the data but aren't shown. Enter and tap move focus onto the link, so the source is reachable by mouse, touch and keyboard alike. DeepSWE rows' names are plain text. (Ticket 03 made a badge the link, because a link inside a hover tooltip is unreachable on touch and by keyboard. Ticket 07 replaced the badge with the name and the tooltip with a popover, which opens on tap and takes focus, and dropped "read from a chart", since the maintainer checks every chart reading and for some entries only the cost came from a chart.)
- **Row tint.** A vendor-reported row carries the derived columns' enhancement tint across its whole width, without stacking where it meets them; on hover the tint deepens to roughly double, in place of the grey hover other rows take. Vendor-reported models in the Models picker take the tint at the Subscriptions trigger's stronger pair (8%, 15% on focus; 12% and 20% dark), since the rows' pair barely reads as purple on the popover, and its vendor-reported toggle is purple when on. (Added after ticket 05.)
- **Masthead.** The Sources line gains a fourth item, "vendor-reported scores", unlinked (each row cites its own source) and dated by the newest entry's `publishedAt`. The comment that every figure traces to the masthead's sources stays true.

## Initial entries

Admitted under the rules above, from research on 2026-10-04:

| Model | Effort(s) | Figure | From |
|---|---|---|---|
| Claude Opus 5.5 | max | 74.2% | text, system card §8.3 |
| Claude Sonnet 5.5 | max | 71.0% | text, system card §8.3 |
| Claude Fable 5.1 | max | 67.4% | text, system card §8.3 |
| GPT-6.1 Sol | high | 75.2% | chart, launch post; also in text on OpenAI Developers' X account |
| GPT-6.1 Sol | max, xhigh, medium, low | 71.9%, 71.9%, 73.0%, 64.4% | chart, launch post |
| GPT-6 Sol / GPT-6 Luna | max | 68.8% / 66.6% | text and chart, launch post |
| GPT-6 Sol / GPT-6 Luna | xhigh, high, medium, low | see the data file | chart, launch post |
| Grok 4.7 | high | 71.0% | x.ai news |
| DeepSeek V4.1 Flash | max | 74.2% | HF model card |
| Muse Spark 1.3 | max | 75.4% | dev.meta.ai |

Gemini 4 Argon (77.9% at its "highest thinking settings") is admitted at `high`. No Google doc names Argon's levels, because Argon is only available to a closed group of trusted security teams; `high` is the highest level DeepSWE writes for Google's models, and the maintainer settled it (rule 3 now allows this). Not admitted: MiMo-V2.6 Pro/Flash (no effort stated, and Xiaomi has no vendor mark yet); Qwen3.8-Flash-Next (best of two harnesses). Every admitted vendor already has a vendor mark. Figures were re-checked against the sources when the entries were written (ticket 05). OpenAI's charts also state cost per task, recorded on its entries: they give DeepSWE's own figures for GPT-6 Astra and Claude Opus 5 exactly, so the measure matches the Cost column.

## Acceptance criteria

- Unit tests cover each load-time invariant, both supersession matches, and blank propagation for an entry with Pass@1 only.
- The live data parses, and every vendor-reported row shows its marker and citation.
- A Refresh PR that publishes a vendor-reported model is green and removes its vendor-reported entries.

## Tickets

- [01: Vendor-reported data file and load-time invariants](tickets/01-data-file-and-invariants.md)
- [02: Leaderboard joins vendor-reported entries](tickets/02-leaderboard-join.md)
- [03: Vendor-reported marker and masthead source](tickets/03-marker-and-masthead.md)
- [04: Refresh supersedes vendor-reported models](tickets/04-refresh-supersession.md)
- [05: Initial vendor-reported entries](tickets/05-initial-entries.md)
- [06: Checklist for adding a vendor-reported entry](tickets/06-adding-entries-checklist.md)
- [07: Review follow-ups](tickets/07-review-follow-ups.md)
