// A vendor-reported name's tooltip and accessible description: whose claim the
// row is, where it was published, and under what method (ADR 0009).
// Its own module, unlike the column module's private formatters (ADR 0007),
// because a component module exports only components (fast refresh).

import type { VendorReportedProvenance } from "@/data/leaderboard";

export function vendorReportedNote({
  source,
  publishedAt,
  harness,
  trials,
}: VendorReportedProvenance): string {
  return [
    "Reported by the vendor, not run by DeepSWE.",
    `${source}, ${publishedAt}.`,
    harness !== undefined && `Harness: ${harness}.`,
    trials !== undefined && `${trials} ${trials === 1 ? "trial" : "trials"}.`,
  ]
    .filter((sentence) => sentence !== false)
    .join(" ");
}
