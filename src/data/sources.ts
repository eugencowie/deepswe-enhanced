import rawSnapshot from "../../data/deepswe-v1.1.json" with { type: "json" };
import rawMapping from "../../data/model-mapping.json" with { type: "json" };
import rawThroughput from "../../data/openrouter-throughput.json" with { type: "json" };
import rawTiers from "../../data/tiers.json" with { type: "json" };
import rawVendorReported from "../../data/vendor-reported.json" with { type: "json" };
import type { LeaderboardSources } from "./leaderboard.ts";
import {
  assertMappingCoverage,
  assertNoOverlap,
  deepsweSnapshotSchema,
  familyVendors as readFamilyVendors,
  modelMappingSchema,
  throughputSnapshotSchema,
  tiersSnapshotSchema,
  vendorReportedSnapshotSchema,
} from "./schema.ts";

// Every data file the app reads is schema-parsed at load (ADR 0004), so
// malformed committed data fails here with an error naming the field.
export const deepsweSnapshot = deepsweSnapshotSchema.parse(rawSnapshot);
export const vendorReportedSnapshot = vendorReportedSnapshotSchema.parse(rawVendorReported);
export const modelMapping = modelMappingSchema.parse(rawMapping);
assertNoOverlap(deepsweSnapshot, vendorReportedSnapshot);
assertMappingCoverage(deepsweSnapshot, vendorReportedSnapshot, modelMapping);

export const throughputSnapshot = throughputSnapshotSchema.parse(rawThroughput);
export const tiersSnapshot = tiersSnapshotSchema.parse(rawTiers);
export const tiers = tiersSnapshot.tiers;
export const familyVendors = readFamilyVendors(modelMapping);

// The one place the live data is assembled for the leaderboard constructor;
// tests spread this to override a source.
export const leaderboardSources: LeaderboardSources = {
  snapshot: deepsweSnapshot,
  vendorReported: vendorReportedSnapshot,
  mapping: modelMapping,
  throughput: throughputSnapshot,
  tiers,
  familyVendors,
};
