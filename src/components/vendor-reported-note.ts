// A vendor-reported entry's method, as the vendor states it, for the line
// under the citation in the name's popover (ADR 0009). Its own module, unlike
// the column module's private formatters (ADR 0007), because a component
// module exports only components (fast refresh).

import type { VendorReportedProvenance } from "@/data/leaderboard";

export function vendorReportedMethod({
  harness,
  trials,
}: Pick<VendorReportedProvenance, "harness" | "trials">): string | undefined {
  const sentences = [
    harness !== undefined && `Harness: ${harness}.`,
    trials !== undefined && `${trials} ${trials === 1 ? "trial" : "trials"}.`,
  ].filter((sentence) => sentence !== false);
  return sentences.length > 0 ? sentences.join(" ") : undefined;
}
