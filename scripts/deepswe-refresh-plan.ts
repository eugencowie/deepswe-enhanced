// What a DeepSWE refresh would write, from what it fetched and read: the
// snapshot, generated mapping entries and supersession of vendor-reported
// models. Pure, so a test can show a healthy Refresh PR passes the site's
// load-time checks (ADR 0004); the refresh shell fetches and writes.

import {
  type DeepsweSnapshot,
  type ModelMappingEntry,
  type PriceRevision,
  type VendorReportedSnapshot,
  modelMappingSchema,
} from "../src/data/schema.ts";
import {
  type LeaderboardArtifact,
  type VersionManifest,
  normalize,
  unmappedModels,
} from "./deepswe-snapshot.ts";
import { type OpenrouterListing, generateMappingEntries } from "./mapping-generation.ts";
import {
  type SupersessionResult,
  supersedeVendorReported,
} from "./vendor-reported-supersession.ts";

export function planDeepsweRefresh(input: {
  manifest: VersionManifest;
  artifact: LeaderboardArtifact;
  rawSha256: string;
  mapping: ModelMappingEntry[]; // data/model-mapping.json as checked in
  vendorReported: VendorReportedSnapshot; // data/vendor-reported.json as checked in
  revisions: Readonly<Record<string, PriceRevision>>; // from the site's bundle
  listings: OpenrouterListing[]; // consulted only for unmapped models
}): {
  snapshot: DeepsweSnapshot;
  generated: ModelMappingEntry[];
  supersession: SupersessionResult;
  warnings: string[];
} {
  const { manifest, artifact, rawSha256, mapping, vendorReported, revisions, listings } = input;

  // New models from known vendors get generated mapping entries (ADR 0003);
  // anything still unmapped afterwards fails normalize's guard as before.
  const generation = generateMappingEntries(
    unmappedModels(artifact.rows, mapping),
    mapping,
    listings,
  );

  // Vendor-reported models DeepSWE now publishes go, every effort level at
  // once (ADR 0009); an OpenRouter-id match also retires the model's mapping
  // entry, which the generated one would otherwise duplicate.
  const supersession = supersedeVendorReported({
    publishedModels: new Set(artifact.rows.map((row) => row.model)),
    vendorReported,
    mapping,
    generated: generation.generated,
  });

  const { snapshot, warnings } = normalize({
    manifest,
    artifact,
    mapping: supersession.mapping,
    priceRevisions: revisions,
    rawSha256,
    vendorReportedModels: new Set(supersession.standing),
  });
  // Validated here, before the shell writes anything, so a generated entry
  // colliding with an ordinary mapping entry's OpenRouter id fails the run
  // with every file untouched.
  modelMappingSchema.parse(supersession.mapping);

  return {
    snapshot,
    generated: generation.generated,
    supersession,
    warnings: [...generation.warnings, ...warnings],
  };
}
