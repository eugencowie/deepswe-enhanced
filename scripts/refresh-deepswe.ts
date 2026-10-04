// Refreshes data/deepswe-v1.1.json from the live DeepSWE source. Run via
// `vp run refresh:deepswe`, locally or from the scheduled workflow; changes
// land only through human-reviewed commits. Fails without writing anything
// when a guard rail trips.

import { createHash } from "node:crypto";
import {
  type ModelMappingEntry,
  deepsweSnapshotSchema,
  modelMappingSchema,
  priceRevisionsFileSchema,
  vendorReportedSnapshotSchema,
} from "../src/data/schema.ts";
import {
  extractBundlePriceTable,
  indexBundlePaths,
  resolvePriceRevisions,
} from "./deepswe-price-revisions.ts";
import {
  artifactUrl,
  benchmarkVersion,
  hasMeaningfulChange,
  leaderboardArtifactSchema,
  normalize,
  origin,
  summarizeRefresh,
  unmappedModels,
  versionManifestSchema,
} from "./deepswe-snapshot.ts";
import {
  generateMappingEntries,
  openrouterModelsSchema,
  openrouterModelsUrl,
} from "./mapping-generation.ts";
import { supersedeVendorReported } from "./vendor-reported-supersession.ts";
import {
  fetchBytes,
  fetchJson,
  publishSummary,
  readDataFile,
  readExistingSnapshot,
  warn,
  writeDataFile,
} from "./refresh-io.ts";

const manifest = await fetchJson(`${origin}/artifacts/versions.json`, versionManifestSchema);

const artifactBytes = await fetchBytes(artifactUrl(manifest));
const artifact = leaderboardArtifactSchema.parse(JSON.parse(artifactBytes.toString("utf8")));
const rawSha256 = createHash("sha256").update(artifactBytes).digest("hex");

const mapping = await readDataFile("model-mapping.json", modelMappingSchema);
const vendorReported = await readDataFile("vendor-reported.json", vendorReportedSnapshotSchema);

// The site's price revisions live only in its deployed bundle (ADR 0006), so
// every run extracts them and the checked-in file follows the site; the
// change lands in the Refresh PR. Any extraction failure is a hard error:
// warning and continuing is how the old factor table went stale (ticket 10).
const priceRevisionsFile = await readDataFile("price-revisions.json", priceRevisionsFileSchema);
const indexHtml = (await fetchBytes(`${origin}/`, "text/html")).toString("utf8");
const bundlePaths = indexBundlePaths(indexHtml);
if (bundlePaths.length === 0) {
  throw new Error(`No index-*.js bundle referenced by ${origin}/; cannot extract price revisions.`);
}
const bundles = await Promise.all(
  bundlePaths.map(async (path) => (await fetchBytes(`${origin}${path}`, "*/*")).toString("utf8")),
);
const revisions = resolvePriceRevisions(extractBundlePriceTable(bundles), benchmarkVersion);
const priceRevisionsChanged =
  JSON.stringify(priceRevisionsFile.revisions) !== JSON.stringify(revisions);

// New models from known vendors get generated mapping entries (ADR 0003);
// anything still unmapped afterwards fails normalize's guard as before.
const unmapped = unmappedModels(artifact.rows, mapping);
const generated: ModelMappingEntry[] = [];
if (unmapped.length > 0) {
  // An unreachable models API fails the run like any other fetch error; the
  // failure email is the alert and a manual re-run the retry.
  const listings = (await fetchJson(openrouterModelsUrl, openrouterModelsSchema)).data;
  const result = generateMappingEntries(unmapped, mapping, listings);
  result.warnings.forEach(warn);
  generated.push(...result.generated);
}

// Vendor-reported models DeepSWE now publishes go, every effort level at once
// (ADR 0009); an OpenRouter-id match also retires the model's mapping entry,
// which the generated one would otherwise duplicate.
const supersession = supersedeVendorReported({
  publishedModels: new Set(artifact.rows.map((row) => row.model)),
  vendorReported,
  mapping,
  generated,
});

const { snapshot, warnings } = normalize(
  manifest,
  artifact,
  supersession.mapping,
  revisions,
  rawSha256,
  new Set(supersession.standing),
);
warnings.forEach(warn);
// Validated before any write, so a generated entry colliding with an ordinary
// mapping entry's OpenRouter id fails the run with every file untouched.
modelMappingSchema.parse(supersession.mapping);

// Written only after normalize succeeds, so a tripped guard rail still leaves
// everything untouched.
if (priceRevisionsChanged) {
  await writeDataFile("price-revisions.json", priceRevisionsFileSchema, {
    ...priceRevisionsFile,
    revisions,
  });
  console.log(
    `Wrote data/price-revisions.json from the site's bundle: ${Object.keys(revisions).join(", ")}.`,
  );
}
if (generated.length > 0) {
  await writeDataFile("model-mapping.json", modelMappingSchema, supersession.mapping);
  console.log(
    `Generated mapping entries in data/model-mapping.json: ` +
      `${generated.map((entry) => entry.leaderboardModel).join(", ")}.`,
  );
}
if (supersession.superseded.length > 0) {
  await writeDataFile(
    "vendor-reported.json",
    vendorReportedSnapshotSchema,
    supersession.vendorReported,
  );
  console.log(
    `Superseded vendor-reported models in data/vendor-reported.json: ` +
      `${supersession.superseded.map(({ model }) => model).join(", ")}.`,
  );
}

const existing = await readExistingSnapshot("deepswe-v1.1.json", deepsweSnapshotSchema);
const changed = !existing || hasMeaningfulChange(existing, snapshot);
if (!changed) {
  console.log(
    "No content change; leaving data/deepswe-v1.1.json untouched " +
      `(upstream raw_sha256 ${rawSha256}, generated at ${snapshot.source_generated_at}).`,
  );
} else {
  await writeDataFile("deepswe-v1.1.json", deepsweSnapshotSchema, snapshot);
  console.log(
    `Wrote data/deepswe-v1.1.json: ${snapshot.entries.length} entries, ` +
      `source generated at ${snapshot.source_generated_at}.`,
  );
}

await publishSummary(
  summarizeRefresh({
    existing,
    snapshot,
    mappingCounts: { before: mapping.length, after: supersession.mapping.length },
    generated,
    changed,
    previousPriceRevisions: priceRevisionsFile.revisions,
    superseded: supersession.superseded,
    standing: supersession.standing,
  }),
);
