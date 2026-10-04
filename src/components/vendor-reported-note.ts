// The vendor-reported marker's tooltip: whose claim the row is, where it was
// published, and how much to trust the figure (ADR 0009).

import type { VendorReportedProvenance } from "@/data/leaderboard";

export function vendorReportedNote({
  source,
  publishedAt,
  figureFrom,
  harness,
  trials,
}: VendorReportedProvenance): string {
  return [
    "Reported by the vendor, not run by DeepSWE.",
    `${source}, ${publishedAt}.`,
    harness !== undefined && `Harness: ${harness}.`,
    trials !== undefined && `${trials} ${trials === 1 ? "trial" : "trials"}.`,
    figureFrom === "chart" && "Figure read from a chart.",
  ]
    .filter((sentence) => sentence !== false)
    .join(" ");
}
