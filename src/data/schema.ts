// One schema per data file (docs/context.md), with each file's type inferred
// from it. The app parses the five files it imports (sources.ts), the refresh
// shells parse the rest, and schema.test.ts parses all seven. Every file schema
// is strict with uniform value constraints: we own every byte of these files,
// so an unknown key or an impossible value is drift, never something to strip.
//
// The load-time integrity checks (ADR 0004) live here too: they reject
// malformed committed data — duplicate identities, broken mapping coverage —
// while routine leaderboard growth parses clean, so a healthy refresh never
// turns tests red.

import { z } from "zod";

const nonEmpty = z.string().min(1);
const nonNegative = z.number().nonnegative();
const count = z.number().int().nonnegative();

// Every snapshot carries this provenance pair: the human-facing citation
// whose URL the masthead's provenance line links (automated-refresh ticket 04;
// a footer line at the time). Vendor-reported entries carry it per entry
// instead, since each cites its own source. Distinct from the DeepSWE snapshot's
// `source_url`, which is the fetched artifact itself.
const provenanceFields = { source: nonEmpty, sourceUrl: z.url() };

const subscriptionFamilySchema = z.enum(["claude", "chatgpt", "none"]);
export type SubscriptionFamily = z.infer<typeof subscriptionFamilySchema>;

// The families the Subscriptions picker shows, in column order: Claude first.
export type PickerFamilyId = Exclude<SubscriptionFamily, "none">;
export const PICKER_FAMILIES: readonly PickerFamilyId[] = ["claude", "chatgpt"];

const tierIdSchema = z.enum([
  "claude-pro",
  "claude-max-5x",
  "claude-max-20x",
  "chatgpt-plus",
  "chatgpt-pro-5x",
  "chatgpt-pro-20x",
]);
export type TierId = z.infer<typeof tierIdSchema>;

// USD per million input, cached-input, and output tokens, as the DeepSWE
// site's bundle states them.
const tokenRatesSchema = z.strictObject({
  input: nonNegative,
  cached: nonNegative,
  output: nonNegative,
});
export type TokenRates = z.infer<typeof tokenRatesSchema>;

// Old and new rates (docs/context.md: price revision).
export const priceRevisionSchema = z.strictObject({
  from: tokenRatesSchema,
  to: tokenRatesSchema,
});
export type PriceRevision = z.infer<typeof priceRevisionSchema>;

// data/price-revisions.json: the bundle's table resolved for the pinned
// version, rewritten by the DeepSWE refresh whenever the site's differs.
export const priceRevisionsFileSchema = z.strictObject({
  ...provenanceFields,
  revisions: z.record(nonEmpty, priceRevisionSchema),
});
export type PriceRevisionsFile = z.infer<typeof priceRevisionsFileSchema>;

// An entry's identity is its (model, effort level) pair (docs/context.md).
function rejectDuplicateEntries(kind: string) {
  return (entries: { model: string; effort: string | null }[], ctx: z.RefinementCtx) => {
    const seen = new Set<string>();
    for (const entry of entries) {
      const identity = `${entry.model} @ ${entry.effort ?? "default"}`;
      if (seen.has(identity)) {
        ctx.addIssue({ code: "custom", message: `duplicate ${kind}: ${identity}` });
      }
      seen.add(identity);
    }
  };
}

const deepsweEntrySchema = z.strictObject({
  model: nonEmpty, // site model id, e.g. "claude-fable-5"
  effort: nonEmpty.nullable(), // null = model's default effort
  pass_at_1: z.number().min(0).max(1), // fraction
  average_cost_usd: nonNegative, // adjusted by cost_adjustment_factor
  input_tokens: nonNegative, // per-attempt mean; cached_tokens is the subset served from cache
  cached_tokens: nonNegative,
  output_tokens: nonNegative, // per-attempt mean, includes reasoning tokens
  steps: nonNegative, // agent turns per attempt
  n_scored_attempts: count,
  source_config: nonEmpty,
  raw_average_cost_usd: nonNegative,
  cost_adjustment_factor: nonNegative, // per entry: derived from the model's price revision and this entry's token mix
});
export type DeepsweEntry = z.infer<typeof deepsweEntrySchema>;

// data/deepswe-v1.1.json: the DeepSWE snapshot.
export const deepsweSnapshotSchema = z.strictObject({
  ...provenanceFields,
  schema_version: z.literal(2), // 2: price_revisions replaced cost_adjustments, entries gained token means (automated-refresh ticket 10)
  benchmark_version: z.literal("v1.1"),
  source_url: z.url(),
  source_generated_at: nonEmpty, // ISO timestamp from the artifact
  source_latest_job: z.strictObject({
    name: nonEmpty,
    finished_at: nonEmpty.nullable(), // null while the job is still running
  }),
  n_tasks_in_set: count,
  source_scope: nonEmpty,
  source_unit: nonEmpty,
  raw_sha256: nonEmpty, // hash of the upstream artifact this was derived from
  // The site's price revisions the entries were adjusted with, resolved for
  // the pinned version (ADR 0006).
  price_revisions: z.record(nonEmpty, priceRevisionSchema),
  entries: z.array(deepsweEntrySchema).superRefine(rejectDuplicateEntries("leaderboard entry")),
});
export type DeepsweSnapshot = z.infer<typeof deepsweSnapshotSchema>;

const vendorReportedEntrySchema = z.strictObject({
  model: nonEmpty, // best guess at DeepSWE's id, so supersession is an id match (ADR 0009)
  effort: nonEmpty, // never null: a claim with no named effort is not admitted
  pass_at_1: z.number().min(0).max(1), // fraction
  // Only when the vendor states them; OpenAI's DeepSWE charts state cost.
  average_cost_usd: nonNegative.optional(),
  output_tokens: nonNegative.optional(),
  steps: nonNegative.optional(),
  ...provenanceFields,
  publishedAt: z.iso.date(), // the vendor's publication date, YYYY-MM-DD
  figureFrom: z.enum(["text", "chart"]), // chart readings are checked by the maintainer
  harness: nonEmpty.optional(),
  trials: count.optional(),
});
export type VendorReportedEntry = z.infer<typeof vendorReportedEntrySchema>;

// data/vendor-reported.json: vendors' own DeepSWE v1.1 claims for models the
// DeepSWE leaderboard hasn't published (ADR 0009). No file-level provenance
// pair: no single page covers the file.
export const vendorReportedSnapshotSchema = z.strictObject({
  benchmark_version: z.literal("v1.1"),
  entries: z
    .array(vendorReportedEntrySchema)
    .superRefine(rejectDuplicateEntries("vendor-reported entry")),
});
export type VendorReportedSnapshot = z.infer<typeof vendorReportedSnapshotSchema>;

const modelMappingEntrySchema = z.strictObject({
  leaderboardModel: nonEmpty,
  displayName: nonEmpty,
  vendor: nonEmpty,
  // Revision-pinned wherever OpenRouter has a pinned listing (ADR 0002);
  // null yields blank throughput/time (avg-time-data ticket 01).
  openrouterId: nonEmpty.nullable(),
  family: subscriptionFamilySchema,
  usageMultiplier: z.number().positive(), // scales equivalent API spend; zero would divide the subsidisation factor by nothing
  // Tiers whose usage limits don't cover the model, so it runs on usage
  // credits at API rates there: Pro excludes Fable (subscription-data ticket 02).
  excludedTiers: z.array(tierIdSchema).min(1).optional(),
  shortName: nonEmpty.optional(), // UI short label, falling back to displayName (subscription-filter ticket 01)
});
export type ModelMappingEntry = z.infer<typeof modelMappingEntrySchema>;

// data/model-mapping.json: the model mapping.
// OpenRouter ids are unique too: two models on one listing would share
// throughput, and a vendor-reported model whose id we guessed wrong collides
// with DeepSWE's generated entry here (ADR 0009). Null ids never collide.
export const modelMappingSchema = z.array(modelMappingEntrySchema).superRefine((mapping, ctx) => {
  const seen = new Set<string>();
  const seenOpenrouterIds = new Set<string>();
  for (const entry of mapping) {
    if (seen.has(entry.leaderboardModel)) {
      ctx.addIssue({
        code: "custom",
        message: `duplicate mapping key: ${entry.leaderboardModel}`,
      });
    }
    seen.add(entry.leaderboardModel);
    if (entry.openrouterId === null) continue;
    if (seenOpenrouterIds.has(entry.openrouterId)) {
      ctx.addIssue({ code: "custom", message: `duplicate OpenRouter id: ${entry.openrouterId}` });
    }
    seenOpenrouterIds.add(entry.openrouterId);
  }
});

const vendorMappingEntrySchema = z.strictObject({
  vendor: nonEmpty, // exact `vendor` string from model-mapping.json
  // OpenRouter provider slug of the vendor's consumer endpoint (ADR 0002);
  // null records that the vendor deliberately runs no consumer endpoint,
  // distinct from a vendor someone forgot to map.
  consumerProviderSlug: nonEmpty.nullable(),
});
export type VendorMappingEntry = z.infer<typeof vendorMappingEntrySchema>;

// data/vendor-mapping.json: the vendor mapping.
export const vendorMappingSchema = z.array(vendorMappingEntrySchema);

// data/openrouter-throughput.json: the throughput snapshot.
export const throughputSnapshotSchema = z.strictObject({
  ...provenanceFields,
  capturedAt: nonEmpty,
  // Keyed by OpenRouter model id; consumerP50 is tokens/sec, the p50 of the
  // vendor's consumer endpoint (ADR 0002). Models whose vendor runs no
  // consumer endpoint are absent, yielding blank throughput/time.
  models: z.record(nonEmpty, z.strictObject({ consumerP50: nonNegative })),
});
export type ThroughputSnapshot = z.infer<typeof throughputSnapshotSchema>;

const tierSchema = z.strictObject({
  id: tierIdSchema,
  family: subscriptionFamilySchema.exclude(["none"]),
  label: nonEmpty,
  shortLabel: nonEmpty, // UI tag text; explicit data, never derived from label
  priceUsdPerMonth: nonNegative,
  equivalentApiSpendUsdPerMonth: nonNegative,
});
export type Tier = z.infer<typeof tierSchema>;

// data/tiers.json: the tiers snapshot.
export const tiersSnapshotSchema = z.strictObject({
  ...provenanceFields,
  // When SemiAnalysis published the figures (the linked post's date), not
  // when they were transcribed: the masthead shows how old the numbers are.
  publishedAt: nonEmpty,
  tiers: z.array(tierSchema),
});
export type TiersSnapshot = z.infer<typeof tiersSnapshotSchema>;

// Coverage must hold in both directions, across the DeepSWE snapshot and the
// vendor-reported entries together: an uncovered model would throw deep in
// createLeaderboard, and an orphaned mapping entry is refresh output pointing
// at nothing.
export function assertMappingCoverage(
  snapshot: DeepsweSnapshot,
  vendorReported: VendorReportedSnapshot,
  mapping: ModelMappingEntry[],
): void {
  const models = new Set(
    [...snapshot.entries, ...vendorReported.entries].map((entry) => entry.model),
  );
  const mapped = new Set(mapping.map((entry) => entry.leaderboardModel));
  const missing = [...models].filter((model) => !mapped.has(model));
  const orphaned = [...mapped].filter((model) => !models.has(model));
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`models missing from the mapping: ${missing.join(", ")}`);
  }
  if (orphaned.length > 0) {
    parts.push(`mapping entries matching no model: ${orphaned.join(", ")}`);
  }
  if (parts.length > 0) {
    throw new Error(parts.join("; "));
  }
}

// A vendor-reported model lives only until DeepSWE publishes it; the refresh
// deletes it then, so a healthy Refresh PR never trips this (ADR 0009). Both
// sources at once would put two harnesses inside one model's Best entry.
export function assertNoOverlap(
  snapshot: DeepsweSnapshot,
  vendorReported: VendorReportedSnapshot,
): void {
  const published = new Set(snapshot.entries.map((entry) => entry.model));
  const overlap = [
    ...new Set(
      vendorReported.entries.map((entry) => entry.model).filter((model) => published.has(model)),
    ),
  ];
  if (overlap.length > 0) {
    throw new Error(`vendor-reported models DeepSWE has published: ${overlap.join(", ")}`);
  }
}

// Each picker family's one vendor, whose mark labels the family's column in
// the Subscriptions picker (docs/context.md). Read from the family's mapping
// entries at load: a family with none, or with entries from two vendors, has
// no single mark to show, so the load fails naming the family.
export type FamilyVendors = Record<PickerFamilyId, string>;

export function familyVendors(mapping: ModelMappingEntry[]): FamilyVendors {
  const vendors = {} as FamilyVendors;
  const parts: string[] = [];
  for (const family of PICKER_FAMILIES) {
    const found = new Set(
      mapping.filter((entry) => entry.family === family).map((entry) => entry.vendor),
    );
    const [vendor] = found;
    if (vendor === undefined) {
      parts.push(`no mapping entry has family "${family}"`);
    } else if (found.size > 1) {
      parts.push(`family "${family}" spans vendors ${[...found].join(", ")}`);
    } else {
      vendors[family] = vendor;
    }
  }
  if (parts.length > 0) {
    throw new Error(parts.join("; "));
  }
  return vendors;
}
