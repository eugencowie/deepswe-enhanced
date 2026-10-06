import { describe, expect, it } from "vite-plus/test";

import {
  type DeepsweSnapshot,
  type ModelMappingEntry,
  type VendorReportedEntry,
  type VendorReportedSnapshot,
  assertMappingCoverage,
  assertNoOverlap,
  modelMappingSchema,
  vendorReportedSnapshotSchema,
} from "../src/data/schema.ts";
import { deepsweSnapshot } from "../src/data/sources.ts";
import { supersedeVendorReported } from "./vendor-reported-supersession.ts";

function entry(leaderboardModel: string, openrouterId: string | null): ModelMappingEntry {
  return {
    leaderboardModel,
    displayName: leaderboardModel,
    vendor: "Test",
    openrouterId,
    family: "none",
    usageMultiplier: 1,
  };
}

function claim(model: string, effort: string): VendorReportedEntry {
  return {
    model,
    effort,
    pass_at_1: 0.7,
    source: `${model} launch post`,
    sourceUrl: "https://example.com/launch",
    publishedAt: "2026-09-30",
  };
}

// One DeepSWE model and three vendor-reported ones, each with a hand-written
// mapping entry; Opus 9 is claimed at two effort levels.
const mapping = [
  entry("claude-opus-5", "anthropic/claude-opus-5"),
  entry("claude-opus-9", "anthropic/claude-opus-9"),
  entry("gpt-9-sol", "openai/gpt-9-sol"),
  entry("grok-9", "x-ai/grok-9"),
];
const vendorReported: VendorReportedSnapshot = {
  benchmark_version: "v1.1",
  entries: [
    claim("claude-opus-9", "max"),
    claim("claude-opus-9", "high"),
    claim("gpt-9-sol", "high"),
    claim("gpt-9-sol", "max"),
    claim("grok-9", "high"),
  ],
};
const models = (snapshot: VendorReportedSnapshot) => [
  ...new Set(snapshot.entries.map((e) => e.model)),
];

describe("supersedeVendorReported", () => {
  it("supersedes a model DeepSWE publishes under our id, every effort level at once", () => {
    const result = supersedeVendorReported({
      publishedModels: new Set(["claude-opus-5", "claude-opus-9"]),
      vendorReported,
      mapping,
      generated: [],
    });
    expect(models(result.vendorReported)).toEqual(["gpt-9-sol", "grok-9"]);
    expect(result.standing).toEqual(["gpt-9-sol", "grok-9"]);
    expect(result.mapping).toEqual(mapping);
    expect(result.superseded).toEqual([{ model: "claude-opus-9", match: "id" }]);
  });

  // A wrong id guess: DeepSWE's real id gets a generated entry carrying our
  // OpenRouter id, which would otherwise duplicate it in the mapping.
  it("supersedes a model DeepSWE publishes under another id with our OpenRouter id", () => {
    const generatedEntry = entry("gpt-9-sol-2026-10", "openai/gpt-9-sol");
    const result = supersedeVendorReported({
      publishedModels: new Set(["claude-opus-5", "gpt-9-sol-2026-10"]),
      vendorReported,
      mapping,
      generated: [generatedEntry],
    });
    expect(models(result.vendorReported)).toEqual(["claude-opus-9", "grok-9"]);
    expect(result.mapping.map((e) => e.leaderboardModel)).toEqual([
      "claude-opus-5",
      "claude-opus-9",
      "grok-9",
      "gpt-9-sol-2026-10",
    ]);
    expect(result.superseded).toEqual([
      { model: "gpt-9-sol", match: "openrouter-id", publishedAs: "gpt-9-sol-2026-10" },
    ]);
  });

  it("leaves a model standing when the generated entry has no OpenRouter id", () => {
    const generatedEntry = entry("gpt-9-sol-2026-10", null);
    const result = supersedeVendorReported({
      publishedModels: new Set(["claude-opus-5", "gpt-9-sol-2026-10"]),
      vendorReported,
      mapping,
      generated: [generatedEntry],
    });
    expect(result.vendorReported).toEqual(vendorReported);
    expect(result.mapping).toEqual([...mapping, generatedEntry]);
    expect(result.superseded).toEqual([]);
  });

  it("leaves every model standing when DeepSWE publishes none of them", () => {
    const result = supersedeVendorReported({
      publishedModels: new Set(["claude-opus-5"]),
      vendorReported,
      mapping,
      generated: [],
    });
    expect(result).toEqual({
      vendorReported,
      mapping,
      superseded: [],
      standing: ["claude-opus-9", "gpt-9-sol", "grok-9"],
    });
  });
});

// The refresh writes what supersession returns, so it must load (ADR 0004):
// a healthy Refresh PR never trips the checks.
describe("supersedeVendorReported output passes the load-time checks", () => {
  const snapshotOf = (published: string[]): DeepsweSnapshot => ({
    ...deepsweSnapshot,
    entries: published.map((model) => ({ ...deepsweSnapshot.entries[0]!, model })),
  });
  const cases: [string, string[], ModelMappingEntry[]][] = [
    ["an id match", ["claude-opus-5", "claude-opus-9"], []],
    [
      "an OpenRouter id match",
      ["claude-opus-5", "gpt-9-sol-2026-10"],
      [entry("gpt-9-sol-2026-10", "openai/gpt-9-sol")],
    ],
    [
      "a null generated id",
      ["claude-opus-5", "gpt-9-sol-2026-10"],
      [entry("gpt-9-sol-2026-10", null)],
    ],
    ["no published claim", ["claude-opus-5"], []],
  ];

  it.each(cases)("after %s", (_case, published, generated) => {
    const result = supersedeVendorReported({
      publishedModels: new Set(published),
      vendorReported,
      mapping,
      generated,
    });
    const snapshot = snapshotOf(published);
    expect(() => modelMappingSchema.parse(result.mapping)).not.toThrow();
    expect(() => vendorReportedSnapshotSchema.parse(result.vendorReported)).not.toThrow();
    expect(() => assertNoOverlap(snapshot, result.vendorReported)).not.toThrow();
    expect(() =>
      assertMappingCoverage(snapshot, result.vendorReported, result.mapping),
    ).not.toThrow();
  });

  it("is needed: without it an OpenRouter id match fails the mapping's own schema", () => {
    const generatedEntry = entry("gpt-9-sol-2026-10", "openai/gpt-9-sol");
    expect(() => modelMappingSchema.parse([...mapping, generatedEntry])).toThrowError(
      /duplicate OpenRouter id: openai\/gpt-9-sol/,
    );
  });
});
