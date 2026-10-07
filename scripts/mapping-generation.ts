// Generates model-mapping entries for new leaderboard models from known
// vendors (ADR 0003), so the Refresh PR carries the mapping change and
// review replaces hand-editing. Pure: the fetch lives in the refresh shell.

import { z } from "zod";
import type { ModelMappingEntry, SubscriptionFamily } from "../src/data/schema.ts";

export const openrouterModelsUrl = "https://openrouter.ai/api/v1/models";

export const openrouterModelsSchema = z.object({
  data: z.array(z.object({ id: z.string(), name: z.string() })),
});

export type OpenrouterListing = z.infer<typeof openrouterModelsSchema>["data"][number];

// z-ai/glm-5.3-flash -> glm-5-3-flash; validated against 23/25 checked-in
// entries (the 2 exceptions are DeepSeek's date-pinned ids, handled below).
function normalizedSuffix(id: string): string {
  return (id.split("/")[1] ?? "").replaceAll(".", "-");
}

function orgSlug(id: string): string {
  return id.split("/")[0] ?? "";
}

// Variant listings (":free", ":batch") and rolling aliases ("~org/model-latest")
// are never mapping targets.
function isMappable(listing: OpenrouterListing): boolean {
  return !listing.id.includes(":") && !listing.id.startsWith("~");
}

// "Z.ai: GLM 5.3 Flash" -> "GLM 5.3 Flash"; the trailing revision token only
// appears on date-pinned listings and their undated aliases, and ADR 0002
// keeps revisions out of UI labels.
function displayNameFrom(listing: OpenrouterListing, revisioned: boolean): string {
  const stripped = listing.name.replace(/^[^:]+: /, "");
  return revisioned ? stripped.replace(/ \d{4}$/, "") : stripped;
}

// A known vendor and every family its entries are in.
type VendorInfo = { vendor: ModelMappingEntry["vendor"]; families: Set<SubscriptionFamily> };

function knownVendorsBySlug(mapping: ModelMappingEntry[]): Map<string, VendorInfo> {
  const bySlug = new Map<string, VendorInfo>();
  for (const entry of mapping) {
    if (entry.openrouterId !== null) {
      const slug = orgSlug(entry.openrouterId);
      const known = bySlug.get(slug) ?? { vendor: entry.vendor, families: new Set() };
      known.families.add(entry.family);
      bySlug.set(slug, known);
    }
  }
  return bySlug;
}

export function generateMappingEntries(
  unmappedModels: string[],
  mapping: ModelMappingEntry[],
  listings: OpenrouterListing[],
): { generated: ModelMappingEntry[]; warnings: string[] } {
  const generated: ModelMappingEntry[] = [];
  const warnings: string[] = [];
  const bySlug = knownVendorsBySlug(mapping);
  const mappable = listings.filter(isMappable);

  for (const model of unmappedModels) {
    // Candidates are listings from known vendors only, each paired with its
    // vendor info here so nothing downstream looks the vendor up again.
    const candidates = mappable.flatMap((listing) => {
      const vendorInfo = bySlug.get(orgSlug(listing.id));
      return vendorInfo && normalizedSuffix(listing.id) === model ? [{ listing, vendorInfo }] : [];
    });

    const first = candidates[0];
    if (!first) continue; // unknown vendor: refresh guard fails the run
    const { listing: match, vendorInfo } = first;

    const slugs = new Set(candidates.map(({ listing }) => orgSlug(listing.id)));
    if (slugs.size > 1) {
      warnings.push(
        `Ambiguous OpenRouter match for "${model}" across vendors ` +
          `(${candidates.map(({ listing }) => listing.id).join(", ")}); add the entry by hand.`,
      );
      continue;
    }

    // The family the vendor's entries share, or "none" when they span
    // several: a family takes a model only when a primary source says its
    // tiers serve it, which is the reviewer's call (ADR 0011).
    const [sharedFamily, ...otherFamilies] = vendorInfo.families;
    const spansFamilies = sharedFamily === undefined || otherFamilies.length > 0;
    if (spansFamilies) {
      warnings.push(
        `"${model}": ${vendorInfo.vendor}'s entries span families ` +
          `${[...vendorInfo.families].join(", ")}; generated with family "none" — set it by ` +
          `hand if the family's tiers serve the model.`,
      );
    }
    const vendorAndFamily = {
      vendor: vendorInfo.vendor,
      family: spansFamilies ? "none" : sharedFamily,
    };

    // Ambiguous listings are the same model under dot/dash-variant ids, so
    // either name serves; only the id needs a human to pin one.
    if (candidates.length > 1) {
      warnings.push(
        `Ambiguous OpenRouter match for "${model}" ` +
          `(${candidates.map(({ listing }) => listing.id).join(", ")}); generated with a null ` +
          `OpenRouter id — pin one by hand.`,
      );
      generated.push(entryFor(model, vendorAndFamily, null, displayNameFrom(match, false)));
      continue;
    }

    // Same-org dated siblings mean the undated id is an alias that silently
    // drifts between revisions (ADR 0002); which revision to pin is a human
    // call.
    const matchSuffix = normalizedSuffix(match.id);
    const datedSiblings = mappable.filter((listing) => {
      const suffix = normalizedSuffix(listing.id);
      return (
        orgSlug(listing.id) === orgSlug(match.id) &&
        suffix.startsWith(`${matchSuffix}-`) &&
        /^\d{4}$/.test(suffix.slice(matchSuffix.length + 1))
      );
    });
    if (datedSiblings.length > 0) {
      warnings.push(
        `"${model}" has date-pinned OpenRouter listings ` +
          `(${datedSiblings.map((listing) => listing.id).join(", ")}); generated with a null ` +
          `OpenRouter id — pin the right revision by hand.`,
      );
      generated.push(entryFor(model, vendorAndFamily, null, displayNameFrom(match, true)));
      continue;
    }

    generated.push(entryFor(model, vendorAndFamily, match.id, displayNameFrom(match, false)));
  }

  return { generated, warnings };
}

function entryFor(
  leaderboardModel: string,
  { vendor, family }: Pick<ModelMappingEntry, "vendor" | "family">,
  openrouterId: string | null,
  displayName: string,
): ModelMappingEntry {
  return { leaderboardModel, displayName, vendor, openrouterId, family };
}
