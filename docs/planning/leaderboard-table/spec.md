# Spec: Leaderboard table

Shows the DeepSWE v1.1 benchmark results in a table: the snapshot the app reads, the five source columns, the Model cell, formatting, and the first footer line. Every other feature extends this table and links here. Vocabulary: [docs/context.md](../../context.md). Source facts: [DeepSWE research](../product-spec/research/deepswe-leaderboard-data.md).

## Data file: `data/deepswe-v1.1.json`

Seed by copying [research/deepswe-v1.1-leaderboard.normalized.json](../product-spec/research/deepswe-v1.1-leaderboard.normalized.json) (62 entries, 25 models, captured 2026-08-20). Shape (already what the research capture produces):

```ts
type DeepsweSnapshot = {
  schema_version: 2;                // 2: price_revisions and per-entry token means (automated-refresh ticket 10)
  benchmark_version: "v1.1";
  source_url: string;
  source_generated_at: string;      // ISO timestamp from the artifact
  source_latest_job: { name: string; finished_at: string | null };  // null while the job runs; DeepSWE shows the rows anyway, so we do too
  n_tasks_in_set: number;           // 113
  source_scope: string;
  source_unit: string;
  raw_sha256: string;               // hash of the upstream artifact this was derived from
  price_revisions: Record<string, PriceRevision>;  // the site's revisions the entries were adjusted with (ADR 0006)
  entries: DeepsweEntry[];
};

type DeepsweEntry = {
  model: string;                    // site model id, e.g. "claude-fable-5"
  effort: string | null;            // null = model's default effort
  pass_at_1: number;                // fraction 0..1
  average_cost_usd: number;         // display-adjusted (see cost trap below)
  input_tokens: number;             // per-attempt mean; cached_tokens is the subset served from cache
  cached_tokens: number;
  output_tokens: number;            // per-attempt mean, includes reasoning tokens
  steps: number;                    // agent turns per attempt
  n_scored_attempts: number;
  source_config: string;
  raw_average_cost_usd: number;
  cost_adjustment_factor: number;   // per entry, from the model's price revision and this entry's token mix
};

type PriceRevision = {              // USD per million tokens, old and new
  from: { input: number; cached: number; output: number };
  to: { input: number; cached: number; output: number };
};
```

## Rows

Every entry gets an **API row**: 62 rows from the current data. [Subscription data](../subscription-data/spec.md) adds tier rows beside them.

Blank cells render as "–". Rows are never hidden for missing data.

## App

Single page, one table, titled "DeepSWE enhanced" (page title and h1).

- Columns: Model, Pass@1, Cost, Tokens, Steps. Effort is **not** a column — it renders inside the Model cell as a small muted word after the name ("Claude Opus 5 max", nothing for default effort), preceded by a real space so the accessible name reads naturally. The Model cell shows the leaderboard model id; [model data](../model-data/spec.md) replaces it with the display name and vendor mark. Pass@1 draws a neutral grey bar behind the figure on a fixed 0 to 100% scale, the figure in medium weight so it stays legible over the bar ([design ticket 02](../design/tickets/02-ledger-page-layout.md)). Earlier revisions used DeepSWE's headers (Avg cost, Out tok) and bracketed effort; the design prototype shortened them.
- Toolbar (mirrors the DeepSWE site's chrome — toggles left, dropdowns right; revised in effort-filter ticket 01's grilling, replacing the earlier vendor and effort-level filters): a static **v1.1** chip styled like an active toggle. The benchmark version is fixed; no disabled v1 control. The filter controls are specified by [effort filter](../effort-filter/spec.md), [model filter](../model-filter/spec.md), and [subscription filter](../subscription-filter/spec.md).
- Number formatting: avg cost as standard two-decimal currency ($4.33, $0.61); sub-cent values collapse to $0.01 or $0.00. Pass@1 as a whole percent (no error margin, diverging from DeepSWE's "74%±4%"); output tokens in thousands with a k suffix (118k); steps as integers. (Revised during ticket 01 from three-significant-figure costs and one-decimal percents, after a side-by-side with the DeepSWE site.)
- Attempt counts (`n_scored_attempts`) are not displayed anywhere, matching the DeepSWE site.
- Provenance line in the masthead: "DeepSWE results updated <date>", the date read from `source_generated_at`, linked to the source (ticket 01, originally a footer line). The benchmark version appears only in the toolbar's v1.1 chip. Features that ship further data add their own sentence to the line, except vendor-reported scores, which each row's name cites instead ([vendor-reported data](../vendor-reported-data/spec.md)).

## Acceptance criteria

- The build succeeds with the seed data and derives one row per entry (62). Spot-checked: Luna's costs are the display-adjusted values, not raw.

## Tickets

- [01: Base leaderboard table of API rows](tickets/01-base-api-rows-table.md)
