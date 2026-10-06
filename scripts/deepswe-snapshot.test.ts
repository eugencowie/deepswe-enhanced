import { describe, expect, it } from "vite-plus/test";
import rawPriceRevisions from "../data/price-revisions.json" with { type: "json" };
import rawSnapshot from "../data/deepswe-v1.1.json" with { type: "json" };
import {
  type ModelMappingEntry,
  type PriceRevision,
  priceRevisionsFileSchema,
} from "../src/data/schema.ts";
import {
  type LeaderboardArtifact,
  type VersionManifest,
  hasMeaningfulChange,
  summarizeRefresh,
  leaderboardArtifactSchema,
  normalize,
} from "./deepswe-snapshot.ts";
import type { SupersessionResult } from "./vendor-reported-supersession.ts";

const manifest: VersionManifest = {
  latest: "v1.1",
  versions: [
    { id: "v1.1", data_path: "v1.1", n_tasks: 113, status: "stable" },
    { id: "v1", data_path: "v1", n_tasks: 113, status: "frozen" },
  ],
};

// Fixture table, not the real one: the checked-in revisions live in
// data/price-revisions.json and only their shape is asserted here. Uniform
// 0.25, so every luna entry gets factor 0.25 whatever its token mix.
const revisions: Readonly<Record<string, PriceRevision>> = {
  "gpt-5-6-luna": {
    from: { input: 4, cached: 0.4, output: 24 },
    to: { input: 1, cached: 0.1, output: 6 },
  },
};

function row(model: string, overrides: Partial<LeaderboardArtifact["rows"][number]> = {}) {
  return {
    model,
    reasoning_effort: null,
    config: `mini_swe_agent_${model}`,
    pass_at_1: 0.5,
    mean_cost_usd: 2,
    mean_input_tokens: 3_000_000,
    mean_cache_tokens: 2_500_000,
    mean_output_tokens: 50_000,
    mean_agent_steps: 60,
    n_attempted: 452,
    ...overrides,
  };
}

function artifact(rows: LeaderboardArtifact["rows"]): LeaderboardArtifact {
  return {
    scope: "scope",
    unit: "unit",
    generated_at: "2026-08-20T07:48:24.252395+00:00",
    n_tasks_in_set: 113,
    latest_job: { name: "job", finished_at: "2026-08-20T07:35:00" },
    rows,
  };
}

function mappingFor(models: string[]): ModelMappingEntry[] {
  return models.map((model) => ({
    leaderboardModel: model,
    displayName: model,
    vendor: "Vendor",
    openrouterId: null,
    family: "none",
    usageMultiplier: 1,
  }));
}

// The supersession result summarizeRefresh reads: a mapping of the given size
// after this run, and nothing superseded or standing unless a test says so.
const supersession = (
  mappingAfter: number,
  overrides: Partial<Pick<SupersessionResult, "superseded" | "standing">> = {},
) => ({
  mapping: mappingFor(Array.from({ length: mappingAfter }, (_, i) => `model-${i}`)),
  superseded: [],
  standing: [],
  ...overrides,
});

// Includes the fixture factor's model so the happy path has no stale-factor
// warnings.
const allModels = ["claude-opus-5", "gpt-5-6-luna"];

describe("normalize", () => {
  it("produces a pinned, warning-free snapshot from a clean artifact", () => {
    const { snapshot, warnings } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model))),
      mappingFor(allModels),
      revisions,
      "abc123",
      new Set(),
    );
    expect(warnings).toEqual([]);
    expect(snapshot.benchmark_version).toBe("v1.1");
    expect(snapshot.source).toBe("DeepSWE leaderboard");
    expect(snapshot.sourceUrl).toBe("https://deepswe.datacurve.ai");
    expect(snapshot.source_url).toBe(
      "https://deepswe.datacurve.ai/artifacts/v1.1/leaderboard-live.json",
    );
    expect(snapshot.raw_sha256).toBe("abc123");
    expect(snapshot.entries).toHaveLength(2);
  });

  it("applies the given price revisions per entry and keeps raw values beside adjusted ones", () => {
    const { snapshot } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model, { mean_cost_usd: 2 }))),
      mappingFor(allModels),
      revisions,
      "abc123",
      new Set(),
    );
    const byModel = new Map(snapshot.entries.map((entry) => [entry.model, entry]));
    expect(byModel.get("gpt-5-6-luna")).toMatchObject({
      average_cost_usd: 0.5,
      raw_average_cost_usd: 2,
      cost_adjustment_factor: 0.25,
      input_tokens: 3_000_000,
      cached_tokens: 2_500_000,
    });
    expect(byModel.get("claude-opus-5")).toMatchObject({
      average_cost_usd: 2,
      raw_average_cost_usd: 2,
      cost_adjustment_factor: 1,
    });
    expect(snapshot.schema_version).toBe(2);
    expect(snapshot.price_revisions).toEqual(revisions);
  });

  // Ticket 10's worked example: a non-uniform revision yields a factor that
  // depends on the entry's token mix, matching the site's rendered $1.67.
  it("derives a token-mix factor for a non-uniform revision (deepseek-v4-pro max)", () => {
    const revisions: Record<string, PriceRevision> = {
      "deepseek-v4-pro": {
        from: { input: 0.435, cached: 0.003625, output: 0.87 },
        to: { input: 1.32, cached: 0.044, output: 3.96 },
      },
    };
    const source = artifact([
      row("deepseek-v4-pro", {
        reasoning_effort: "max",
        mean_cost_usd: 0.24138687892256638,
        mean_input_tokens: 24191606.099557523,
        mean_cache_tokens: 24049100.743362833,
        mean_output_tokens: 105998.91814159292,
      }),
    ]);
    const { snapshot } = normalize(
      manifest,
      source,
      mappingFor(["deepseek-v4-pro"]),
      revisions,
      "abc123",
      new Set(),
    );
    expect(snapshot.entries[0]).toMatchObject({
      cost_adjustment_factor: 6.901879779721177,
      average_cost_usd: 1.6660232187256647,
    });
  });

  it("rejects a row without mean input or cached token counts", () => {
    const { mean_input_tokens: _input, ...source } = row("claude-opus-5");
    expect(() => leaderboardArtifactSchema.parse(artifact([source as never]))).toThrow();
  });

  it("warns without switching when the manifest's latest moves past the pin", () => {
    const { snapshot, warnings } = normalize(
      { ...manifest, latest: "v1.2" },
      artifact(allModels.map((model) => row(model))),
      mappingFor(allModels),
      revisions,
      "abc123",
      new Set(),
    );
    expect(warnings).toEqual([expect.stringContaining("New DeepSWE version available: v1.2")]);
    expect(snapshot.benchmark_version).toBe("v1.1");
    expect(snapshot.source_url).toContain("/v1.1/");
  });

  it("fails when a fetched model is missing from the mapping, naming the model", () => {
    expect(() =>
      normalize(
        manifest,
        artifact([...allModels.map((model) => row(model)), row("new-model")]),
        mappingFor(allModels),
        revisions,
        "abc123",
        new Set(),
      ),
    ).toThrow(/new-model.*model-mapping\.json|model-mapping\.json.*new-model/);
  });

  it("warns when a mapping entry has no leaderboard rows", () => {
    const { warnings } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model))),
      mappingFor([...allModels, "retired-model"]),
      revisions,
      "abc123",
      new Set(),
    );
    expect(warnings).toEqual([expect.stringContaining("retired-model")]);
  });

  // A vendor-reported model's mapping entry has no DeepSWE rows by
  // definition: DeepSWE hasn't published it yet (ADR 0009).
  it("doesn't warn about a vendor-reported model's mapping entry", () => {
    const { warnings } = normalize(
      manifest,
      artifact(allModels.map((model) => row(model))),
      mappingFor([...allModels, "claude-opus-5-5"]),
      revisions,
      "abc123",
      new Set(["claude-opus-5-5"]),
    );
    expect(warnings).toEqual([]);
  });

  it("warns when a price revision has no leaderboard rows", () => {
    const { warnings } = normalize(
      manifest,
      artifact([row("claude-opus-5")]),
      mappingFor(["claude-opus-5"]),
      revisions,
      "abc123",
      new Set(),
    );
    expect(warnings).toEqual([
      expect.stringContaining("Price revisions with no leaderboard rows: gpt-5-6-luna"),
    ]);
  });

  it("rejects duplicate configurations", () => {
    const duplicated = [row("claude-opus-5"), row("claude-opus-5", { pass_at_1: 0.6 })];
    expect(() =>
      normalize(
        manifest,
        artifact(duplicated),
        mappingFor(allModels),
        revisions,
        "abc123",
        new Set(),
      ),
    ).toThrow(/Duplicate configuration "mini_swe_agent_claude-opus-5"/);
  });

  // DeepSWE shows rows while the latest job is still running (finished_at
  // null), so the snapshot accepts them too (automated-refresh ticket 05).
  it("accepts a null latest_job finish time", () => {
    const source = {
      ...artifact([row("claude-opus-5")]),
      latest_job: { name: "job", finished_at: null },
    };
    expect(leaderboardArtifactSchema.parse(source).latest_job.finished_at).toBeNull();
    const { snapshot } = normalize(
      manifest,
      source,
      mappingFor(allModels),
      revisions,
      "abc123",
      new Set(),
    );
    expect(snapshot.source_latest_job).toEqual({ name: "job", finished_at: null });
  });

  it("rejects an absent latest_job", () => {
    const { latest_job: _job, ...source } = artifact([row("claude-opus-5")]);
    expect(() => leaderboardArtifactSchema.parse(source)).toThrow();
    expect(() => leaderboardArtifactSchema.parse({ ...source, latest_job: null })).toThrow();
  });

  it("rejects a task-count disagreement between manifest and artifact", () => {
    const disagreeing = { ...artifact(allModels.map((model) => row(model))), n_tasks_in_set: 99 };
    expect(() =>
      normalize(manifest, disagreeing, mappingFor(allModels), revisions, "abc123", new Set()),
    ).toThrow(/113.*99/);
  });
});

describe("price revisions file", () => {
  it("matches the schema the refresh script loads it with", () => {
    const parsed = priceRevisionsFileSchema.parse(rawPriceRevisions);
    expect(Object.keys(parsed.revisions).length).toBeGreaterThan(0);
  });

  // Drift guard: the checked-in snapshot records the revisions it was built
  // with; if a revision edit isn't followed by a refresh (or vice versa), the
  // two files disagree and this catches it.
  it("agrees with the checked-in snapshot's recorded table", () => {
    expect(rawSnapshot.price_revisions).toEqual(
      priceRevisionsFileSchema.parse(rawPriceRevisions).revisions,
    );
  });
});

describe("hasMeaningfulChange", () => {
  const snapshotFrom = (rows: LeaderboardArtifact["rows"], sha: string, generatedAt?: string) => {
    const source = artifact(rows);
    if (generatedAt) source.generated_at = generatedAt;
    return normalize(manifest, source, mappingFor(allModels), revisions, sha, new Set()).snapshot;
  };
  const rows = allModels.map((model) => row(model));

  it("ignores raw_sha256 and source_generated_at churn", () => {
    const existing = snapshotFrom(rows, "abc123");
    const next = snapshotFrom(rows, "def456", "2026-08-21T00:00:00.000000+00:00");
    expect(hasMeaningfulChange(existing, next)).toBe(false);
  });

  it("reports identical snapshots as unchanged", () => {
    expect(hasMeaningfulChange(snapshotFrom(rows, "abc123"), snapshotFrom(rows, "abc123"))).toBe(
      false,
    );
  });

  it("ignores key order, which the file schema's parse does not preserve", () => {
    const existing = snapshotFrom(rows, "abc123");
    const next = snapshotFrom(rows, "abc123");
    const reordered = {
      ...next,
      entries: next.entries.map(({ model, ...rest }) => ({ ...rest, model })),
    };
    expect(hasMeaningfulChange(existing, reordered)).toBe(false);
  });

  it("ignores a job-only change (name or finish time)", () => {
    const existing = snapshotFrom(rows, "abc123");
    const source = artifact(rows);
    source.latest_job = { name: "newer-job", finished_at: null };
    const next = normalize(
      manifest,
      source,
      mappingFor(allModels),
      revisions,
      "def456",
      new Set(),
    ).snapshot;
    expect(hasMeaningfulChange(existing, next)).toBe(false);
  });

  it("detects an entry change even when hash and timestamp also moved", () => {
    const existing = snapshotFrom(rows, "abc123");
    const changed = allModels.map((model) =>
      row(model, model === "claude-opus-5" ? { pass_at_1: 0.6 } : {}),
    );
    const next = snapshotFrom(changed, "def456", "2026-08-21T00:00:00.000000+00:00");
    expect(hasMeaningfulChange(existing, next)).toBe(true);
  });
});

describe("summarizeRefresh", () => {
  const snapshotFrom = (rows: LeaderboardArtifact["rows"]) =>
    normalize(manifest, artifact(rows), mappingFor(allModels), revisions, "abc123", new Set())
      .snapshot;
  const rows = allModels.map((model) => row(model));
  const generatedEntry = mappingFor(["new-model"])[0]!;

  it("names its source in the heading so it can share a PR body", () => {
    const text = summarizeRefresh({
      existing: null,
      snapshot: snapshotFrom(rows),
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25),
    });
    expect(text.startsWith("### DeepSWE data summary")).toBe(true);
  });

  it("tabulates before/after counts, with a dash on first run", () => {
    const snapshot = snapshotFrom(rows);
    const first = summarizeRefresh({
      existing: null,
      snapshot,
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25),
    });
    expect(first).toContain(`| Leaderboard entries | — | ${snapshot.entries.length} |`);
    expect(first).toContain(`| Models | — | ${allModels.length} |`);
    expect(first).toContain("| Mapping entries | 25 | 25 |");

    const later = summarizeRefresh({
      existing: snapshot,
      snapshot,
      previousMappingCount: 25,
      generated: [generatedEntry],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(26),
    });
    expect(later).toContain(
      `| Leaderboard entries | ${snapshot.entries.length} | ${snapshot.entries.length} |`,
    );
    expect(later).toContain("| Mapping entries | 25 | 26 |");
    expect(later).toContain("Generated mapping entries: new-model.");
  });

  it("lists changed price revisions with old and new rates and the entries they moved", () => {
    const snapshot = snapshotFrom(rows);
    const before = normalize(
      manifest,
      artifact(rows),
      mappingFor(allModels),
      {},
      "abc123",
      new Set(),
    ).snapshot;
    const text = summarizeRefresh({
      existing: before,
      snapshot,
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: {},
      supersession: supersession(25),
    });
    expect(text).toContain("Price revisions");
    expect(text).toContain("| gpt-5-6-luna | — | 4 / 0.4 / 24 → 1 / 0.1 / 6 |");
    expect(text).toContain("gpt-5-6-luna [default]: $2.00 → $0.50");
  });

  // Ticket 10's acceptance case: the file lost a model but the snapshot still
  // carries it, so the table names the model and no entry moved.
  it("diffs the table against the file, not the previous snapshot", () => {
    const snapshot = snapshotFrom(rows);
    const text = summarizeRefresh({
      existing: snapshot,
      snapshot,
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: {},
      supersession: supersession(25),
    });
    expect(text).toContain("| gpt-5-6-luna | — | 4 / 0.4 / 24 → 1 / 0.1 / 6 |");
    expect(text).not.toContain("Entries whose average cost moved");
  });

  it("says nothing about price revisions when the table is unchanged", () => {
    const snapshot = snapshotFrom(rows);
    const text = summarizeRefresh({
      existing: snapshot,
      snapshot,
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25),
    });
    expect(text).not.toContain("Price revisions");
  });

  it("states a no-op week explicitly", () => {
    const snapshot = snapshotFrom(rows);
    const text = summarizeRefresh({
      existing: snapshot,
      snapshot,
      previousMappingCount: 25,
      generated: [],
      changed: false,
      previousPriceRevisions: revisions,
      supersession: supersession(25),
    });
    expect(text).toContain("No content change");
    expect(
      summarizeRefresh({
        existing: snapshot,
        snapshot,
        previousMappingCount: 25,
        generated: [],
        changed: true,
        previousPriceRevisions: revisions,
        supersession: supersession(25),
      }),
    ).not.toContain("No content change");
  });

  // Vendor-reported models DeepSWE has now published (ADR 0009). Opus 9 kept
  // our id; GPT-9 Sol arrived under another, matched by OpenRouter id, so its
  // hand-written mapping entry gave way to the generated one.
  const withModels = (models: string[]) =>
    normalize(
      manifest,
      artifact([...rows, ...models.map((model) => row(model))]),
      mappingFor([...allModels, ...models]),
      revisions,
      "abc123",
      new Set(),
    ).snapshot;

  it("lists superseded vendor-reported models with the match that superseded each", () => {
    const text = summarizeRefresh({
      existing: snapshotFrom(rows),
      snapshot: withModels(["claude-opus-9", "gpt-9-sol-2026-10"]),
      previousMappingCount: 25,
      generated: mappingFor(["gpt-9-sol-2026-10"]),
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25, {
        superseded: [
          { model: "claude-opus-9", match: "id" },
          { model: "gpt-9-sol", match: "openrouter-id", publishedAs: "gpt-9-sol-2026-10" },
        ],
      }),
    });
    expect(text).toContain(
      "Superseded vendor-reported models: claude-opus-9 (published under the same id), " +
        "gpt-9-sol (published as gpt-9-sol-2026-10, same OpenRouter id).",
    );
    expect(text).toContain("| Mapping entries | 25 | 25 |");
  });

  it("lists new DeepSWE models beside the vendor-reported models still standing", () => {
    const text = summarizeRefresh({
      existing: snapshotFrom(rows),
      snapshot: withModels(["gpt-9-sol-2026-10"]),
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25, { standing: ["gpt-9-sol", "grok-9"] }),
    });
    expect(text).toContain(
      "New DeepSWE models: gpt-9-sol-2026-10. Vendor-reported models still standing: " +
        "gpt-9-sol, grok-9. Check none of them is one model under two ids.",
    );
  });

  it("on a first run lists every DeepSWE model beside the vendor-reported models still standing", () => {
    const text = summarizeRefresh({
      existing: null,
      snapshot: withModels(["gpt-9-sol-2026-10"]),
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
      supersession: supersession(25, { standing: ["gpt-9-sol"] }),
    });
    expect(text).toContain(
      `New DeepSWE models: ${[...allModels, "gpt-9-sol-2026-10"].join(", ")}.`,
    );
  });

  it("says nothing about vendor-reported models when nothing could collide", () => {
    const base = {
      existing: snapshotFrom(rows),
      previousMappingCount: 25,
      generated: [],
      changed: true,
      previousPriceRevisions: revisions,
    };
    const noNewModels = summarizeRefresh({
      ...base,
      snapshot: snapshotFrom(rows),
      supersession: supersession(25, { standing: ["grok-9"] }),
    });
    const noneStanding = summarizeRefresh({
      ...base,
      snapshot: withModels(["new-model"]),
      supersession: supersession(25),
    });
    for (const text of [noNewModels, noneStanding]) expect(text).not.toMatch(/[Vv]endor-reported/);
  });
});
