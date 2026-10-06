# Spec: Average time data

Adds throughput-derived average time to the [leaderboard table](../leaderboard-table/spec.md): the OpenRouter throughput snapshot, the model mapping's OpenRouter id, the derivation, and the Tok/s and Avg time columns. Vocabulary: throughput, consumer endpoint, average time in [docs/context.md](../../context.md). Source facts: [OpenRouter research](../product-spec/research/openrouter-throughput.md).

## Data file: `data/openrouter-throughput.json`

One snapshot object; all models fetched in one run, one `capturedAt`:

```ts
type ThroughputSnapshot = {
  capturedAt: string;
  models: Record<string, {          // key: OpenRouter model id (revision-pinned, ADR 0002)
    consumerP50: number;            // tokens/sec, p50 of the vendor's consumer endpoint
  }>;
};
```

Semantics revised 2026-08-25 ([ADR 0002](../../architecture/0002-throughput-consumer-endpoint.md)): the original seed stored `medianP50`, the median across all default-tier endpoints; the field is now the vendor's consumer-endpoint p50, and models whose vendor runs no consumer endpoint are omitted (blank in the UI). Revised again in automated-refresh ticket 02's grilling (2026-08-27): the once-planned per-model endpoint detail (`endpoints: { tag, provider, p50 }[]`) is dropped — selection is a guarded slug match against `data/vendor-mapping.json`, so the refresh run's warnings and errors carry the audit trail and the checked-in file keeps only what the app reads.

## Model mapping field

`openrouterId` in the [model mapping](../model-data/spec.md) links a leaderboard model to its revision-pinned OpenRouter listing. `openrouterId: null` is allowed and yields blank throughput/time.

## Derivation rules

- `throughput` = the mapping's OpenRouter model's `consumerP50` (ADR 0002), shared across effort levels; blank if unmapped or absent from the snapshot.
- `averageTimeSeconds` = `output_tokens / throughput`; blank when throughput is blank. Display as `Xm Ys`.

**Token-semantics convention** (settling the fog item): DeepSWE output tokens include provider-reported reasoning tokens; OpenRouter throughput counts output tokens per generation second and reasoning tokens are output tokens in its accounting (documented inference, not a guarantee). Convention: treat both sides as reasoning-inclusive and divide directly. The Avg time column is labelled as an estimate in the UI (tooltip: excludes tool execution and gaps between the agent's calls).

## App

- Columns: Time and Tok/s, Time headed with a small muted "est" after the name (no brackets; Tok/s is a measurement, so it carries no "est"), after the table's source columns, set apart from them by a faint brand tint shared by all derived columns (a rule also separated them until vendor-reported-data ticket 07) (headers were "Avg time (est)" and "Tok/s (est)" until [design ticket 02](../design/tickets/02-ledger-page-layout.md)). Each header carries a tooltip: Time's marks the figure as an estimate and Tok/s's says what it measures (Avg time tooltip: "Output tokens ÷ vendor API throughput; excludes tool execution and gaps between the agent's calls"; Tok/s tooltip: "p50 throughput of the vendor's own consumer API (via OpenRouter stats). Not the speed measured in the benchmark run" — the key message is that the figure describes the vendor's consumer API measured by OpenRouter, not the benchmark run's own speed; ADR 0002).
- Number formatting: throughput always one decimal (40.0, not 40); avg time as `Xm Ys` with seconds rounded to nearest, minutes riding past 60 ("64m 10s", no hours unit), and a zero minute below sixty seconds ("0m 45s").
- Masthead provenance line: OpenRouter linked with its capture date, as "OpenRouter (2026-09-05)" in the Sources list (ticket 01, originally a footer line; shortened in [design ticket 02](../design/tickets/02-ledger-page-layout.md)).

## Acceptance criteria

- Unit tests cover blank propagation: a model with no OpenRouter id or no snapshot entry gets blank throughput and time.

## Tickets

- [01: Average time via OpenRouter throughput](tickets/01-average-time-throughput.md)
- [02: Consumer-endpoint throughput and pinned DeepSeek revisions](tickets/02-consumer-endpoint-throughput.md)
