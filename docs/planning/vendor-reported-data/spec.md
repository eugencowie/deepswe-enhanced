# Spec: Vendor-reported data

Adds vendor-reported entries to the [leaderboard](../leaderboard-table/spec.md): DeepSWE v1.1 scores that vendors publish for models the DeepSWE leaderboard has not run. The DeepSWE leaderboard has published nothing since GPT-6 Astra (job finished 2026-09-01), while Claude Opus 5.5, GPT-6.1 Sol and about ten other models ship with vendor-stated DeepSWE v1.1 figures. Vocabulary: vendor-reported entry, snapshot, model mapping in [docs/context.md](../../context.md). Decision record: [ADR 0009](../../architecture/0009-vendor-reported-entries.md). Decided in a grilling session on 2026-10-04.

## Admission rules

A vendor claim becomes a vendor-reported entry only if all of these hold:

1. **DeepSWE v1.1, Pass@1.** The figure is a DeepSWE v1.1 pass rate over attempts. Other benchmarks (SWE-bench Pro, Terminal-Bench) never enter the Pass@1 column: cost per solved task divides by it, so it must stay one benchmark.
2. **The vendor's own publication.** Launch posts, system cards, model cards, docs, and the vendor's official social accounts count; third-party transcriptions don't.
3. **Text or chart.** Figures stated as text or in a table, and figures read off a chart, both count. Every chart reading is put to the maintainer as a checklist (figure, chart, effort) and checked against the source before it is committed. Where text and a chart give a figure for the same effort, the text wins.
4. **A named effort level.** The source names the effort, or names "highest" where the vendor's own docs name that level (cited). A claim with no effort stated is not admitted: `null` already means "the model's default effort", and an "unstated" value would poison the effort sort and the Best-entry tiebreak.
5. **No method known to differ.** Admit unless the source says the method differs: best-of-harnesses, the vendor's own scaffold, best-of-k. An unstated harness is admitted; the marker already says the figure is unverified.

## Data file: `data/vendor-reported.json`

A snapshot of vendor claims, hand-maintained through ordinary PRs, not the Refresh PR. Each entry carries its own provenance, because each has a different source:

```ts
// No file-level source/sourceUrl pair: no single page covers the file, and
// the masthead item is unlinked.
type VendorReportedSnapshot = {
  benchmark_version: "v1.1";      // pinned like the DeepSWE snapshot; moving the pin clears or replaces this file
  entries: {
    model: string;                // our best guess at DeepSWE's id: "claude-opus-5-5", "gpt-6-1-sol"
    effort: string;               // never null (rule 4)
    pass_at_1: number;            // fraction, 0..1
    average_cost_usd?: number;    // only if the vendor states it; none do today
    output_tokens?: number;
    steps?: number;
    source: string;               // e.g. "Claude Opus 5.5 System Card §8.3"
    sourceUrl: string;
    publishedAt: string;          // the vendor's publication date
    figureFrom: "text" | "chart";
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
- Blank cells sort last ([ADR 0008](../../architecture/0008-tanstack-owns-sorting.md)). The sort is otherwise unchanged: vendor figures mostly exceed the official board's best, so vendor-reported rows will top the default Pass@1 view. If that misleads, the fix is a filter on provenance, never a special case in the sort.
- Best entry, the effort filter and the Models picker apply unchanged. Supersession is per model, so no model ever mixes the two sources.

## App

- **Marker.** A vendor-reported row carries a purple "vendor-reported" marker in its Model cell. It is an enhancement, so it gets the enhancement colour. The marker's tooltip gives the source (linked), its publication date, the harness and trials when stated, and "read from a chart" when `figureFrom` is `chart`.
- **Masthead.** The Sources line gains a fourth item, "vendor-reported scores", unlinked (each row cites its own source) and dated by the newest entry's `publishedAt`. The comment that every figure traces to the masthead's sources stays true.

## Initial entries

Admitted under the rules above, from research on 2026-10-04:

| Model | Effort(s) | Figure | From |
|---|---|---|---|
| Claude Opus 5.5 | max | 74.2% | text, system card §8.3 |
| Claude Sonnet 5.5 | max | 71.0% | text, system card §8.3 |
| Claude Fable 5.1 | max | 67.4% | text, system card §8.3 |
| GPT-6.1 Sol | high | 75.2% | text, OpenAI Devs |
| GPT-6.1 Sol | max, xhigh, medium, low | to be read | chart, launch post |
| GPT-6 Sol / GPT-6 Luna | max | 68.8% / 66.6% | launch post |
| Grok 4.7 | high | 71.0% | x.ai news |
| DeepSeek V4.1 Flash | max | 74.2% | HF model card |
| Muse Spark 1.3 | max | 75.4% | dev.meta.ai |
| Gemini 4 Argon | highest thinking level | 77.9% | only if Google's docs name that level |

Not admitted: MiMo-V2.6 Pro/Flash (no effort stated, and Xiaomi has no vendor mark yet); Qwen3.8-Flash-Next (best of two harnesses). Every admitted vendor already has a vendor mark. Figures are re-checked against the sources when the entries are written (ticket 05).

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
