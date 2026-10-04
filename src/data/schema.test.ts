import { describe, expect, test } from "vite-plus/test";

import rawSnapshot from "../../data/deepswe-v1.1.json" with { type: "json" };
import rawMapping from "../../data/model-mapping.json" with { type: "json" };
import rawThroughput from "../../data/openrouter-throughput.json" with { type: "json" };
import rawPriceRevisions from "../../data/price-revisions.json" with { type: "json" };
import rawTiers from "../../data/tiers.json" with { type: "json" };
import rawVendorMapping from "../../data/vendor-mapping.json" with { type: "json" };
import {
  assertMappingCoverage,
  familyVendors,
  deepsweSnapshotSchema,
  modelMappingSchema,
  priceRevisionsFileSchema,
  throughputSnapshotSchema,
  tiersSnapshotSchema,
  vendorMappingSchema,
} from "./schema.ts";
import { deepsweSnapshot, modelMapping } from "./sources.ts";

// The app parses the four files it imports at load; the refresh shells parse
// the other two. This is the one place every committed data file is parsed on
// every run (architecture ticket 04).
describe("every data file parses through its schema", () => {
  test.each([
    ["deepswe-v1.1.json", deepsweSnapshotSchema, rawSnapshot],
    ["model-mapping.json", modelMappingSchema, rawMapping],
    ["openrouter-throughput.json", throughputSnapshotSchema, rawThroughput],
    ["price-revisions.json", priceRevisionsFileSchema, rawPriceRevisions],
    ["tiers.json", tiersSnapshotSchema, rawTiers],
    ["vendor-mapping.json", vendorMappingSchema, rawVendorMapping],
  ])("%s", (_file, schema, raw) => {
    expect(() => schema.parse(raw)).not.toThrow();
  });
});

// Every file schema is strict with uniform value constraints: an unknown key
// is drift or a typo, never something to strip silently.
describe("file schemas are strict", () => {
  test("rejects an unknown key on a tier", () => {
    const tampered = { ...rawTiers, tiers: [{ ...rawTiers.tiers[0], colour: "orange" }] };
    expect(() => tiersSnapshotSchema.parse(tampered)).toThrowError(/colour/);
  });

  test("rejects a Pass@1 above 1", () => {
    const entry = { ...rawSnapshot.entries[0], effort: "tampered", pass_at_1: 1.5 };
    const tampered = { ...rawSnapshot, entries: [...rawSnapshot.entries, entry] };
    expect(() => deepsweSnapshotSchema.parse(tampered)).toThrowError(/pass_at_1/);
  });

  test("rejects an empty consumer provider slug", () => {
    const tampered = [...rawVendorMapping, { vendor: "Ghost", consumerProviderSlug: "" }];
    expect(() => vendorMappingSchema.parse(tampered)).toThrowError(/consumerProviderSlug/);
  });
});

// The rejections below pin the load-time invariants (ADR 0004).

describe("deepsweSnapshotSchema", () => {
  test("rejects a duplicate (model, effort) identity", () => {
    const tampered = {
      ...deepsweSnapshot,
      entries: [...deepsweSnapshot.entries, deepsweSnapshot.entries[0]],
    };
    expect(() => deepsweSnapshotSchema.parse(tampered)).toThrowError(/duplicate leaderboard entry/);
  });

  test("accepts the same model at a new effort", () => {
    const entry = { ...deepsweSnapshot.entries[0], effort: "brand-new-effort" };
    const grown = { ...deepsweSnapshot, entries: [...deepsweSnapshot.entries, entry] };
    expect(() => deepsweSnapshotSchema.parse(grown)).not.toThrow();
  });
});

describe("modelMappingSchema", () => {
  test("rejects a duplicate mapping key", () => {
    const tampered = [...modelMapping, { ...modelMapping[0] }];
    expect(() => modelMappingSchema.parse(tampered)).toThrowError(/duplicate mapping key/);
  });

  test("rejects an excluded tier that isn't in tiers.json", () => {
    const tampered = modelMapping.map((entry, i) =>
      i === 0 ? { ...entry, excludedTiers: ["claude-team"] } : entry,
    );
    expect(() => modelMappingSchema.parse(tampered)).toThrowError(/excludedTiers/);
  });
});

describe("assertMappingCoverage", () => {
  test("rejects a snapshot model missing from the mapping", () => {
    const [dropped, ...rest] = modelMapping;
    expect(() => assertMappingCoverage(deepsweSnapshot, rest)).toThrowError(
      dropped.leaderboardModel,
    );
  });

  test("rejects a mapping entry matching no snapshot model", () => {
    const orphaned = [...modelMapping, { ...modelMapping[0], leaderboardModel: "ghost-model" }];
    expect(() => assertMappingCoverage(deepsweSnapshot, orphaned)).toThrowError(/ghost-model/);
  });
});

describe("familyVendors", () => {
  test("returns each picker family's one vendor, Claude first", () => {
    expect(familyVendors(modelMapping)).toEqual({ claude: "Anthropic", chatgpt: "OpenAI" });
  });

  test("rejects a family with no mapping entry", () => {
    const mapping = modelMapping.filter((entry) => entry.family !== "chatgpt");
    expect(() => familyVendors(mapping)).toThrowError(/"chatgpt"/);
  });

  test("rejects a family whose entries span two vendors", () => {
    const first = modelMapping.find((entry) => entry.family === "claude");
    if (first === undefined) throw new Error("fixture needs a claude entry");
    const mapping = [
      ...modelMapping,
      { ...first, leaderboardModel: "ghost-model", vendor: "Ghost" },
    ];
    expect(() => familyVendors(mapping)).toThrowError(/spans vendors.*Ghost/);
  });
});
