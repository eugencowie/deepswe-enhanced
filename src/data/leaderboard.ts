// The Leaderboard: every entry combined with every access route its family
// allows, plus the questions the toolbar and table ask of it. Built once from
// the loaded data files; tests build it from fixtures through the same
// interface.

import {
  type DeepsweSnapshot,
  type FamilyModels,
  type FamilyVendors,
  type ModelMappingEntry,
  PICKER_FAMILIES,
  type PickerFamilyId,
  type SubscriptionFamily,
  type ThroughputSnapshot,
  type Tier,
  type TierId,
  type VendorReportedEntry,
  type VendorReportedSnapshot,
} from "./schema.ts";

// How you would pay to run a model: direct API, or a specific tier. Every row
// is an entry combined with one access route (docs/context.md).
export type AccessRoute = "api" | TierId;

// The marker on a tier row naming its tier; API rows are untagged.
export type AccessTag = { label: string; family: PickerFamilyId };

// Where a row's figures come from: the DeepSWE leaderboard, or a vendor's own
// claim, which the UI marks and cites (ADR 0009). Only the citation: the
// entry's harness and trials stay in the data file, since nothing shows them
// (vendor-reported-data ticket 08).
export type Provenance =
  | { kind: "deepswe" }
  | ({ kind: "vendor-reported" } & Pick<
      VendorReportedEntry,
      "source" | "sourceUrl" | "publishedAt"
    >);

export type VendorReportedProvenance = Extract<Provenance, { kind: "vendor-reported" }>;

// API and effective figures in USD for the same cost measure.
export type CostPair = { api: number; effective: number };

// Absent facts are undefined, never null: the snapshot's nulls stop at
// deriveRows, so a column's accessor value is either a figure or undefined,
// which is what the table's blank-last sort keys on.
export type LeaderboardRow = {
  model: string;
  displayName: string;
  vendor: string;
  family: SubscriptionFamily;
  effort?: string; // absent = the model's default effort
  accessRoute: AccessRoute;
  accessTag?: AccessTag; // absent on API rows
  isBestEntry: boolean; // the model's best entry (docs/context.md); the same on every route
  provenance: Provenance; // the same on every route
  passAt1: number;
  cost: CostPair | undefined; // absent when the vendor-reported entry states no cost
  costPerSolvedTask: CostPair | undefined; // absent when passAt1 is 0 or cost is absent
  outputTokens?: number; // absent when the vendor-reported entry states none
  steps?: number; // likewise
  throughputTokPerSec?: number; // absent when unmapped or absent from the snapshot
  averageTimeSeconds?: number; // absent whenever throughput or output tokens are
};

export type ModelOption = {
  model: string;
  displayName: string;
  vendor: string;
  vendorReported: boolean; // coloured like its rows in the Models picker
};

// The family flagship's discount on a tier, under the family's flagship
// label; 0 on a tier that excludes it.
export type FlagshipNote = { label: string; tierDiscount: number };

export type PickerTier = {
  id: TierId;
  shortLabel: string;
  priceUsdPerMonth: number;
  // The family daily driver's discount on the tier.
  tierDiscount: number;
  flagshipNote?: FlagshipNote; // absent when the family has no flagship
};

export type PickerFamily = {
  family: PickerFamilyId;
  vendor: string; // the family's vendor; VendorMark renders its mark
  tiers: PickerTier[];
};

// The Subscriptions picker: exactly one access route per family, so every
// entry appears on exactly one row and the picker changes pricing, never row
// count. Rows whose family is "none" ignore the picker entirely.
export type SubscriptionSelection = Record<PickerFamilyId, AccessRoute>;

export type LeaderboardFilters = {
  effortView: "best" | "all";
  subscriptions: SubscriptionSelection;
  models: ReadonlySet<string>;
  // Whether the Models picker lists vendor-reported models. While off, none
  // is selected, so their rows are hidden too.
  includeVendorReported: boolean;
};

export type Leaderboard = {
  rows: LeaderboardRow[];
  // One option per model, sorted by display name, for the Models picker.
  modelOptions: ModelOption[];
  // The Subscriptions picker's sections in PICKER_FAMILIES order, tiers in
  // tiers.json (ascending price) order.
  pickerFamilies: PickerFamily[];
  // Best view, API routes, every model listed and selected.
  defaultFilters: () => LeaderboardFilters;
  visibleRows: (filters: LeaderboardFilters) => LeaderboardRow[];
};

export type LeaderboardSources = {
  snapshot: DeepsweSnapshot;
  vendorReported: VendorReportedSnapshot;
  mapping: ModelMappingEntry[];
  throughput: ThroughputSnapshot;
  tiers: Tier[];
  familyModels: FamilyModels;
  familyVendors: FamilyVendors;
};

export function createLeaderboard({
  snapshot,
  vendorReported,
  mapping,
  throughput,
  tiers,
  familyModels,
  familyVendors,
}: LeaderboardSources): Leaderboard {
  const rows = deriveRows(
    leaderboardEntries(snapshot, vendorReported),
    mapping,
    throughput,
    tiers,
    familyModels,
  );
  const modelOptions = [...new Map(rows.map((row) => [row.model, row]))]
    .map(([model, { displayName, vendor, provenance }]) => ({
      model,
      displayName,
      vendor,
      // Supersession is per model, so every row of a model shares a source.
      vendorReported: provenance.kind === "vendor-reported",
    }))
    .toSorted((a, b) => a.displayName.localeCompare(b.displayName, "en"));
  const pickerFamilies = PICKER_FAMILIES.map((family) => ({
    family,
    vendor: familyVendors[family],
    tiers: tiers
      .filter((tier) => tier.family === family)
      .map((tier) => ({
        id: tier.id,
        shortLabel: tier.shortLabel,
        priceUsdPerMonth: tier.priceUsdPerMonth,
        tierDiscount: 1 - dailyDriverFactor(tier, familyModels),
        flagshipNote: flagshipNote(mapping, tier, familyModels),
      })),
  }));
  return {
    rows,
    modelOptions,
    pickerFamilies,
    defaultFilters: () => ({
      effortView: "best",
      subscriptions: { claude: "api", chatgpt: "api", kimi: "api", glm: "api" },
      models: new Set(modelOptions.map(({ model }) => model)),
      includeVendorReported: true,
    }),
    visibleRows: (filters) =>
      rows.filter(
        (row) =>
          filters.models.has(row.model) &&
          (row.family === "none" || filters.subscriptions[row.family] === row.accessRoute) &&
          (filters.effortView === "all" || row.isBestEntry),
      ),
  };
}

// Model-column order: display name, then effort (default first). No access
// route tiebreak: visible rows hold one route per family, so two rows never
// share a model and effort (docs/context.md, Subscriptions picker).
export function compareModel(a: LeaderboardRow, b: LeaderboardRow): number {
  const byName = a.displayName.localeCompare(b.displayName, "en");
  if (byName !== 0) return byName;
  return effortRank(a.effort) - effortRank(b.effort);
}

// An entry's identity and figures, in the vendor-reported shape: DeepSWE
// entries state every figure, vendor-reported ones leave unstated figures
// absent (ADR 0009).
type LeaderboardEntryFields = Pick<
  VendorReportedEntry,
  "model" | "effort" | "pass_at_1" | "average_cost_usd" | "output_tokens" | "steps"
>;

// A leaderboard entry from either source, in the one shape rows derive from.
type LeaderboardEntry = Omit<LeaderboardEntryFields, "effort"> & {
  effort: string | null; // null = model's default effort, DeepSWE only
  provenance: Provenance;
};

function leaderboardEntries(
  snapshot: DeepsweSnapshot,
  vendorReported: VendorReportedSnapshot,
): LeaderboardEntry[] {
  return [
    ...snapshot.entries.map((entry) => ({
      ...entry,
      provenance: { kind: "deepswe" } satisfies Provenance,
    })),
    ...vendorReported.entries.map(
      ({
        model,
        effort,
        pass_at_1,
        average_cost_usd,
        output_tokens,
        steps,
        source,
        sourceUrl,
        publishedAt,
      }) => ({
        model,
        effort,
        pass_at_1,
        average_cost_usd,
        output_tokens,
        steps,
        provenance: {
          kind: "vendor-reported",
          source,
          sourceUrl,
          publishedAt,
        } satisfies Provenance,
      }),
    ),
  ];
}

function deriveRows(
  entries: LeaderboardEntry[],
  mapping: ModelMappingEntry[],
  throughput: ThroughputSnapshot,
  tiers: Tier[],
  familyModels: FamilyModels,
): LeaderboardRow[] {
  const byModel = new Map(mapping.map((entry) => [entry.leaderboardModel, entry]));
  const bestByModel = bestEntries(entries);
  return entries.flatMap((entry) => {
    const mapped = byModel.get(entry.model);
    if (!mapped) {
      throw new Error(
        `Leaderboard model "${entry.model}" is missing from data/model-mapping.json; add a mapping entry for it.`,
      );
    }
    const throughputTokPerSec =
      mapped.openrouterId === null
        ? undefined
        : throughput.models[mapped.openrouterId]?.consumerP50;
    const familyTiers = tiers.filter((tier) => tier.family === mapped.family);
    const isBestEntry = bestByModel.get(entry.model) === entry;
    // The entry's cost on a route with this subsidisation factor (1 on the
    // API); absent when the entry states no cost.
    const costAt = (factor: number): CostPair | undefined =>
      entry.average_cost_usd === undefined
        ? undefined
        : { api: entry.average_cost_usd, effective: entry.average_cost_usd * factor };
    const row = (
      accessRoute: AccessRoute,
      accessTag: AccessTag | undefined,
      cost: CostPair | undefined,
    ): LeaderboardRow => ({
      model: entry.model,
      displayName: mapped.displayName,
      vendor: mapped.vendor,
      family: mapped.family,
      effort: entry.effort ?? undefined,
      accessRoute,
      accessTag,
      isBestEntry,
      provenance: entry.provenance,
      passAt1: entry.pass_at_1,
      cost,
      costPerSolvedTask:
        cost === undefined || entry.pass_at_1 === 0
          ? undefined
          : { api: cost.api / entry.pass_at_1, effective: cost.effective / entry.pass_at_1 },
      outputTokens: entry.output_tokens,
      steps: entry.steps,
      throughputTokPerSec,
      averageTimeSeconds:
        throughputTokPerSec === undefined || entry.output_tokens === undefined
          ? undefined
          : entry.output_tokens / throughputTokPerSec,
    });
    return [
      row("api", undefined, costAt(1)),
      ...familyTiers.map((tier) =>
        row(
          tier.id,
          { label: tier.shortLabel, family: tier.family },
          costAt(subsidisationFactor(tier, mapped, familyModels)),
        ),
      ),
    ];
  });
}

// Filter transitions: pure, returning a new filters value so React state
// (and any memo keyed on it) sees the change.
export function setEffortView(
  filters: LeaderboardFilters,
  effortView: LeaderboardFilters["effortView"],
): LeaderboardFilters {
  return { ...filters, effortView };
}

export function setRoute(
  filters: LeaderboardFilters,
  family: keyof SubscriptionSelection,
  route: AccessRoute,
): LeaderboardFilters {
  return { ...filters, subscriptions: { ...filters.subscriptions, [family]: route } };
}

export function setModels(
  filters: LeaderboardFilters,
  models: ReadonlySet<string>,
): LeaderboardFilters {
  return { ...filters, models };
}

export function toggleModel(filters: LeaderboardFilters, model: string): LeaderboardFilters {
  const models = new Set(filters.models);
  if (models.has(model)) {
    models.delete(model);
  } else {
    models.add(model);
  }
  return setModels(filters, models);
}

// Turning vendor-reported models off deselects them; turning them back on
// lists them unselected, for the user to tick or select all.
export function setIncludeVendorReported(
  filters: LeaderboardFilters,
  includeVendorReported: boolean,
  modelOptions: ModelOption[],
): LeaderboardFilters {
  const vendorReportedModels = new Set(
    modelOptions.filter((option) => option.vendorReported).map(({ model }) => model),
  );
  const models = includeVendorReported
    ? filters.models
    : new Set([...filters.models].filter((model) => !vendorReportedModels.has(model)));
  return { ...filters, models, includeVendorReported };
}

// The models the Models picker lists, which select-all selects.
export function pickerModels(
  filters: LeaderboardFilters,
  modelOptions: ModelOption[],
): ModelOption[] {
  return modelOptions.filter((option) => filters.includeVendorReported || !option.vendorReported);
}

// Each model's best entry: the highest Pass@1 on the raw fraction, with the
// higher effort level winning an exact tie. This is the DeepSWE site's rule;
// for claude-fable-5 it picks xhigh over max. Chosen per model, so every
// access route of the entry is best together.
function bestEntries(entries: LeaderboardEntry[]): Map<string, LeaderboardEntry> {
  const best = new Map<string, LeaderboardEntry>();
  for (const entry of entries) {
    const incumbent = best.get(entry.model);
    if (incumbent === undefined || outscores(entry, incumbent)) best.set(entry.model, entry);
  }
  return best;
}

function outscores(entry: LeaderboardEntry, incumbent: LeaderboardEntry): boolean {
  if (entry.pass_at_1 !== incumbent.pass_at_1) return entry.pass_at_1 > incumbent.pass_at_1;
  return effortRank(entry.effort) > effortRank(incumbent.effort);
}

// Semantic effort order for the Model-sort tiebreak and the Best-entry
// tiebreak, matching the DeepSWE site; the default effort (null on a snapshot
// entry, undefined on a row) ranks lowest, unknown efforts highest.
const EFFORT_ORDER = ["minimal", "low", "medium", "high", "xhigh", "max"];

function effortRank(effort: string | null | undefined): number {
  if (effort == null) return -1;
  const rank = EFFORT_ORDER.indexOf(effort);
  return rank === -1 ? EFFORT_ORDER.length : rank;
}

// The family daily driver's API-equivalent value on a tier, which every model
// SemiAnalysis didn't measure takes. assertTierValues guarantees it at load.
function dailyDriverValue(tier: Tier, familyModels: FamilyModels): number {
  const { dailyDriverModel } = familyModels[tier.family];
  const value: number | undefined = tier.apiEquivalentValuesUsdPerMonth[dailyDriverModel];
  if (value === undefined) {
    throw new Error(
      `Tier "${tier.id}" has no API-equivalent value for daily driver "${dailyDriverModel}"; add one to data/tiers.json.`,
    );
  }
  return value;
}

// A model's API-equivalent value on a tier: SemiAnalysis's measured value, or
// the daily driver's for a model it didn't measure.
function apiEquivalentValue(tier: Tier, model: string, familyModels: FamilyModels): number {
  const measured: number | undefined = tier.apiEquivalentValuesUsdPerMonth[model];
  return measured ?? dailyDriverValue(tier, familyModels);
}

// What a dollar of API cost becomes for a mapped model on a tier: 1 on a tier
// that excludes it, whose subscribers pay usage credits at API rates.
function subsidisationFactor(
  tier: Tier,
  entry: ModelMappingEntry,
  familyModels: FamilyModels,
): number {
  return entry.excludedTiers?.includes(tier.id)
    ? 1
    : tier.priceUsdPerMonth / apiEquivalentValue(tier, entry.leaderboardModel, familyModels);
}

// The tier's headline factor, which every unmeasured model shares.
function dailyDriverFactor(tier: Tier, familyModels: FamilyModels): number {
  return tier.priceUsdPerMonth / dailyDriverValue(tier, familyModels);
}

// The one note on a tier rung: the family flagship's discount, shown even
// when it rounds to the headline; none for a family without a flagship.
// assertTierValues guarantees the flagship is mapped and either measured or
// excluded on every tier.
function flagshipNote(
  mapping: ModelMappingEntry[],
  tier: Tier,
  familyModels: FamilyModels,
): FlagshipNote | undefined {
  const { flagship } = familyModels[tier.family];
  if (flagship === undefined) return undefined;
  const entry = mapping.find((e) => e.leaderboardModel === flagship.model);
  if (entry === undefined) {
    throw new Error(
      `Flagship "${flagship.model}" is missing from the model mapping; add it to data/model-mapping.json.`,
    );
  }
  return {
    label: flagship.label,
    tierDiscount: 1 - subsidisationFactor(tier, entry, familyModels),
  };
}
