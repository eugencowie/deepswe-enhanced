// Supersedes vendor-reported models once DeepSWE publishes them (ADR 0009):
// every effort level of the model goes at once, so no model's Best entry ever
// compares a DeepSWE figure against a vendor's. Pure: the refresh shell reads
// and writes the files.

import type { ModelMappingEntry, VendorReportedSnapshot } from "../src/data/schema.ts";

// Why a vendor-reported model went: DeepSWE published it under our guessed id,
// or under another id whose generated mapping entry shares our OpenRouter id.
export type Supersession =
  | { model: string; match: "id" }
  | { model: string; match: "openrouter-id"; publishedAs: string };

export function supersedeVendorReported(input: {
  publishedModels: ReadonlySet<string>; // every model in the refreshed snapshot
  vendorReported: VendorReportedSnapshot;
  mapping: ModelMappingEntry[]; // the checked-in mapping
  generated: ModelMappingEntry[]; // this run's generated entries (ADR 0003)
}): {
  vendorReported: VendorReportedSnapshot;
  mapping: ModelMappingEntry[]; // checked-in and generated entries, superseded ones removed
  superseded: Supersession[];
} {
  const { publishedModels, vendorReported, mapping, generated } = input;
  const claimed = [...new Set(vendorReported.entries.map((entry) => entry.model))];
  const openrouterIdOf = new Map(
    mapping.map((entry) => [entry.leaderboardModel, entry.openrouterId]),
  );
  // A null id matches nothing: the PR body's side-by-side lists catch those.
  const generatedByOpenrouterId = new Map(
    generated.flatMap((entry) =>
      entry.openrouterId === null ? [] : [[entry.openrouterId, entry.leaderboardModel]],
    ),
  );
  const superseded = claimed.flatMap((model): Supersession[] => {
    if (publishedModels.has(model)) return [{ model, match: "id" }];
    const openrouterId = openrouterIdOf.get(model);
    const publishedAs =
      openrouterId == null ? undefined : generatedByOpenrouterId.get(openrouterId);
    return publishedAs === undefined ? [] : [{ model, match: "openrouter-id", publishedAs }];
  });
  const gone = new Set(superseded.map(({ model }) => model));
  // Only an OpenRouter-id match retires the mapping entry: under an id match
  // the published model keeps it.
  const retired = new Set(
    superseded.flatMap((s) => (s.match === "openrouter-id" ? [s.model] : [])),
  );
  return {
    vendorReported: {
      ...vendorReported,
      entries: vendorReported.entries.filter((entry) => !gone.has(entry.model)),
    },
    mapping: [...mapping.filter((entry) => !retired.has(entry.leaderboardModel)), ...generated],
    superseded,
  };
}
