// The Leaderboard: every entry combined with every access route its family
// allows, plus the questions the toolbar and table ask of it. Built once from
// the loaded data files; tests build it from fixtures through the same
// interface.

import {
  type DeepsweSnapshot,
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
// claim, which the UI marks and cites (ADR 0009).
export type Provenance =
  | { kind: "deepswe" }
  | ({ kind: "vendor-reported" } & Omit<VendorReportedEntry, keyof LeaderboardEntryFields>);

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
  openrouterId?: string; // shown in the model-name tooltip
  throughputTokPerSec?: number; // absent when unmapped or absent from the snapshot
  averageTimeSeconds?: number; // absent whenever throughput or output tokens are
};

export type ModelOption = {
  model: string;
  displayName: string;
  vendor: string;
  vendorReported: boolean; // coloured like its rows in the Models picker
};

// A family model with a non-standard usage limit, badged per tier in the
// Subscriptions picker because its discount differs from the tier-wide one;
// 0 on a tier that excludes it.
export type UsageLimitNote = { name: string; tierDiscount: number };

export type PickerTier = {
  id: TierId;
  shortLabel: string;
  priceUsdPerMonth: number;
  // 1 − subsidisation factor at usage multiplier 1.0.
  tierDiscount: number;
  notes: UsageLimitNote[];
};

export type PickerFamily = {
  family: PickerFamilyId;
  vendor: string; // the family's vendor; VendorMark renders its mark
  tiers: PickerTier[];
};

// The Subscriptions picker: exactly one access route per family, so every
// entry appears on exactly one row and the picker changes pricing, never row
// count. Rows whose family is "none" ignore the picker entirely.
export type SubscriptionSelection = {
  claude: AccessRoute;
  chatgpt: AccessRoute;
};

export type LeaderboardFilters = {
  effortView: "best" | "all";
  subscriptions: SubscriptionSelection;
  models: ReadonlySet<string>;
};

export type Leaderboard = {
  rows: LeaderboardRow[];
  // One option per model, sorted by display name, for the Models picker.
  modelOptions: ModelOption[];
  // The Subscriptions picker's sections: Claude first, tiers in tiers.json
  // (ascending price) order.
  pickerFamilies: PickerFamily[];
  // Best view, API routes, every model selected.
  defaultFilters: () => LeaderboardFilters;
  visibleRows: (filters: LeaderboardFilters) => LeaderboardRow[];
};

export type LeaderboardSources = {
  snapshot: DeepsweSnapshot;
  vendorReported: VendorReportedSnapshot;
  mapping: ModelMappingEntry[];
  throughput: ThroughputSnapshot;
  tiers: Tier[];
  familyVendors: FamilyVendors;
};

export function createLeaderboard({
  snapshot,
  vendorReported,
  mapping,
  throughput,
  tiers,
  familyVendors,
}: LeaderboardSources): Leaderboard {
  const rows = deriveRows(leaderboardEntries(snapshot, vendorReported), mapping, throughput, tiers);
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
        tierDiscount: tierDiscount(tier, 1),
        notes: usageLimitNotes(mapping, family, tier),
      })),
  }));
  return {
    rows,
    modelOptions,
    pickerFamilies,
    defaultFilters: () => ({
      effortView: "best",
      subscriptions: { claude: "api", chatgpt: "api" },
      models: new Set(modelOptions.map(({ model }) => model)),
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
// absent (ADR 0009). Everything else on a vendor-reported entry is its
// provenance.
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
      ({ model, effort, pass_at_1, average_cost_usd, output_tokens, steps, ...claim }) => ({
        model,
        effort,
        pass_at_1,
        average_cost_usd,
        output_tokens,
        steps,
        provenance: { kind: "vendor-reported", ...claim } satisfies Provenance,
      }),
    ),
  ];
}

function deriveRows(
  entries: LeaderboardEntry[],
  mapping: ModelMappingEntry[],
  throughput: ThroughputSnapshot,
  tiers: Tier[],
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
      openrouterId: mapped.openrouterId ?? undefined,
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
          costAt(entrySubsidisationFactor(tier, mapped)),
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

// What a dollar of API cost becomes on a tier. The usage multiplier scales the
// equivalent API spend for models with non-standard usage limits.
function subsidisationFactor(tier: Tier, usageMultiplier: number): number {
  return tier.priceUsdPerMonth / (tier.equivalentApiSpendUsdPerMonth * usageMultiplier);
}

// A mapped model's subsidisation factor on a tier: 1 on a tier that excludes
// it, whose subscribers pay usage credits at API rates.
function entrySubsidisationFactor(tier: Tier, entry: ModelMappingEntry): number {
  return entry.excludedTiers?.includes(tier.id)
    ? 1
    : subsidisationFactor(tier, entry.usageMultiplier);
}

// A family's models whose factor on the tier differs from the tier-wide one
// (a non-standard usage multiplier, or a tier that excludes the model), one
// note per distinct label and factor: models sharing both (Fable 5 and
// Fable 5.1, both "Fable" at 0.5) share one note.
function usageLimitNotes(
  mapping: ModelMappingEntry[],
  family: PickerFamilyId,
  tier: Tier,
): UsageLimitNote[] {
  const notes = new Map<string, UsageLimitNote>();
  for (const entry of mapping) {
    const factor = entrySubsidisationFactor(tier, entry);
    if (entry.family !== family || factor === subsidisationFactor(tier, 1)) continue;
    const name = entry.shortName ?? entry.displayName;
    notes.set(`${name}@${factor}`, { name, tierDiscount: 1 - factor });
  }
  return [...notes.values()];
}

// A subsidisation factor as the discount it amounts to.
function tierDiscount(tier: Tier, usageMultiplier: number): number {
  return 1 - subsidisationFactor(tier, usageMultiplier);
}
