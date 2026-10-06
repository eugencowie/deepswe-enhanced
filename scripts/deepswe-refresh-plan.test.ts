import { describe, expect, it } from "vite-plus/test";
import {
  type ModelMappingEntry,
  type VendorReportedEntry,
  assertMappingCoverage,
  assertNoOverlap,
  deepsweSnapshotSchema,
  modelMappingSchema,
  vendorReportedSnapshotSchema,
} from "../src/data/schema.ts";
import type { LeaderboardArtifact, VersionManifest } from "./deepswe-snapshot.ts";
import { planDeepsweRefresh } from "./deepswe-refresh-plan.ts";

const manifest: VersionManifest = {
  latest: "v1.1",
  versions: [{ id: "v1.1", data_path: "v1.1", n_tasks: 113, status: "stable" }],
};

function row(model: string): LeaderboardArtifact["rows"][number] {
  return {
    model,
    reasoning_effort: "max",
    config: `mini_swe_agent_${model}`,
    pass_at_1: 0.5,
    mean_cost_usd: 2,
    mean_input_tokens: 3_000_000,
    mean_cache_tokens: 2_500_000,
    mean_output_tokens: 50_000,
    mean_agent_steps: 60,
    n_attempted: 452,
  };
}

function artifact(models: string[]): LeaderboardArtifact {
  return {
    scope: "scope",
    unit: "unit",
    generated_at: "2026-10-06T07:48:24.252395+00:00",
    n_tasks_in_set: 113,
    latest_job: { name: "job", finished_at: "2026-10-06T07:35:00" },
    rows: models.map(row),
  };
}

const mappingEntry = (model: string, openrouterId: string): ModelMappingEntry => ({
  leaderboardModel: model,
  displayName: model,
  vendor: "OpenAI",
  openrouterId,
  family: "chatgpt",
  usageMultiplier: 1,
});

const claim = (model: string): VendorReportedEntry => ({
  model,
  effort: "max",
  pass_at_1: 0.7,
  source: `${model} launch post`,
  sourceUrl: `https://openai.com/${model}`,
  publishedAt: "2026-09-29",
});

// One DeepSWE model and two vendor-reported ones, as checked in before the
// run: the files pass every load-time check. GPT-9 Luna's id is a wrong guess
// at DeepSWE's: its OpenRouter id is right, so the refresh still catches it.
const mapping = [
  mappingEntry("gpt-6-astra", "openai/gpt-6-astra"),
  mappingEntry("gpt-9-sol", "openai/gpt-9-sol"),
  mappingEntry("gpt9-luna", "openai/gpt-9-luna"),
];
const vendorReported = vendorReportedSnapshotSchema.parse({
  benchmark_version: "v1.1",
  entries: [claim("gpt-9-sol"), claim("gpt9-luna")],
});
const lunaListing = { id: "openai/gpt-9-luna", name: "OpenAI: GPT-9 Luna" };

const plan = (
  models: string[],
  listings: { id: string; name: string }[] = [],
  checkedIn: ModelMappingEntry[] = mapping,
) =>
  planDeepsweRefresh({
    manifest,
    artifact: artifact(models),
    rawSha256: "abc123",
    mapping: checkedIn,
    vendorReported,
    revisions: {},
    listings,
  });

// What the site checks when it loads the files the refresh would write
// (ADR 0004): a healthy Refresh PR is green.
function expectLoads({ snapshot, supersession }: ReturnType<typeof plan>) {
  const files = {
    snapshot: deepsweSnapshotSchema.parse(snapshot),
    vendorReported: vendorReportedSnapshotSchema.parse(supersession.vendorReported),
    mapping: modelMappingSchema.parse(supersession.mapping),
  };
  expect(() => assertNoOverlap(files.snapshot, files.vendorReported)).not.toThrow();
  expect(() =>
    assertMappingCoverage(files.snapshot, files.vendorReported, files.mapping),
  ).not.toThrow();
}

describe("planDeepsweRefresh", () => {
  it("publishing a vendor-reported model under its id yields files that load", () => {
    const result = plan(["gpt-6-astra", "gpt-9-sol"]);
    // Without supersession the model would sit in both files.
    expect(() => assertNoOverlap(result.snapshot, vendorReported)).toThrow();
    expectLoads(result);
    expect(result.supersession.superseded).toEqual([{ model: "gpt-9-sol", match: "id" }]);
    expect(result.supersession.standing).toEqual(["gpt9-luna"]);
  });

  it("publishing one under another id, matched by OpenRouter id, yields files that load", () => {
    const result = plan(["gpt-6-astra", "gpt-9-luna"], [lunaListing]);
    // Without supersession the generated entry would repeat our OpenRouter id.
    expect(() => modelMappingSchema.parse([...mapping, ...result.generated])).toThrow(
      "duplicate OpenRouter id: openai/gpt-9-luna",
    );
    expectLoads(result);
    expect(result.supersession.superseded).toEqual([
      { model: "gpt9-luna", match: "openrouter-id", publishedAs: "gpt-9-luna" },
    ]);
  });

  it("leaves the files alone when DeepSWE publishes no vendor-reported model", () => {
    const result = plan(["gpt-6-astra"]);
    expect(result.generated).toEqual([]);
    expect(result.supersession.vendorReported).toEqual(vendorReported);
    expect(result.supersession.mapping).toEqual(mapping);
    expectLoads(result);
  });

  // GPT-6 Astra was mapped under a dated id; DeepSWE now also publishes the
  // undated one, whose generated entry claims the same listing.
  it("fails, before anything is written, when a generated entry collides with an ordinary one", () => {
    const dated = [mappingEntry("gpt-6-astra-0901", "openai/gpt-6-astra"), ...mapping.slice(1)];
    const astraListing = { id: "openai/gpt-6-astra", name: "OpenAI: GPT-6 Astra" };
    expect(() => plan(["gpt-6-astra-0901", "gpt-6-astra"], [astraListing], dated)).toThrow(
      "duplicate OpenRouter id: openai/gpt-6-astra",
    );
  });
});
