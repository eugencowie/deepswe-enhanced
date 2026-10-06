import { describe, expect, test } from "vite-plus/test";

import rawSnapshot from "../../data/deepswe-v1.1.json" with { type: "json" };
import rawMapping from "../../data/model-mapping.json" with { type: "json" };
import rawThroughput from "../../data/openrouter-throughput.json" with { type: "json" };
import rawPriceRevisions from "../../data/price-revisions.json" with { type: "json" };
import rawTiers from "../../data/tiers.json" with { type: "json" };
import rawVendorMapping from "../../data/vendor-mapping.json" with { type: "json" };
import rawVendorReported from "../../data/vendor-reported.json" with { type: "json" };
import {
  assertMappingCoverage,
  assertNoOverlap,
  familyVendors,
  deepsweSnapshotSchema,
  modelMappingSchema,
  priceRevisionsFileSchema,
  throughputSnapshotSchema,
  tiersSnapshotSchema,
  vendorMappingSchema,
  vendorReportedSnapshotSchema,
} from "./schema.ts";
import { deepsweSnapshot, modelMapping, vendorReportedSnapshot } from "./sources.ts";

// The app parses the five files it imports at load; the refresh shells parse
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
    ["vendor-reported.json", vendorReportedSnapshotSchema, rawVendorReported],
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

// A Pass@1-only claim, the shape nearly every vendor publishes.
const vendorEntry = {
  model: "claude-opus-9",
  effort: "max",
  pass_at_1: 0.742,
  source: "Claude Opus 9 System Card §8.3",
  sourceUrl: "https://www.anthropic.com/claude-opus-9",
  publishedAt: "2026-09-22",
};
const vendorReported = (...entries: object[]) => ({ benchmark_version: "v1.1", entries });

describe("vendorReportedSnapshotSchema", () => {
  test("accepts a Pass@1-only entry", () => {
    expect(() => vendorReportedSnapshotSchema.parse(vendorReported(vendorEntry))).not.toThrow();
  });

  test("rejects a null effort", () => {
    const tampered = vendorReported({ ...vendorEntry, effort: null });
    expect(() => vendorReportedSnapshotSchema.parse(tampered)).toThrowError(/effort/);
  });

  test("rejects an unknown key", () => {
    const tampered = vendorReported({ ...vendorEntry, colour: "purple" });
    expect(() => vendorReportedSnapshotSchema.parse(tampered)).toThrowError(/colour/);
  });

  // The popover shows the date as written, so it must read as one.
  test("rejects a publication date that isn't an ISO date", () => {
    const tampered = vendorReported({ ...vendorEntry, publishedAt: "22 September 2026" });
    expect(() => vendorReportedSnapshotSchema.parse(tampered)).toThrowError(/publishedAt/);
  });

  test("rejects a duplicate (model, effort) identity", () => {
    const tampered = vendorReported(vendorEntry, { ...vendorEntry, pass_at_1: 0.75 });
    expect(() => vendorReportedSnapshotSchema.parse(tampered)).toThrowError(
      /duplicate vendor-reported entry: claude-opus-9 @ max/,
    );
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

  // Catches a wrong guess at a vendor-reported model's id: DeepSWE's real id
  // gets a generated entry with the same OpenRouter id as ours (ADR 0009).
  test("rejects two entries sharing an OpenRouter id", () => {
    const [first] = modelMapping;
    const tampered = [...modelMapping, { ...first, leaderboardModel: "ghost-model" }];
    expect(() => modelMappingSchema.parse(tampered)).toThrowError(
      `duplicate OpenRouter id: ${first.openrouterId}`,
    );
  });

  test("accepts two entries with no OpenRouter id", () => {
    const [first] = modelMapping;
    const grown = [
      ...modelMapping,
      { ...first, leaderboardModel: "ghost-a", openrouterId: null },
      { ...first, leaderboardModel: "ghost-b", openrouterId: null },
    ];
    expect(() => modelMappingSchema.parse(grown)).not.toThrow();
  });
});

describe("assertMappingCoverage", () => {
  // The live files plus one claim, so each test trips only the rule it names.
  const opusNine = vendorReportedSnapshotSchema.parse(
    vendorReported(...vendorReportedSnapshot.entries, vendorEntry),
  );
  const opusNineMapping = {
    ...modelMapping[0],
    leaderboardModel: "claude-opus-9",
    displayName: "Claude Opus 9",
    openrouterId: "anthropic/claude-opus-9",
  };

  test("rejects a snapshot model missing from the mapping", () => {
    const [dropped, ...rest] = modelMapping;
    expect(() => assertMappingCoverage(deepsweSnapshot, vendorReportedSnapshot, rest)).toThrowError(
      dropped.leaderboardModel,
    );
  });

  test("rejects a mapping entry matching no model in either file", () => {
    const orphaned = [...modelMapping, { ...modelMapping[0], leaderboardModel: "ghost-model" }];
    expect(() =>
      assertMappingCoverage(deepsweSnapshot, vendorReportedSnapshot, orphaned),
    ).toThrowError(/ghost-model/);
  });

  test("rejects a vendor-reported model missing from the mapping", () => {
    expect(() => assertMappingCoverage(deepsweSnapshot, opusNine, modelMapping)).toThrowError(
      /claude-opus-9/,
    );
  });

  test("accepts a mapping entry matching only a vendor-reported model", () => {
    const mapping = [...modelMapping, opusNineMapping];
    expect(() => assertMappingCoverage(deepsweSnapshot, opusNine, mapping)).not.toThrow();
  });
});

describe("assertNoOverlap", () => {
  test("rejects a model in both the DeepSWE snapshot and the vendor-reported entries", () => {
    const published = { ...vendorEntry, model: deepsweSnapshot.entries[0].model };
    const tampered = vendorReportedSnapshotSchema.parse(vendorReported(published));
    expect(() => assertNoOverlap(deepsweSnapshot, tampered)).toThrowError(
      `vendor-reported models DeepSWE has published: ${published.model}`,
    );
  });

  test("accepts a vendor-reported model DeepSWE hasn't published", () => {
    const unpublished = vendorReportedSnapshotSchema.parse(vendorReported(vendorEntry));
    expect(() => assertNoOverlap(deepsweSnapshot, unpublished)).not.toThrow();
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
