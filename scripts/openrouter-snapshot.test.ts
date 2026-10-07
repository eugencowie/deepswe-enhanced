import { describe, expect, it } from "vite-plus/test";
import rawModelMapping from "../data/model-mapping.json" with { type: "json" };
import rawVendorMapping from "../data/vendor-mapping.json" with { type: "json" };
import {
  type ModelMappingEntry,
  type ThroughputSnapshot,
  vendorMappingSchema,
} from "../src/data/schema.ts";
import {
  type OpenrouterEndpoint,
  buildSnapshot,
  retryAfterMs,
  summarizeRefresh,
} from "./openrouter-snapshot.ts";

const capturedAt = "2026-08-27T12:00:00Z";

function endpoint(
  tag: string,
  p50: number | null,
  overrides: Partial<OpenrouterEndpoint> = {},
): OpenrouterEndpoint {
  return {
    tag,
    status: 0,
    quantization: null,
    throughput_last_30m: p50 == null ? null : { p50 },
    ...overrides,
  };
}

function mappingEntry(
  model: string,
  vendor: string,
  openrouterId: string | null,
): ModelMappingEntry {
  return {
    leaderboardModel: model,
    displayName: model,
    vendor,
    openrouterId,
    family: "none",
  };
}

const vendors = [{ vendor: "Vendor", consumerProviderSlug: "vendor" }];

describe("consumer endpoint selection", () => {
  it("selects the bare consumer slug and ignores other providers", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([["vendor/m", [endpoint("reseller", 200), endpoint("vendor", 55.5)]]]),
      null,
      capturedAt,
    );
    expect(snapshot).toEqual({
      source: "OpenRouter",
      sourceUrl: "https://openrouter.ai",
      capturedAt,
      models: { "vendor/m": { consumerP50: 55.5 } },
    });
    expect(warnings).toEqual([]);
  });

  it("matches slug + '/' + the endpoint's own quantization, but never a product suffix", () => {
    const { snapshot } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([
        [
          "vendor/m",
          [
            endpoint("vendor/highspeed", 90, { quantization: "fp8" }),
            endpoint("vendor/int4", 40, { quantization: "int4" }),
          ],
        ],
      ]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/m": { consumerP50: 40 } });
  });

  it("matches case-insensitively on both sides", () => {
    const { snapshot } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([["vendor/m", [endpoint("Vendor/FP8", 40, { quantization: "FP8" })]]]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/m": { consumerP50: 40 } });
  });

  it("excludes flex/priority service tiers even when the suffix parrots the quantization", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([
        [
          "vendor/m",
          [endpoint("vendor/flex", 90, { quantization: "flex" }), endpoint("other", 30)],
        ],
      ]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({});
    expect(warnings).toEqual([
      expect.stringContaining('No consumer endpoint matched slug vendor for "vendor/m"'),
    ]);
  });

  it("excludes service tiers case-insensitively", () => {
    const { snapshot } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([
        [
          "vendor/m",
          [endpoint("Vendor/Flex", 90, { quantization: "Flex" }), endpoint("vendor", 30)],
        ],
      ]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/m": { consumerP50: 30 } });
  });

  it("excludes inactive endpoints", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([["vendor/m", [endpoint("vendor", 55, { status: -3 }), endpoint("other", 30)]]]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({});
    expect(warnings).toHaveLength(1);
  });

  it("throws on an ambiguous match, naming the surviving tags", () => {
    expect(() =>
      buildSnapshot(
        [mappingEntry("m", "Vendor", "vendor/m")],
        vendors,
        new Map([
          [
            "vendor/m",
            [endpoint("vendor", 55), endpoint("vendor/fp8", 60, { quantization: "fp8" })],
          ],
        ]),
        null,
        capturedAt,
      ),
    ).toThrow(/Ambiguous consumer-endpoint match .* vendor, vendor\/fp8/);
  });
});

describe("guard rails", () => {
  it("throws when a mapping vendor is absent from the vendor mapping", () => {
    expect(() =>
      buildSnapshot(
        [mappingEntry("m", "Unmapped", "unmapped/m")],
        vendors,
        new Map([["unmapped/m", [endpoint("unmapped", 50)]]]),
        null,
        capturedAt,
      ),
    ).toThrow(/Vendor\(s\) missing from data\/vendor-mapping\.json: Unmapped/);
  });

  it("throws for a vendor missing from the vendor mapping even when its only model has no OpenRouter id yet", () => {
    expect(() =>
      buildSnapshot(
        [mappingEntry("m", "Vendor", "vendor/m"), mappingEntry("n", "Unmapped", null)],
        vendors,
        new Map([["vendor/m", [endpoint("vendor", 50)]]]),
        null,
        capturedAt,
      ),
    ).toThrow(/Vendor\(s\) missing from data\/vendor-mapping\.json: Unmapped/);
  });

  it("throws when every endpoint of every model is null — the unauthenticated symptom", () => {
    expect(() =>
      buildSnapshot(
        [mappingEntry("m", "Vendor", "vendor/m")],
        vendors,
        new Map([["vendor/m", [endpoint("vendor", null), endpoint("other", null)]]]),
        null,
        capturedAt,
      ),
    ).toThrow(/unauthenticated symptom/);
  });

  it("throws when a mapped model has no endpoint data at all", () => {
    expect(() =>
      buildSnapshot(
        [mappingEntry("m", "Vendor", "vendor/m")],
        vendors,
        new Map(),
        null,
        capturedAt,
      ),
    ).toThrow(/No OpenRouter endpoint data for "vendor\/m"/);
  });

  it("omits with a warning when the vendor deliberately runs no consumer endpoint", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("m", "NoConsumer", "nc/m"), mappingEntry("n", "Vendor", "vendor/n")],
      [...vendors, { vendor: "NoConsumer", consumerProviderSlug: null }],
      new Map([
        ["nc/m", [endpoint("reseller", 80)]],
        ["vendor/n", [endpoint("vendor", 50)]],
      ]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/n": { consumerP50: 50 } });
    expect(warnings).toEqual([
      expect.stringContaining('Vendor NoConsumer runs no consumer endpoint; "nc/m" omitted'),
    ]);
  });

  it("omits with a warning when the consumer endpoint has null throughput", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m")],
      vendors,
      new Map([["vendor/m", [endpoint("vendor", null), endpoint("other", 30)]]]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({});
    expect(warnings).toEqual([
      expect.stringContaining(
        'Consumer endpoint vendor for "vendor/m" has no 30-minute throughput',
      ),
    ]);
  });

  it("skips a null openrouterId with a warning instead of the missing-id error", () => {
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("pending", "Vendor", null), mappingEntry("n", "Vendor", "vendor/n")],
      vendors,
      new Map([["vendor/n", [endpoint("vendor", 50)]]]),
      null,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/n": { consumerP50: 50 } });
    expect(warnings).toEqual([expect.stringContaining('"pending" has no OpenRouter id yet')]);
  });

  it("names the previous value when a previously captured model disappears", () => {
    const existing: ThroughputSnapshot = {
      source: "OpenRouter",
      sourceUrl: "https://openrouter.ai",
      capturedAt: "2026-08-20T00:00:00Z",
      models: { "vendor/m": { consumerP50: 37 } },
    };
    const { warnings } = buildSnapshot(
      [mappingEntry("m", "Vendor", "vendor/m"), mappingEntry("n", "Vendor", "vendor/n")],
      vendors,
      new Map([
        ["vendor/m", [endpoint("reseller", 80)]],
        ["vendor/n", [endpoint("vendor", 50)]],
      ]),
      existing,
      capturedAt,
    );
    expect(warnings).toEqual([
      expect.stringContaining("Was 37 tok/s at the last capture (2026-08-20T00:00:00Z)"),
    ]);
  });

  it("warns when a model removed from the mapping disappears from the snapshot", () => {
    const existing: ThroughputSnapshot = {
      source: "OpenRouter",
      sourceUrl: "https://openrouter.ai",
      capturedAt: "2026-08-20T00:00:00Z",
      models: { "gone/model": { consumerP50: 62 }, "vendor/n": { consumerP50: 50 } },
    };
    const { snapshot, warnings } = buildSnapshot(
      [mappingEntry("n", "Vendor", "vendor/n")],
      vendors,
      new Map([["vendor/n", [endpoint("vendor", 50)]]]),
      existing,
      capturedAt,
    );
    expect(snapshot.models).toEqual({ "vendor/n": { consumerP50: 50 } });
    expect(warnings).toEqual([
      expect.stringContaining(
        '"gone/model" is no longer in the mapping; dropped from the snapshot ' +
          "(was 62 tok/s at the last capture, 2026-08-20T00:00:00Z)",
      ),
    ]);
  });
});

describe("retryAfterMs", () => {
  it("defaults to 30 s without a header and on garbage", () => {
    expect(retryAfterMs(null)).toBe(30_000);
    expect(retryAfterMs("soonish")).toBe(30_000);
  });

  it("parses delta-seconds and caps at 120 s", () => {
    expect(retryAfterMs("5")).toBe(5_000);
    expect(retryAfterMs("600")).toBe(120_000);
  });

  it("parses an HTTP date relative to now, clamped to 0..120 s", () => {
    const now = Date.parse("2026-08-27T12:00:00Z");
    expect(retryAfterMs("Thu, 27 Aug 2026 12:00:10 GMT", () => now)).toBe(10_000);
    expect(retryAfterMs("Thu, 27 Aug 2026 11:00:00 GMT", () => now)).toBe(0);
  });
});

describe("checked-in data files", () => {
  it("vendor-mapping.json parses and covers every vendor in model-mapping.json", () => {
    const vendorMapping = vendorMappingSchema.parse(rawVendorMapping);
    const covered = new Set(vendorMapping.map((entry) => entry.vendor));
    for (const entry of rawModelMapping as ModelMappingEntry[]) {
      expect(covered).toContain(entry.vendor);
    }
  });
});

describe("summarizeRefresh", () => {
  const snapshotWith = (ids: string[]): ThroughputSnapshot => ({
    source: "OpenRouter",
    sourceUrl: "https://openrouter.ai",
    capturedAt,
    models: Object.fromEntries(ids.map((id) => [id, { consumerP50: 50 }])),
  });

  it("names its source in the heading so it can share a PR body", () => {
    const text = summarizeRefresh(null, snapshotWith(["a/one"]), []);
    expect(text.startsWith("### OpenRouter data summary")).toBe(true);
  });

  it("tabulates before/after model counts, with a dash on first run", () => {
    expect(summarizeRefresh(null, snapshotWith(["a/one"]), [])).toContain("| Models | — | 1 |");
    expect(
      summarizeRefresh(snapshotWith(["a/one", "a/two"]), snapshotWith(["a/one"]), []),
    ).toContain("| Models | 2 | 1 |");
  });

  it("carries the capture time and every warning", () => {
    const text = summarizeRefresh(null, snapshotWith([]), ["gone", "omitted"]);
    expect(text).toContain(`Captured at ${capturedAt}.`);
    expect(text).toContain("Warnings:\n- gone\n- omitted");
    expect(summarizeRefresh(null, snapshotWith([]), [])).not.toContain("Warnings:");
  });
});
