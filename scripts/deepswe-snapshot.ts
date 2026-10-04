// Pure normalization for the DeepSWE refresh: schemas, guard rails, and the
// snapshot shape live here so the fetch/write shell stays thin and testable.

import { isDeepStrictEqual } from "node:util";
import { z } from "zod";
import type {
  DeepsweEntry,
  DeepsweSnapshot,
  ModelMappingEntry,
  PriceRevision,
} from "../src/data/schema.ts";
import { costAdjustmentFactor } from "./deepswe-price-revisions.ts";
import type { Supersession } from "./vendor-reported-supersession.ts";

export const origin = "https://deepswe.datacurve.ai";
export const benchmarkVersion = "v1.1";

export const versionManifestSchema = z.object({
  latest: z.string(),
  versions: z.array(
    z.object({
      id: z.string(),
      data_path: z.string(),
      n_tasks: z.number().int().positive(),
      status: z.string(),
    }),
  ),
});

export type VersionManifest = z.infer<typeof versionManifestSchema>;

export const leaderboardArtifactSchema = z.object({
  scope: z.string(),
  unit: z.string(),
  generated_at: z.iso.datetime({ offset: true }),
  n_tasks_in_set: z.number().int().positive(),
  // finished_at is null while the upstream job is still running; DeepSWE shows
  // those rows anyway, so we snapshot them too (automated-refresh ticket 05). An absent job
  // object stays a hard error: that state has never been observed.
  latest_job: z.object({ name: z.string(), finished_at: z.string().nullable() }),
  rows: z.array(
    z.object({
      model: z.string().min(1),
      reasoning_effort: z.string().min(1).nullable(),
      config: z.string().min(1),
      pass_at_1: z.number().min(0).max(1),
      mean_cost_usd: z.number().nonnegative(),
      // Required, not optional: the per-entry factor needs the token mix, and
      // the site's silent no-adjustment fallback is what ticket 10 removed.
      mean_input_tokens: z.number().nonnegative(),
      mean_cache_tokens: z.number().nonnegative(),
      mean_output_tokens: z.number().nonnegative(),
      mean_agent_steps: z.number().nonnegative(),
      n_attempted: z.number().int().positive(),
    }),
  ),
});

export type LeaderboardArtifact = z.infer<typeof leaderboardArtifactSchema>;

export function pinnedVersion(manifest: VersionManifest) {
  const selected = manifest.versions.find(({ id }) => id === benchmarkVersion);
  if (!selected) {
    throw new Error(`DeepSWE version "${benchmarkVersion}" is missing from the version manifest.`);
  }
  return selected;
}

export function artifactUrl(manifest: VersionManifest): string {
  return `${origin}/artifacts/${pinnedVersion(manifest).data_path}/leaderboard-live.json`;
}

// Decides whether a fresh snapshot is worth writing. raw_sha256,
// source_generated_at, and source_latest_job churn upstream without content
// changes (nothing the app consumes reads them), so they only ride along when
// something else changed.
export function hasMeaningfulChange(existing: DeepsweSnapshot, next: DeepsweSnapshot): boolean {
  const strip = ({
    raw_sha256: _sha,
    source_generated_at: _at,
    source_latest_job: _job,
    ...rest
  }: DeepsweSnapshot) => rest;
  return !isDeepStrictEqual(strip(existing), strip(next));
}

// The set difference the mapping guard and the entry generator both need:
// models the artifact reports that the mapping doesn't cover.
export function unmappedModels(rows: { model: string }[], mapping: ModelMappingEntry[]): string[] {
  const mapped = new Set(mapping.map((entry) => entry.leaderboardModel));
  return [...new Set(rows.map((row) => row.model))].filter((model) => !mapped.has(model));
}

export function normalize(
  manifest: VersionManifest,
  artifact: LeaderboardArtifact,
  mapping: ModelMappingEntry[],
  priceRevisions: Readonly<Record<string, PriceRevision>>,
  rawSha256: string,
  // Mapped but not on DeepSWE yet, so never stale (ADR 0009).
  vendorReportedModels: ReadonlySet<string> = new Set(),
): { snapshot: DeepsweSnapshot; warnings: string[] } {
  const warnings: string[] = [];
  const selected = pinnedVersion(manifest);

  if (manifest.latest !== benchmarkVersion) {
    warnings.push(
      `New DeepSWE version available: ${manifest.latest}. Staying pinned to ${benchmarkVersion}; ` +
        `follow the spec's version-bump workflow before switching.`,
    );
  }
  if (artifact.n_tasks_in_set !== selected.n_tasks) {
    throw new Error(
      `Version manifest says ${selected.n_tasks} tasks but the leaderboard artifact says ` +
        `${artifact.n_tasks_in_set}; refusing to write a snapshot from disagreeing sources.`,
    );
  }

  const fetchedModels = new Set(artifact.rows.map((row) => row.model));
  const mappedModels = new Set(mapping.map((entry) => entry.leaderboardModel));

  const unmapped = unmappedModels(artifact.rows, mapping);
  if (unmapped.length > 0) {
    throw new Error(
      `Leaderboard model(s) missing from data/model-mapping.json: ${unmapped.join(", ")}. ` +
        `Add mapping entries (family, OpenRouter id, usage multiplier) before refreshing.`,
    );
  }
  const stale = [...mappedModels].filter(
    (model) => !fetchedModels.has(model) && !vendorReportedModels.has(model),
  );
  if (stale.length > 0) {
    warnings.push(
      `Mapping entries with no leaderboard rows (model removed upstream?): ${stale.join(", ")}.`,
    );
  }
  const staleRevisions = Object.keys(priceRevisions).filter((model) => !fetchedModels.has(model));
  if (staleRevisions.length > 0) {
    warnings.push(`Price revisions with no leaderboard rows: ${staleRevisions.join(", ")}.`);
  }

  const seenConfigs = new Set<string>();
  const entries: DeepsweEntry[] = artifact.rows.map((row) => {
    if (seenConfigs.has(row.config)) {
      throw new Error(`Duplicate configuration "${row.config}" in the leaderboard artifact.`);
    }
    seenConfigs.add(row.config);
    const tokens = {
      input: row.mean_input_tokens,
      cached: row.mean_cache_tokens,
      output: row.mean_output_tokens,
    };
    const revision = priceRevisions[row.model];
    const factor = revision ? costAdjustmentFactor(revision, tokens) : 1;
    return {
      model: row.model,
      effort: row.reasoning_effort,
      pass_at_1: row.pass_at_1,
      average_cost_usd: row.mean_cost_usd * factor,
      input_tokens: row.mean_input_tokens,
      cached_tokens: row.mean_cache_tokens,
      output_tokens: row.mean_output_tokens,
      steps: row.mean_agent_steps,
      source_config: row.config,
      n_scored_attempts: row.n_attempted,
      raw_average_cost_usd: row.mean_cost_usd,
      cost_adjustment_factor: factor,
    };
  });

  return {
    snapshot: {
      schema_version: 2,
      benchmark_version: benchmarkVersion,
      source: "DeepSWE leaderboard",
      sourceUrl: origin,
      source_url: artifactUrl(manifest),
      source_generated_at: artifact.generated_at,
      source_latest_job: artifact.latest_job,
      n_tasks_in_set: artifact.n_tasks_in_set,
      source_scope: artifact.scope,
      source_unit: artifact.unit,
      raw_sha256: rawSha256,
      price_revisions: { ...priceRevisions },
      entries,
    },
    warnings,
  };
}

// The Refresh PR body's before/after summary (ADR 0004): count drift is
// acknowledged in review, not by test literals, so the reviewer must see it.
// The heading names the source because the body also carries the OpenRouter
// summary (automated-refresh ticket 09).
export function summarizeRefresh(input: {
  existing: DeepsweSnapshot | null;
  snapshot: DeepsweSnapshot;
  mappingCount: number;
  generated: ModelMappingEntry[];
  changed: boolean;
  // The revisions data/price-revisions.json held before this run.
  previousPriceRevisions: Readonly<Record<string, PriceRevision>>;
  superseded: Supersession[];
  standing: string[]; // vendor-reported models left after supersession
}): string {
  const { existing, snapshot, mappingCount, generated, changed, previousPriceRevisions } = input;
  // An OpenRouter-id match retires the vendor-reported model's mapping entry.
  const retired = input.superseded.filter((s) => s.match === "openrouter-id").length;
  const modelCount = (s: DeepsweSnapshot) => new Set(s.entries.map((entry) => entry.model)).size;
  const lines = [
    "### DeepSWE data summary",
    "",
    "| Measure | Before | After |",
    "| --- | ---: | ---: |",
    `| Leaderboard entries | ${existing?.entries.length ?? "—"} | ${snapshot.entries.length} |`,
    `| Models | ${existing ? modelCount(existing) : "—"} | ${modelCount(snapshot)} |`,
    `| Mapping entries | ${mappingCount} | ${mappingCount + generated.length - retired} |`,
  ];
  if (!changed) {
    // Equal counts alone cannot distinguish an untouched snapshot from a
    // changed one of the same size, and the Refresh PR opens every week
    // regardless because the OpenRouter half always changes.
    lines.push("", "No content change: the snapshot was left untouched this run.");
  }
  if (generated.length > 0) {
    lines.push(
      "",
      `Generated mapping entries: ${generated.map((entry) => entry.leaderboardModel).join(", ")}.`,
    );
  }
  const vendorReportedLines = vendorReportedSection(existing, snapshot, input);
  if (vendorReportedLines.length > 0) {
    lines.push("", ...vendorReportedLines);
  }
  const revisionLines = priceRevisionsSection(previousPriceRevisions, existing, snapshot);
  if (revisionLines.length > 0) {
    lines.push("", ...revisionLines);
  }
  return lines.join("\n");
}

// Vendor-reported models this run superseded, and the new DeepSWE models
// beside those still standing: a generated mapping entry with a null
// OpenRouter id can't be matched, so a model published under an id we didn't
// guess shows up twice unless the reviewer spots it here (ADR 0009). Empty
// when there is nothing to say.
function vendorReportedSection(
  existing: DeepsweSnapshot | null,
  snapshot: DeepsweSnapshot,
  { superseded, standing }: { superseded: Supersession[]; standing: string[] },
): string[] {
  const lines: string[] = [];
  if (superseded.length > 0) {
    const described = superseded.map((s) =>
      s.match === "id"
        ? `${s.model} (published under the same id)`
        : `${s.model} (published as ${s.publishedAs}, same OpenRouter id)`,
    );
    lines.push(`Superseded vendor-reported models: ${described.join(", ")}.`);
  }
  // On a first run every model is new, so there is nothing to compare.
  const before = new Set(existing?.entries.map((entry) => entry.model));
  const added =
    existing === null
      ? []
      : [...new Set(snapshot.entries.map((entry) => entry.model))].filter((m) => !before.has(m));
  if (added.length > 0 && standing.length > 0) {
    lines.push(
      `New DeepSWE models: ${added.join(", ")}. ` +
        `Vendor-reported models still standing: ${standing.join(", ")}. ` +
        "Check none of them is one model under two ids.",
    );
  }
  return lines;
}

// The site's price revisions differ from the checked-in file (ADR 0006): the
// reviewer sees each changed model's old and new rates and every entry whose
// factor moved as a result, since the file diff alone shows neither. Empty
// when nothing changed.
function priceRevisionsSection(
  before: Readonly<Record<string, PriceRevision>>,
  existing: DeepsweSnapshot | null,
  snapshot: DeepsweSnapshot,
): string[] {
  const after = snapshot.price_revisions;
  const models = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (model) => JSON.stringify(before[model]) !== JSON.stringify(after[model]),
  );
  if (models.length === 0) return [];
  const rates = (revision: PriceRevision | undefined) =>
    revision
      ? `${revision.from.input} / ${revision.from.cached} / ${revision.from.output} → ` +
        `${revision.to.input} / ${revision.to.cached} / ${revision.to.output}`
      : "—";
  const lines = [
    "Price revisions changed in the site's bundle (USD per million input / cached / output tokens, old → new):",
    "",
    "| Model | Before | After |",
    "| --- | --- | --- |",
    ...models.map((model) => `| ${model} | ${rates(before[model])} | ${rates(after[model])} |`),
  ];
  // Factor, not cost: raw artifact drift in the same run is not a repricing.
  const previous = new Map(existing?.entries.map((entry) => [entry.source_config, entry]) ?? []);
  const moved = snapshot.entries.filter((entry) => {
    const prior = previous.get(entry.source_config);
    return prior && prior.cost_adjustment_factor !== entry.cost_adjustment_factor;
  });
  if (moved.length > 0) {
    const usd = (value: number) => `$${value.toFixed(2)}`;
    lines.push(
      "",
      "Entries whose average cost moved:",
      "",
      ...moved.map((entry) => {
        const prior = previous.get(entry.source_config)!;
        return `- ${entry.model} [${entry.effort ?? "default"}]: ${usd(prior.average_cost_usd)} → ${usd(entry.average_cost_usd)}`;
      }),
    );
  }
  return lines;
}
