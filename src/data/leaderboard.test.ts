import { describe, expect, test } from "vite-plus/test";

import {
  deepsweSnapshot,
  leaderboardSources as sources,
  modelMapping,
  throughputSnapshot,
  tiers,
  vendorReportedSnapshot,
} from "./sources.ts";
import {
  compareModel,
  createLeaderboard,
  pickerModels,
  setEffortView,
  setModels,
  setRoute,
  setVendorReported,
  toggleModel,
  type AccessRoute,
  type Leaderboard,
  type LeaderboardFilters,
  type LeaderboardSources,
  type LeaderboardRow,
} from "./leaderboard.ts";
import type {
  ModelMappingEntry,
  ThroughputSnapshot,
  VendorReportedEntry,
  VendorReportedSnapshot,
} from "./schema.ts";

// Value-asserting throughput tests use this fixture rather than the live
// snapshot, so a data refresh never re-touches them; live-data tests below
// assert structure only.
const throughputFixture: ThroughputSnapshot = {
  source: "OpenRouter",
  sourceUrl: "https://openrouter.ai",
  capturedAt: "2026-01-01T00:00:00Z",
  models: {
    "anthropic/claude-opus-5": { consumerP50: 50 },
    "anthropic/claude-fable-5": { consumerP50: 42 },
  },
};

const live = () => createLeaderboard(sources);

// Fixture-built leaderboards start from no vendor-reported entries, so live
// claims never meet a fixture's snapshot or mapping.
const fixtureSources: LeaderboardSources = {
  ...sources,
  vendorReported: { benchmark_version: "v1.1", entries: [] },
};

// Every live leaderboard entry, from both sources: row counts follow these,
// whichever source an entry came from (ADR 0009).
const liveEntries = [...deepsweSnapshot.entries, ...vendorReportedSnapshot.entries];

// A family's access routes in row order: the API, then its tiers.
const familyRoutes = (family: "claude" | "chatgpt"): AccessRoute[] => [
  "api",
  ...tiers.filter((tier) => tier.family === family).map((tier) => tier.id),
];

// Synthetic family-"none" models: rows come from the snapshot.
const mappingFixture = (models: string[]): ModelMappingEntry[] =>
  models.map((model) => ({
    leaderboardModel: model,
    displayName: model,
    vendor: "Test",
    openrouterId: null,
    family: "none" as const,
    usageMultiplier: 1,
  }));

// Models whose best entry exercises each branch of the Best rule. "inverted"
// is a Claude-family model so its entries fan out over every Claude route.
const bestFixture = () => {
  const base = deepsweSnapshot.entries[0];
  const entry = (model: string, effort: string | null, pass_at_1: number) => ({
    ...base,
    model,
    effort,
    pass_at_1,
  });
  const snapshot = {
    ...deepsweSnapshot,
    entries: [
      entry("inverted", "max", 0.5),
      entry("inverted", "xhigh", 0.6),
      entry("ordinary", "high", 0.3),
      entry("ordinary", "xhigh", 0.4),
      // max listed before high so a last-tie-wins bug would pick high.
      entry("tied", "max", 0.5),
      entry("tied", "high", 0.5),
      entry("tied", "xhigh", 0.4),
      entry("single", null, 0.7),
    ],
  };
  const mapping = mappingFixture(["inverted", "ordinary", "tied", "single"]).map((e) =>
    e.leaderboardModel === "inverted" ? { ...e, family: "claude" as const } : e,
  );
  return createLeaderboard({ ...fixtureSources, snapshot, mapping });
};

describe("rows", () => {
  const { rows } = live();
  // Rows whose figures sourceEntry can look up in the DeepSWE snapshot.
  const deepsweRows = rows.filter((row) => row.provenance.kind === "deepswe");
  const sourceEntry = (row: { model: string; effort?: string }) =>
    deepsweSnapshot.entries.find(
      (e) => e.model === row.model && e.effort === (row.effort ?? null),
    )!;

  test("expands every entry into an API row plus one row per family tier", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierCount = (family: string) => tiers.filter((tier) => tier.family === family).length;
    const expected = liveEntries.reduce(
      (total, entry) => total + 1 + tierCount(familyOf.get(entry.model) ?? "none"),
      0,
    );
    expect(rows).toHaveLength(expected);
    // No literal count here: snapshot-size drift checks moved to the
    // load-time schema and PR review (ADR 0004).
    expect(rows.filter((row) => row.accessRoute === "api")).toHaveLength(liveEntries.length);
  });

  test("every tier row uses one of its own mapping family's tiers", () => {
    const familyOf = new Map(modelMapping.map((entry) => [entry.leaderboardModel, entry.family]));
    const tierFamily = new Map<string, string>(tiers.map((tier) => [tier.id, tier.family]));
    const tierRows = rows.filter((row) => row.accessRoute !== "api");
    expect(tierRows.length).toBeGreaterThan(0);
    for (const row of tierRows) {
      // Cross-checked against the mapping, not just the row's own family, so
      // a row-derivation bug assigning the wrong family cannot self-confirm.
      expect(row.family).toBe(familyOf.get(row.model));
      expect(tierFamily.get(row.accessRoute)).toBe(row.family);
    }
  });

  test("family none models never get tier rows", () => {
    const noneModels = new Set(
      modelMapping
        .filter((entry) => entry.family === "none")
        .map((entry) => entry.leaderboardModel),
    );
    const noneRows = rows.filter((row) => noneModels.has(row.model));
    expect(noneRows.length).toBeGreaterThan(0);
    expect(noneRows.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("a family entry gets exactly its family's tiers as access routes", () => {
    const fable = rows.filter((row) => row.model === "claude-fable-5" && row.effort === "max");
    expect(fable.map((row) => row.accessRoute)).toEqual([
      "api",
      "claude-pro",
      "claude-max-5x",
      "claude-max-20x",
    ]);
  });

  test("claude-pro rows of standard Claude models use factor 0.05", () => {
    // 20 / 400 at the default usage multiplier.
    const proRows = deepsweRows.filter(
      (row) => row.accessRoute === "claude-pro" && row.model !== "claude-fable-5",
    );
    expect(proRows.length).toBeGreaterThan(0);
    for (const row of proRows) {
      expect(row.cost?.effective).toBeCloseTo(sourceEntry(row).average_cost_usd * 0.05, 10);
    }
  });

  test("the usage multiplier scales the factor: Fable 5 Max rows are 0.10 and 0.05", () => {
    // claude-max-5x: 100 / (2000 × 0.5) = 0.10; claude-max-20x: 200 / (8000 × 0.5)
    // = 0.05, not 0.05 and 0.025.
    for (const [accessRoute, factor] of [
      ["claude-max-5x", 0.1],
      ["claude-max-20x", 0.05],
    ] as const) {
      const maxRows = deepsweRows.filter(
        (row) => row.accessRoute === accessRoute && row.model === "claude-fable-5",
      );
      expect(maxRows.length, accessRoute).toBeGreaterThan(0);
      for (const row of maxRows) {
        expect(row.cost?.effective).toBeCloseTo(sourceEntry(row).average_cost_usd * factor, 10);
      }
    }
  });

  // Pro runs Fable on usage credits, billed at standard API rates.
  test("Fable 5 claude-pro rows are at API cost: Pro excludes it", () => {
    const proRows = deepsweRows.filter(
      (row) => row.accessRoute === "claude-pro" && row.model === "claude-fable-5",
    );
    expect(proRows.length).toBeGreaterThan(0);
    for (const row of proRows) {
      expect(row.cost?.effective).toBe(sourceEntry(row).average_cost_usd);
      expect(row.costPerSolvedTask?.effective).toBe(row.costPerSolvedTask?.api);
    }
  });

  test("a tier in the mapping's excludedTiers uses factor 1, other tiers are unchanged", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [{ ...deepsweSnapshot.entries[0], model: "excluded", average_cost_usd: 4 }],
    };
    const mapping = mappingFixture(["excluded"]).map((e) => ({
      ...e,
      family: "claude" as const,
      excludedTiers: ["claude-max-5x" as const],
    }));
    const { rows } = createLeaderboard({ ...fixtureSources, snapshot, mapping });
    expect(rows.map((row) => [row.accessRoute, row.cost?.effective])).toEqual([
      ["api", 4],
      ["claude-pro", expect.closeTo(4 * 0.05, 10)],
      ["claude-max-5x", 4],
      ["claude-max-20x", expect.closeTo(4 * 0.025, 10)],
    ]);
  });

  test("ChatGPT tier rows use their own tier figures", () => {
    // chatgpt-plus: 20 / 700.
    const entry = deepsweSnapshot.entries.find((e) => e.model === "gpt-5-5");
    const row = rows.find(
      (r) =>
        r.model === "gpt-5-5" && r.effort === entry?.effort && r.accessRoute === "chatgpt-plus",
    );
    expect(row?.cost?.effective).toBeCloseTo(entry!.average_cost_usd * (20 / 700), 10);
  });

  test("tier rows carry the entry's API cost beside the effective cost", () => {
    const tierRows = deepsweRows.filter((row) => row.accessRoute !== "api");
    expect(tierRows.length).toBeGreaterThan(0);
    for (const row of tierRows) {
      expect(row.cost?.api).toBe(sourceEntry(row).average_cost_usd);
    }
  });

  test("API rows' API cost equals their effective cost", () => {
    const apiRows = rows.filter((row) => row.accessRoute === "api");
    expect(apiRows.length).toBeGreaterThan(0);
    for (const row of apiRows) {
      expect(row.cost?.api).toBe(row.cost?.effective);
      expect(row.costPerSolvedTask?.api).toBe(row.costPerSolvedTask?.effective);
    }
  });

  test("a tier row's API cost per solved task matches its model's API row", () => {
    const tier = rows.find(
      (r) => r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "claude-pro",
    );
    const api = rows.find(
      (r) => r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "api",
    );
    expect(tier?.costPerSolvedTask?.api).toBe(api?.costPerSolvedTask?.effective);
  });

  test("cost per solved task follows the row's effective cost", () => {
    // claude-pro scales cost by 0.05, so cost per solved task scales the same.
    const api = rows.find((r) => r.model === "claude-opus-5" && r.accessRoute === "api");
    const tier = rows.find(
      (r) =>
        r.model === "claude-opus-5" && r.effort === api?.effort && r.accessRoute === "claude-pro",
    );
    expect(tier?.costPerSolvedTask?.effective).toBeCloseTo(
      api!.costPerSolvedTask!.effective * 0.05,
      10,
    );
  });

  test("cost per solved task is blank when Pass@1 is 0", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [{ ...deepsweSnapshot.entries[0], model: "claude-fable-5", pass_at_1: 0 }],
    };
    const [row] = createLeaderboard({
      ...fixtureSources,
      snapshot,
      throughput: throughputFixture,
    }).rows;
    expect(row.costPerSolvedTask).toBeUndefined();
  });

  test("rows carry mapping display names and families", () => {
    const opus = rows.find((row) => row.model === "claude-opus-5" && row.effort === "max");
    expect(opus?.displayName).toBe("Claude Opus 5");
    expect(opus?.vendor).toBe("Anthropic");
    expect(opus?.family).toBe("claude");
    expect(rows.find((row) => row.model === "kimi-k3")?.family).toBe("none");
  });

  test("rows use the snapshot's cost-adjusted average cost, not the raw value", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [
        {
          ...deepsweSnapshot.entries[0],
          model: "adjusted",
          average_cost_usd: 1,
          raw_average_cost_usd: 4,
          cost_adjustment_factor: 0.25,
        },
      ],
    };
    const [row] = createLeaderboard({
      ...fixtureSources,
      snapshot,
      mapping: mappingFixture(["adjusted"]),
    }).rows;
    expect(row.cost?.effective).toBe(1);
    expect(row.cost?.api).toBe(1);
  });

  test("each row states whether it is its model's best entry, the same on every route", () => {
    const flagged = bestFixture().rows.filter((row) => row.isBestEntry);
    // Distinct flagged efforts per model: one each, or a second effort is
    // over-flagged.
    const flaggedEfforts = new Map<string, Set<string | undefined>>();
    for (const row of flagged) {
      flaggedEfforts.set(row.model, (flaggedEfforts.get(row.model) ?? new Set()).add(row.effort));
    }
    const only = (effort: string | undefined) => new Set([effort]);
    expect(flaggedEfforts).toEqual(
      new Map([
        ["inverted", only("xhigh")],
        ["ordinary", only("xhigh")],
        ["tied", only("max")],
        ["single", only(undefined)],
      ]),
    );
    const inverted = flagged.filter((row) => row.model === "inverted");
    expect(inverted.map((row) => row.accessRoute)).toEqual(familyRoutes("claude"));
  });

  test("throws when a leaderboard model is missing from the mapping", () => {
    const mapping = modelMapping.filter((entry) => entry.leaderboardModel !== "glm-5-3");
    expect(() => createLeaderboard({ ...fixtureSources, mapping })).toThrow(/glm-5-3/);
  });

  test("a model's rows share one throughput figure across effort levels", () => {
    const opus = createLeaderboard({
      ...fixtureSources,
      throughput: throughputFixture,
    }).rows.filter((row) => row.model === "claude-opus-5");
    expect(opus.length).toBeGreaterThan(1);
    for (const row of opus) {
      expect(row.throughputTokPerSec).toBe(50);
    }
  });

  test("average time is output tokens over the model's consumer-endpoint throughput", () => {
    const snapshot = {
      ...deepsweSnapshot,
      entries: [{ ...deepsweSnapshot.entries[0], model: "claude-fable-5", output_tokens: 8400 }],
    };
    const [row] = createLeaderboard({
      ...fixtureSources,
      snapshot,
      throughput: throughputFixture,
    }).rows;
    expect(row.throughputTokPerSec).toBe(42);
    expect(row.averageTimeSeconds).toBe(200);
  });

  test("a null OpenRouter id blanks throughput and time", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "glm-5-3" ? { ...entry, openrouterId: null } : entry,
    );
    const glm = createLeaderboard({ ...fixtureSources, mapping }).rows.filter(
      (row) => row.model === "glm-5-3",
    );
    expect(glm.length).toBeGreaterThan(0);
    for (const row of glm) {
      expect(row.throughputTokPerSec).toBeUndefined();
      expect(row.averageTimeSeconds).toBeUndefined();
    }
  });

  test("a model absent from the throughput snapshot blanks throughput and time", () => {
    const models = { ...throughputSnapshot.models };
    delete models["z-ai/glm-5.3"];
    const glm = createLeaderboard({
      ...fixtureSources,
      throughput: { ...throughputSnapshot, models },
    }).rows.filter((row) => row.model === "glm-5-3");
    expect(glm.length).toBeGreaterThan(0);
    for (const row of glm) {
      expect(row.throughputTokPerSec).toBeUndefined();
      expect(row.averageTimeSeconds).toBeUndefined();
    }
  });
});

// A Claude-family model DeepSWE hasn't published, claimed at Pass@1 only:
// the shape nearly every vendor publishes (ADR 0009).
const opusNineMapping: ModelMappingEntry = {
  leaderboardModel: "claude-opus-9",
  displayName: "Claude Opus 9",
  vendor: "Anthropic",
  openrouterId: "anthropic/claude-opus-9",
  family: "claude",
  usageMultiplier: 1,
};
const opusNineClaim: VendorReportedEntry = {
  model: "claude-opus-9",
  effort: "max",
  pass_at_1: 0.742,
  source: "Claude Opus 9 System Card §8.3",
  sourceUrl: "https://www.anthropic.com/claude-opus-9",
  publishedAt: "2026-09-22",
};
const vendorReportedLeaderboard = (...entries: VendorReportedEntry[]) => {
  const vendorReported: VendorReportedSnapshot = { benchmark_version: "v1.1", entries };
  return createLeaderboard({
    ...fixtureSources,
    vendorReported,
    mapping: [...modelMapping, opusNineMapping],
    throughput: {
      ...throughputFixture,
      models: { ...throughputFixture.models, "anthropic/claude-opus-9": { consumerP50: 45 } },
    },
  });
};
const opusNineRows = (leaderboard: Leaderboard) =>
  leaderboard.rows.filter((row) => row.model === "claude-opus-9");

describe("vendor-reported entries", () => {
  test("a Pass@1-only claim gets one row per access route, its missing figures blank", () => {
    const rows = opusNineRows(vendorReportedLeaderboard(opusNineClaim));
    expect(rows.map((row) => row.accessRoute)).toEqual(familyRoutes("claude"));
    for (const row of rows) {
      expect(row.passAt1).toBe(0.742);
      expect(row.cost).toBeUndefined();
      expect(row.costPerSolvedTask).toBeUndefined();
      expect(row.outputTokens).toBeUndefined();
      expect(row.steps).toBeUndefined();
      expect(row.averageTimeSeconds).toBeUndefined();
      // Throughput comes from OpenRouter, not the claim.
      expect(row.throughputTokPerSec).toBe(45);
    }
  });

  test("a claim that states cost and tokens carries them through, tier rows included", () => {
    const claim = { ...opusNineClaim, average_cost_usd: 2, output_tokens: 74200, steps: 80 };
    const rows = opusNineRows(vendorReportedLeaderboard(claim));
    const api = rows.find((row) => row.accessRoute === "api");
    const pro = rows.find((row) => row.accessRoute === "claude-pro");
    expect(api?.cost).toEqual({ api: 2, effective: 2 });
    expect(api?.costPerSolvedTask?.effective).toBeCloseTo(2.69542, 5);
    expect(api?.outputTokens).toBe(74200);
    expect(api?.steps).toBe(80);
    expect(api?.averageTimeSeconds).toBeCloseTo(1648.889, 3);
    // claude-pro scales cost by 0.05.
    expect(pro?.cost?.api).toBe(2);
    expect(pro?.cost?.effective).toBeCloseTo(0.1, 10);
    expect(pro?.costPerSolvedTask?.effective).toBeCloseTo(0.134771, 6);
  });

  test("rows carry the claim's provenance on every access route", () => {
    const claim: VendorReportedEntry = {
      ...opusNineClaim,
      harness: "mini-swe-agent",
      trials: 5,
    };
    for (const row of opusNineRows(vendorReportedLeaderboard(claim))) {
      expect(row.provenance).toEqual({
        kind: "vendor-reported",
        source: "Claude Opus 9 System Card §8.3",
        sourceUrl: "https://www.anthropic.com/claude-opus-9",
        publishedAt: "2026-09-22",
        harness: "mini-swe-agent",
        trials: 5,
      });
    }
  });

  test("unstated harness and trials stay out of the provenance", () => {
    const [row] = opusNineRows(vendorReportedLeaderboard(opusNineClaim));
    expect(row.provenance).toStrictEqual({
      kind: "vendor-reported",
      source: "Claude Opus 9 System Card §8.3",
      sourceUrl: "https://www.anthropic.com/claude-opus-9",
      publishedAt: "2026-09-22",
    });
  });

  test("a claim leaves every DeepSWE row unchanged", () => {
    const withClaim = vendorReportedLeaderboard(opusNineClaim).rows.filter(
      (row) => row.model !== "claude-opus-9",
    );
    expect(withClaim).toEqual(vendorReportedLeaderboard().rows);
  });

  test("a claim shows once per effort view on any route, so the picker never changes row count", () => {
    const leaderboard = vendorReportedLeaderboard(
      { ...opusNineClaim, effort: "max", pass_at_1: 0.71 },
      { ...opusNineClaim, effort: "high", pass_at_1: 0.752 },
    );
    for (const claude of familyRoutes("claude")) {
      const subscriptions = { claude, chatgpt: "api" as const };
      const shown = (effortView: "best" | "all") =>
        leaderboard
          .visibleRows({ ...leaderboard.defaultFilters(), effortView, subscriptions })
          .filter((row) => row.model === "claude-opus-9")
          .map((row) => [row.effort, row.accessRoute]);
      expect(shown("all")).toEqual([
        ["max", claude],
        ["high", claude],
      ]);
      expect(shown("best")).toEqual([["high", claude]]);
    }
  });

  test("DeepSWE rows carry DeepSWE provenance", () => {
    const rows = vendorReportedLeaderboard(opusNineClaim).rows.filter(
      (row) => row.model !== "claude-opus-9",
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) expect(row.provenance).toEqual({ kind: "deepswe" });
  });

  test("Best entry and the Models picker treat claims like DeepSWE entries", () => {
    const leaderboard = vendorReportedLeaderboard(
      { ...opusNineClaim, effort: "max", pass_at_1: 0.71 },
      { ...opusNineClaim, effort: "high", pass_at_1: 0.752 },
    );
    const best = opusNineRows(leaderboard).filter((row) => row.isBestEntry);
    expect(best.map((row) => [row.effort, row.accessRoute])).toEqual(
      familyRoutes("claude").map((route) => ["high", route]),
    );
    expect(leaderboard.modelOptions).toContainEqual({
      model: "claude-opus-9",
      displayName: "Claude Opus 9",
      vendor: "Anthropic",
      vendorReported: true,
    });
  });
});

describe("access tags", () => {
  const { rows } = live();

  test("tier rows carry their tier's short label and family", () => {
    const row = rows.find(
      (r) =>
        r.model === "claude-opus-5" && r.effort === "max" && r.accessRoute === "claude-max-20x",
    );
    expect(row?.accessTag).toEqual({ label: "Max 20x", family: "claude" });
    const plus = rows.find((r) => r.model === "gpt-5-5" && r.accessRoute === "chatgpt-plus");
    expect(plus?.accessTag).toEqual({ label: "Plus", family: "chatgpt" });
  });

  test("API rows are untagged", () => {
    const apiRows = rows.filter((row) => row.accessRoute === "api");
    expect(apiRows.length).toBeGreaterThan(0);
    expect(apiRows.every((row) => row.accessTag === undefined)).toBe(true);
  });
});

describe("modelOptions", () => {
  test("lists each model once", () => {
    const { modelOptions } = live();
    const models = modelOptions.map((option) => option.model);
    expect(new Set(models).size).toBe(models.length);
    expect(new Set(models)).toEqual(new Set(liveEntries.map((entry) => entry.model)));
  });

  test("sorts by display name, case-insensitively", () => {
    const base = deepsweSnapshot.entries[0];
    const snapshot = {
      ...deepsweSnapshot,
      entries: ["beta", "Gamma", "Alpha"].flatMap((model) => [
        { ...base, model, effort: null },
        { ...base, model, effort: "max" },
      ]),
    };
    const mapping = mappingFixture(["beta", "Gamma", "Alpha"]);
    const { modelOptions } = createLeaderboard({ ...fixtureSources, snapshot, mapping });
    expect(modelOptions.map((option) => option.displayName)).toEqual(["Alpha", "beta", "Gamma"]);
  });

  test("uses the mapping's display name", () => {
    const { modelOptions } = live();
    expect(modelOptions.find((option) => option.model === "claude-opus-5")?.displayName).toBe(
      "Claude Opus 5",
    );
  });

  // The Models picker colours vendor-reported models like their rows.
  test("says whether a model is vendor-reported", () => {
    const { modelOptions } = vendorReportedLeaderboard(opusNineClaim);
    const flag = (model: string) => modelOptions.find((o) => o.model === model)?.vendorReported;
    expect(flag("claude-opus-9")).toBe(true);
    expect(flag("claude-opus-5")).toBe(false);
  });

  test("carries the mapping's vendor for the Models picker's vendor mark", () => {
    const { modelOptions } = live();
    expect(modelOptions.find((option) => option.model === "claude-opus-5")?.vendor).toBe(
      "Anthropic",
    );
  });
});

describe("pickerFamilies", () => {
  const { pickerFamilies } = live();
  const family = (id: "claude" | "chatgpt") => pickerFamilies.find((f) => f.family === id)!;

  test("lists both families, Claude first, with their tiers in tiers.json order", () => {
    expect(pickerFamilies.map((f) => f.family)).toEqual(["claude", "chatgpt"]);
    // The vendor mark for each column is the family's vendor.
    expect(pickerFamilies.map((f) => f.vendor)).toEqual(["Anthropic", "OpenAI"]);
    expect(family("claude").tiers.map((tier) => tier.id)).toEqual([
      "claude-pro",
      "claude-max-5x",
      "claude-max-20x",
    ]);
    expect(family("chatgpt").tiers.map((tier) => tier.id)).toEqual([
      "chatgpt-plus",
      "chatgpt-pro-5x",
      "chatgpt-pro-20x",
    ]);
  });

  test("each tier carries its short label, monthly price and tier-wide discount", () => {
    // claude-pro: 1 − 20/400 = 0.95; claude-max-20x: 1 − 200/8000 = 0.975.
    const pro = family("claude").tiers.find((tier) => tier.id === "claude-pro");
    expect(pro?.shortLabel).toBe("Pro");
    expect(pro?.priceUsdPerMonth).toBe(20);
    expect(pro?.tierDiscount).toBeCloseTo(0.95, 10);
    const max20 = family("claude").tiers.find((tier) => tier.id === "claude-max-20x");
    expect(max20?.priceUsdPerMonth).toBe(200);
    expect(max20?.tierDiscount).toBeCloseTo(0.975, 10);
  });

  test("models with non-standard usage limits get their own note per tier", () => {
    // Fable 5 at multiplier 0.5: 1 − 100/(2000 × 0.5) = 0.90 on Max 5x,
    // 1 − 200/(8000 × 0.5) = 0.95 on Max 20x.
    const max5 = family("claude").tiers.find((tier) => tier.id === "claude-max-5x");
    expect(max5?.notes).toEqual([{ name: "Fable", tierDiscount: expect.closeTo(0.9, 10) }]);
    const max20 = family("claude").tiers.find((tier) => tier.id === "claude-max-20x");
    expect(max20?.notes).toEqual([{ name: "Fable", tierDiscount: expect.closeTo(0.95, 10) }]);
  });

  test("a tier excluding a model notes it at no discount", () => {
    // Pro excludes Fable 5: its note reads at full price.
    const pro = family("claude").tiers.find((tier) => tier.id === "claude-pro");
    expect(pro?.notes).toEqual([{ name: "Fable", tierDiscount: 0 }]);
  });

  test("an excluded model gets a note even at the standard usage multiplier", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "gpt-5-5"
        ? { ...entry, excludedTiers: ["chatgpt-plus" as const] }
        : entry,
    );
    const { pickerFamilies } = createLeaderboard({ ...fixtureSources, mapping });
    const tiers = pickerFamilies.find((f) => f.family === "chatgpt")!.tiers;
    expect(tiers.map((tier) => [tier.id, tier.notes])).toEqual([
      ["chatgpt-plus", [{ name: "GPT-5.5", tierDiscount: 0 }]],
      ["chatgpt-pro-5x", []],
      ["chatgpt-pro-20x", []],
    ]);
  });

  test("standard-limit families have no notes", () => {
    for (const tier of family("chatgpt").tiers) {
      expect(tier.notes).toEqual([]);
    }
  });

  // Fable 5 and Fable 5.1 share Fable's halved limits, so one "Fable" note
  // covers both.
  test("models sharing a short name and usage multiplier share one note", () => {
    const fable = modelMapping.find((entry) => entry.leaderboardModel === "claude-fable-5")!;
    const fable9 = { ...fable, leaderboardModel: "claude-fable-9", openrouterId: null };
    const mapping = [...modelMapping, fable9];
    const { pickerFamilies } = createLeaderboard({ ...fixtureSources, mapping });
    // Max 5x, not Pro: Pro excludes Fable. 1 − 100/(2000 × 0.5)
    const maxFive = pickerFamilies
      .find((f) => f.family === "claude")!
      .tiers.find((tier) => tier.id === "claude-max-5x");
    expect(maxFive?.notes).toEqual([{ name: "Fable", tierDiscount: expect.closeTo(0.9, 10) }]);
  });

  test("models sharing a short name at different multipliers get a note each", () => {
    const fable = modelMapping.find((entry) => entry.leaderboardModel === "claude-fable-5")!;
    const fable9 = {
      ...fable,
      leaderboardModel: "claude-fable-9",
      openrouterId: null,
      usageMultiplier: 0.25,
    };
    const mapping = [...modelMapping.filter((e) => e.shortName !== "Fable"), fable, fable9];
    const { pickerFamilies } = createLeaderboard({ ...fixtureSources, mapping });
    const maxFive = pickerFamilies
      .find((f) => f.family === "claude")!
      .tiers.find((tier) => tier.id === "claude-max-5x");
    // 1 − 100/(2000 × 0.5) and 1 − 100/(2000 × 0.25)
    expect(maxFive?.notes).toEqual([
      { name: "Fable", tierDiscount: expect.closeTo(0.9, 10) },
      { name: "Fable", tierDiscount: expect.closeTo(0.8, 10) },
    ]);
  });

  test("a note uses the mapping's short name, falling back to the display name", () => {
    const mapping = modelMapping.map((entry) =>
      entry.leaderboardModel === "gpt-5-5"
        ? { ...entry, usageMultiplier: 2, shortName: undefined }
        : entry,
    );
    const { pickerFamilies } = createLeaderboard({ ...fixtureSources, mapping });
    const plus = pickerFamilies
      .find((f) => f.family === "chatgpt")!
      .tiers.find((tier) => tier.id === "chatgpt-plus");
    // 1 − 20/(700 × 2)
    expect(plus?.notes).toEqual([
      { name: "GPT-5.5", tierDiscount: expect.closeTo(1 - 20 / 1400, 10) },
    ]);
  });
});

describe("visibleRows", () => {
  const leaderboard = live();
  const { rows, modelOptions } = leaderboard;
  const filters = (overrides: Partial<LeaderboardFilters>): LeaderboardFilters => ({
    ...leaderboard.defaultFilters(),
    ...overrides,
  });

  test("the default view shows one API row per model", () => {
    const visible = leaderboard.visibleRows(leaderboard.defaultFilters());
    // Counts assert relationships, never snapshot-size literals; drift checks
    // moved to the load-time schema and PR review (ADR 0004).
    expect(visible).toHaveLength(modelOptions.length);
    expect(new Set(visible.map((row) => row.model)).size).toBe(visible.length);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("Best keeps each model's best entry: the highest Pass@1", () => {
    // Mirrors claude-fable-5, whose xhigh entry outscores max; the DeepSWE
    // site's Best view shows xhigh, and so do we.
    const visible = bestFixture().visibleRows(bestFixture().defaultFilters());
    expect(visible.find((row) => row.model === "inverted")?.effort).toBe("xhigh");
    expect(visible.find((row) => row.model === "ordinary")?.effort).toBe("xhigh");
  });

  test("Best breaks an exact Pass@1 tie by the higher effort level", () => {
    // Mirrors gpt-6-astra, whose high and max entries score identically.
    const visible = bestFixture().visibleRows(bestFixture().defaultFilters());
    expect(visible.find((row) => row.model === "tied")?.effort).toBe("max");
  });

  test("Best picks the same entry on every access route", () => {
    const api = leaderboard.visibleRows(leaderboard.defaultFilters());
    const onTier = leaderboard.visibleRows(
      filters({
        subscriptions: { ...leaderboard.defaultFilters().subscriptions, claude: "claude-max-20x" },
      }),
    );
    const effortOf = (rows: typeof api, model: string) =>
      rows.find((row) => row.model === model)?.effort;
    expect(effortOf(onTier, "claude-fable-5")).toBe(effortOf(api, "claude-fable-5"));
    expect(onTier.find((row) => row.model === "claude-fable-5")?.accessRoute).toBe(
      "claude-max-20x",
    );
  });

  test("Best keeps a single default-effort entry", () => {
    const visible = bestFixture().visibleRows(bestFixture().defaultFilters());
    expect(visible.find((row) => row.model === "single")?.effort).toBeUndefined();
  });

  test("All effort levels with API only shows every entry once", () => {
    const visible = leaderboard.visibleRows(filters({ effortView: "all" }));
    expect(visible).toHaveLength(liveEntries.length);
    expect(visible.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("picking a tier replaces that family's API rows and touches nothing else", () => {
    const visible = leaderboard.visibleRows(
      filters({ effortView: "all", subscriptions: { claude: "claude-pro", chatgpt: "api" } }),
    );
    expect(visible).toHaveLength(liveEntries.length);
    const claudeRows = visible.filter((row) => row.family === "claude");
    expect(claudeRows.length).toBeGreaterThan(0);
    expect(claudeRows.every((row) => row.accessRoute === "claude-pro")).toBe(true);
    expect(visible.some((row) => row.family === "chatgpt" && row.accessRoute === "api")).toBe(true);
  });

  test("family-none rows stay on API under any selection", () => {
    const visible = leaderboard.visibleRows(
      filters({
        effortView: "all",
        subscriptions: { claude: "claude-max-20x", chatgpt: "chatgpt-pro-20x" },
      }),
    );
    const noneRows = visible.filter((row) => row.family === "none");
    expect(noneRows.length).toBeGreaterThan(0);
    expect(noneRows.every((row) => row.accessRoute === "api")).toBe(true);
  });

  test("the picker changes pricing, never row count", () => {
    // Exactly one route per family means every entry appears on exactly one
    // row: every entry in the All view and one per model in Best, whatever
    // the picker says.
    for (const claude of familyRoutes("claude")) {
      for (const chatgpt of familyRoutes("chatgpt")) {
        const subscriptions = { claude, chatgpt };
        expect(leaderboard.visibleRows(filters({ effortView: "all", subscriptions }))).toHaveLength(
          liveEntries.length,
        );
        expect(leaderboard.visibleRows(filters({ subscriptions }))).toHaveLength(
          modelOptions.length,
        );
      }
    }
  });

  test("unticking a model removes all its rows across efforts and routes", () => {
    const models = new Set(
      modelOptions.map(({ model }) => model).filter((model) => model !== "claude-fable-5"),
    );
    const visible = leaderboard.visibleRows(
      filters({
        effortView: "all",
        subscriptions: { claude: "claude-pro", chatgpt: "api" },
        models,
      }),
    );
    const fableEntries = liveEntries.filter((entry) => entry.model === "claude-fable-5");
    expect(visible.some((row) => row.model === "claude-fable-5")).toBe(false);
    expect(visible).toHaveLength(liveEntries.length - fableEntries.length);
    expect(rows.length).toBeGreaterThan(visible.length);
  });

  test("an empty model selection shows nothing", () => {
    expect(leaderboard.visibleRows(filters({ models: new Set() }))).toHaveLength(0);
  });
});

describe("filter transitions", () => {
  const leaderboard = live();
  const initial = leaderboard.defaultFilters();

  test("toggleModel removes a selected model and re-adds an unselected one", () => {
    const without = toggleModel(initial, "claude-fable-5");
    expect(without.models.has("claude-fable-5")).toBe(false);
    expect(without.models.size).toBe(initial.models.size - 1);
    const again = toggleModel(without, "claude-fable-5");
    expect(again.models.has("claude-fable-5")).toBe(true);
    expect(again.models.size).toBe(initial.models.size);
  });

  test("transitions never mutate their input", () => {
    const before = new Set(initial.models);
    toggleModel(initial, "claude-fable-5");
    setModels(initial, new Set());
    setRoute(initial, "claude", "claude-pro");
    setEffortView(initial, "all");
    expect(initial.models).toEqual(before);
    expect(initial.subscriptions).toEqual({ claude: "api", chatgpt: "api" });
    expect(initial.effortView).toBe("best");
  });

  test("setRoute changes one family's route and leaves the other alone", () => {
    const picked = setRoute(
      setRoute(initial, "claude", "claude-max-5x"),
      "chatgpt",
      "chatgpt-plus",
    );
    expect(picked.subscriptions).toEqual({ claude: "claude-max-5x", chatgpt: "chatgpt-plus" });
    expect(setRoute(picked, "claude", "api").subscriptions).toEqual({
      claude: "api",
      chatgpt: "chatgpt-plus",
    });
  });

  test("setEffortView and setModels replace only their field", () => {
    const all = setEffortView(initial, "all");
    expect(all.effortView).toBe("all");
    expect(all.models).toBe(initial.models);
    const none = setModels(all, new Set());
    expect(none.models.size).toBe(0);
    expect(none.effortView).toBe("all");
  });
});

// The Models picker's vendor-reported toggle: off removes those models from
// the picker and the selection; on brings them back unselected.
describe("vendor-reported toggle", () => {
  const leaderboard = vendorReportedLeaderboard(opusNineClaim);
  const { modelOptions } = leaderboard;
  const listed = (filters: LeaderboardFilters) =>
    pickerModels(filters, modelOptions).map(({ model }) => model);
  const initial = leaderboard.defaultFilters();
  const off = setVendorReported(initial, false, modelOptions);

  test("is on by default, listing and selecting vendor-reported models", () => {
    expect(initial.vendorReported).toBe(true);
    expect(listed(initial)).toContain("claude-opus-9");
    expect(initial.models.has("claude-opus-9")).toBe(true);
  });

  test("off unlists and deselects vendor-reported models, leaving the rest", () => {
    expect(off.vendorReported).toBe(false);
    expect(listed(off)).not.toContain("claude-opus-9");
    expect(listed(off)).toHaveLength(modelOptions.length - 1);
    expect(off.models.has("claude-opus-9")).toBe(false);
    expect(off.models.size).toBe(initial.models.size - 1);
    expect(leaderboard.visibleRows(off).some((row) => row.model === "claude-opus-9")).toBe(false);
  });

  test("off keeps a DeepSWE model's deselection", () => {
    const fewer = setVendorReported(toggleModel(initial, "claude-fable-5"), false, modelOptions);
    expect(fewer.models.has("claude-fable-5")).toBe(false);
  });

  test("on again lists vendor-reported models without selecting them", () => {
    const on = setVendorReported(off, true, modelOptions);
    expect(on.vendorReported).toBe(true);
    expect(listed(on)).toContain("claude-opus-9");
    expect(on.models).toEqual(off.models);
  });

  test("select all over the listed models selects them once listed", () => {
    const selectAll = (filters: LeaderboardFilters) => setModels(filters, new Set(listed(filters)));
    expect(selectAll(off).models.has("claude-opus-9")).toBe(false);
    const on = setVendorReported(off, true, modelOptions);
    expect(selectAll(on).models.has("claude-opus-9")).toBe(true);
  });

  test("never mutates its input", () => {
    const before = new Set(initial.models);
    setVendorReported(initial, false, modelOptions);
    expect(initial.models).toEqual(before);
    expect(initial.vendorReported).toBe(true);
  });
});

describe("compareModel", () => {
  const row = (displayName: string, effort: string | undefined): LeaderboardRow => ({
    model: displayName.toLowerCase(),
    displayName,
    vendor: "Test",
    family: "none",
    effort,
    accessRoute: "api",
    isBestEntry: true,
    provenance: { kind: "deepswe" },
    passAt1: 0.5,
    cost: { api: 1, effective: 1 },
    costPerSolvedTask: { api: 2, effective: 2 },
    outputTokens: 100,
    steps: 10,
    throughputTokPerSec: 50,
    averageTimeSeconds: 2,
  });

  test("sorts by display name first", () => {
    const sorted = [row("B", undefined), row("A", "max")].toSorted(compareModel);
    expect(sorted.map((r) => r.displayName)).toEqual(["A", "B"]);
  });

  test("breaks ties by semantic effort order, default first", () => {
    const efforts = ["max", "high", undefined, "xhigh", "low", "medium"];
    const sorted = efforts.map((effort) => row("A", effort)).toSorted(compareModel);
    expect(sorted.map((r) => r.effort)).toEqual([
      undefined,
      "low",
      "medium",
      "high",
      "xhigh",
      "max",
    ]);
  });

  test("tiers.json lists each family's tiers in ascending price order", () => {
    // The Subscriptions picker lists tiers in file order and the spec says
    // "ascending price", so this guards the price invariant behind it.
    for (const family of ["claude", "chatgpt"]) {
      const prices = tiers
        .filter((tier) => tier.family === family)
        .map((tier) => tier.priceUsdPerMonth);
      expect(prices).toEqual(prices.toSorted((a, b) => a - b));
    }
  });
});
