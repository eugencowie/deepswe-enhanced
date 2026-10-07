import { describe, expect, it } from "vite-plus/test";
import type { ModelMappingEntry } from "../src/data/schema.ts";
import {
  type OpenrouterListing,
  generateMappingEntries,
  openrouterModelsSchema,
} from "./mapping-generation.ts";

function entry(
  leaderboardModel: string,
  vendor: string,
  openrouterId: string | null,
  family: ModelMappingEntry["family"] = "none",
): ModelMappingEntry {
  return {
    leaderboardModel,
    displayName: leaderboardModel,
    vendor,
    openrouterId,
    family,
  };
}

const mapping: ModelMappingEntry[] = [
  entry("glm-5-3", "Z.ai", "z-ai/glm-5.3"),
  entry("deepseek-v4-pro", "DeepSeek", "deepseek/deepseek-v4-pro-0813"),
  entry("grok-4-6", "xAI", "x-ai/grok-4.6"),
  entry("claude-opus-5", "Anthropic", "anthropic/claude-opus-5", "claude"),
];

const listings: OpenrouterListing[] = [
  { id: "z-ai/glm-5.3", name: "Z.ai: GLM 5.3" },
  { id: "z-ai/glm-5.3-flash", name: "Z.ai: GLM 5.3 Flash" },
  { id: "z-ai/glm-5.3-flash:free", name: "Z.ai: GLM 5.3 Flash (free)" },
  { id: "~z-ai/glm-latest", name: "GLM Latest" },
  { id: "x-ai/grok-4.7", name: "SpaceXAI: Grok 4.7" },
  { id: "deepseek/deepseek-v5", name: "DeepSeek: DeepSeek V5 0901" },
  { id: "deepseek/deepseek-v5-0901", name: "DeepSeek: DeepSeek V5 0901" },
  { id: "mistralai/mistral-large-3", name: "Mistral: Mistral Large 3" },
];

describe("generateMappingEntries", () => {
  it("generates a complete entry for a known-vendor exact match", () => {
    const { generated, warnings } = generateMappingEntries(["glm-5-3-flash"], mapping, listings);
    expect(warnings).toEqual([]);
    expect(generated).toEqual([
      {
        leaderboardModel: "glm-5-3-flash",
        displayName: "GLM 5.3 Flash",
        vendor: "Z.ai",
        openrouterId: "z-ai/glm-5.3-flash",
        family: "none",
      },
    ]);
  });

  it("takes vendor and family from the mapping, never from OpenRouter's vendor prefix", () => {
    const { generated } = generateMappingEntries(["grok-4-7"], mapping, listings);
    expect(generated).toEqual([
      expect.objectContaining({ vendor: "xAI", displayName: "Grok 4.7", family: "none" }),
    ]);
  });

  // A family takes a model only when a source says its tiers serve it (ADR 0011).
  it("generates family none, with a warning, for a vendor whose entries span families", () => {
    const moonshot = [
      entry("kimi-k3", "Moonshot", "moonshotai/kimi-k3", "kimi"),
      entry("kimi-k2-7-code", "Moonshot", "moonshotai/kimi-k2.7-code"),
    ];
    const kimiListing = [{ id: "moonshotai/kimi-k3.1", name: "MoonshotAI: Kimi K3.1" }];
    for (const order of [moonshot, moonshot.toReversed()]) {
      const { generated, warnings } = generateMappingEntries(["kimi-k3-1"], order, kimiListing);
      expect(generated).toEqual([
        expect.objectContaining({ vendor: "Moonshot", displayName: "Kimi K3.1", family: "none" }),
      ]);
      expect(warnings).toEqual([expect.stringMatching(/"kimi-k3-1".*span families/)]);
    }
  });

  it("nulls the id and strips the revision token when date-pinned listings exist", () => {
    const { generated, warnings } = generateMappingEntries(["deepseek-v5"], mapping, listings);
    expect(generated).toEqual([
      expect.objectContaining({
        leaderboardModel: "deepseek-v5",
        displayName: "DeepSeek V5",
        vendor: "DeepSeek",
        openrouterId: null,
      }),
    ]);
    expect(warnings).toEqual([expect.stringContaining("deepseek/deepseek-v5-0901")]);
  });

  it("ignores dated listings from other vendors when checking for siblings", () => {
    const otherOrgDated: OpenrouterListing[] = [
      { id: "z-ai/glm-6", name: "Z.ai: GLM 6" },
      { id: "x-ai/glm-6-0901", name: "SpaceXAI: GLM 6 0901" },
    ];
    const { generated, warnings } = generateMappingEntries(["glm-6"], mapping, otherOrgDated);
    expect(generated).toEqual([
      expect.objectContaining({ openrouterId: "z-ai/glm-6", displayName: "GLM 6" }),
    ]);
    expect(warnings).toEqual([]);
  });

  it("ignores variant and rolling-alias listings", () => {
    const variantOnly: OpenrouterListing[] = [
      { id: "z-ai/glm-9:free", name: "Z.ai: GLM 9 (free)" },
      { id: "~z-ai/glm-latest", name: "GLM Latest" },
    ];
    const { generated } = generateMappingEntries(["glm-9"], mapping, variantOnly);
    expect(generated).toEqual([]);
  });

  it("generates nothing for an unknown vendor, leaving the refresh guard to fail the run", () => {
    const { generated, warnings } = generateMappingEntries(["mistral-large-3"], mapping, listings);
    expect(generated).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it("nulls the id on an ambiguous same-vendor match", () => {
    const ambiguous: OpenrouterListing[] = [
      { id: "z-ai/glm-5.3-air", name: "Z.ai: GLM 5.3 Air" },
      { id: "z-ai/glm-5-3.air", name: "Z.ai: GLM 5-3.air" },
    ];
    const { generated, warnings } = generateMappingEntries(["glm-5-3-air"], mapping, ambiguous);
    expect(generated).toEqual([
      expect.objectContaining({ vendor: "Z.ai", openrouterId: null, displayName: "GLM 5.3 Air" }),
    ]);
    expect(warnings).toEqual([expect.stringContaining("Ambiguous")]);
  });

  it("generates nothing on a cross-vendor ambiguous match", () => {
    const crossVendor: OpenrouterListing[] = [
      { id: "z-ai/shared-model", name: "Z.ai: Shared Model" },
      { id: "x-ai/shared-model", name: "SpaceXAI: Shared Model" },
    ];
    const { generated, warnings } = generateMappingEntries(["shared-model"], mapping, crossVendor);
    expect(generated).toEqual([]);
    expect(warnings).toEqual([expect.stringContaining("across vendors")]);
  });
});

describe("openrouterModelsSchema", () => {
  it("parses the models endpoint shape", () => {
    const parsed = openrouterModelsSchema.parse({
      data: [{ id: "z-ai/glm-5.3", name: "Z.ai: GLM 5.3", context_length: 200000 }],
    });
    expect(parsed.data[0]).toEqual({ id: "z-ai/glm-5.3", name: "Z.ai: GLM 5.3" });
  });
});
