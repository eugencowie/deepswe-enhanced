// Pure selection and snapshot assembly for the OpenRouter throughput refresh:
// schemas, guard rails, and the snapshot shape live here so the fetch/write
// shell stays thin and testable (mirrors deepswe-snapshot.ts).

import { z } from "zod";
import type {
  ModelMappingEntry,
  ThroughputSnapshot,
  VendorMappingEntry,
} from "../src/data/schema.ts";

export const origin = "https://openrouter.ai";

export function endpointsUrl(modelId: string): string {
  return `${origin}/api/v1/models/${modelId}/endpoints`;
}

// Only the fields the selection reads; unknown fields pass through. A mismatch
// is deliberately a hard error: the documented API path is unverified until
// the first keyed run, and a lenient parse would disguise a wrong field-name
// guess as 25 quiet endpoints.
export const endpointsResponseSchema = z.object({
  data: z.object({
    endpoints: z.array(
      z.object({
        tag: z.string(),
        status: z.number(),
        quantization: z.string().nullable().optional(),
        throughput_last_30m: z.object({ p50: z.number().nullable() }).nullable().optional(),
      }),
    ),
  }),
});

export type OpenrouterEndpoint = z.infer<
  typeof endpointsResponseSchema
>["data"]["endpoints"][number];

// Retry-After per RFC 9110: delta-seconds or an HTTP date. Absent or
// unparseable falls back to 30 s; every wait is capped at 120 s.
export function retryAfterMs(headerValue: string | null, now: () => number = Date.now): number {
  const capMs = 120_000;
  const defaultMs = 30_000;
  if (!headerValue) return defaultMs;
  const seconds = Number(headerValue);
  if (Number.isFinite(seconds)) return Math.min(Math.max(seconds, 0) * 1000, capMs);
  const date = Date.parse(headerValue);
  if (Number.isNaN(date)) return defaultMs;
  return Math.min(Math.max(date - now(), 0), capMs);
}

// A vendor's consumer endpoint carries the bare consumer provider slug, or
// slug + "/" + the endpoint's own quantization (a serving format, e.g.
// moonshotai/int4 — live data shows Moonshot and Z.ai never expose a bare
// slug). Product variants (moonshotai/highspeed), regions (azure/us), and
// speed tiers (openai/fast) never equal their quantization, so they can't
// match. The automated-refresh ticket 02 deviation from "exact match only", forced by that live
// data; ambiguity stays a hard error. Case-insensitive on both sides: slug
// casing carries no meaning, and an upstream case shuffle shouldn't flip the
// match.
function isConsumerTag(endpoint: OpenrouterEndpoint, slug: string): boolean {
  const tag = endpoint.tag.toLowerCase();
  const base = slug.toLowerCase();
  if (tag === base) return true;
  const quantization = endpoint.quantization?.toLowerCase();
  return quantization != null && tag === `${base}/${quantization}`;
}

const serviceTierPattern = /\/(?:flex|priority)$/i;

// Every mapping entry paired with its vendor's consumer provider slug. The
// vendor mapping is checked over the whole model mapping in one pass, so a
// vendor someone forgot to map fails the run here, distinct from a null slug
// that records a vendor deliberately running no consumer endpoint.
type ResolvedEntry = { entry: ModelMappingEntry; slug: string | null };

function resolveConsumerSlugs(
  mapping: ModelMappingEntry[],
  vendorMapping: VendorMappingEntry[],
): ResolvedEntry[] {
  const slugByVendor = new Map(
    vendorMapping.map((entry) => [entry.vendor, entry.consumerProviderSlug]),
  );
  const resolved: ResolvedEntry[] = [];
  const unmappedVendors = new Set<string>();
  for (const entry of mapping) {
    const slug = slugByVendor.get(entry.vendor);
    if (slug === undefined) {
      unmappedVendors.add(entry.vendor);
    } else {
      resolved.push({ entry, slug });
    }
  }
  if (unmappedVendors.size > 0) {
    throw new Error(
      `Vendor(s) missing from data/vendor-mapping.json: ${[...unmappedVendors].join(", ")}. ` +
        `Record a consumer provider slug, or null for a vendor that runs no consumer endpoint.`,
    );
  }
  return resolved;
}

export function buildSnapshot(
  mapping: ModelMappingEntry[],
  vendorMapping: VendorMappingEntry[],
  endpointsByModel: ReadonlyMap<string, OpenrouterEndpoint[]>,
  existing: ThroughputSnapshot | null,
  capturedAt: string,
): { snapshot: ThroughputSnapshot; warnings: string[] } {
  const warnings: string[] = [];
  const resolved = resolveConsumerSlugs(mapping, vendorMapping);

  const allEndpoints = [...endpointsByModel.values()].flat();
  if (allEndpoints.length > 0 && allEndpoints.every((e) => e.throughput_last_30m?.p50 == null)) {
    throw new Error(
      "Every endpoint returned null 30-minute throughput — the unauthenticated symptom. " +
        "Check OPENROUTER_API_KEY.",
    );
  }

  // Appended to omission warnings: ADR 0002 wants a disappearing consumer
  // endpoint to stand out from a model that never had one.
  const previously = (modelId: string): string => {
    const prior = existing?.models[modelId];
    return prior
      ? ` Was ${prior.consumerP50} tok/s at the last capture (${existing?.capturedAt}).`
      : "";
  };

  const models: ThroughputSnapshot["models"] = {};
  for (const { entry, slug } of resolved) {
    const modelId = entry.openrouterId;
    if (modelId === null) {
      warnings.push(
        `"${entry.leaderboardModel}" has no OpenRouter id yet (ADR 0003 pending pin); skipped.`,
      );
      continue;
    }
    if (modelId in models) continue;

    const endpoints = endpointsByModel.get(modelId);
    if (!endpoints) {
      throw new Error(
        `No OpenRouter endpoint data for "${modelId}". The mapping is wrong — ids are ` +
          `revision-pinned; fix data/model-mapping.json.`,
      );
    }

    if (slug === null) {
      warnings.push(
        `Vendor ${entry.vendor} runs no consumer endpoint; "${modelId}" omitted ` +
          `(blank in the UI).${previously(modelId)}`,
      );
      continue;
    }

    // No status filter: OpenRouter documents the status enum without meanings,
    // and a non-zero status (live: -2, -5) is a routing demotion that can sit
    // beside 100% uptime. The consumer endpoint is the only candidate, so
    // dropping it blanked the model through a brief outage; its p50 is still
    // measured on completed requests, so it's captured and the status warned.
    const candidates = endpoints
      .filter((endpoint) => !serviceTierPattern.test(endpoint.tag))
      .filter((endpoint) => isConsumerTag(endpoint, slug));

    if (candidates.length > 1) {
      throw new Error(
        `Ambiguous consumer-endpoint match for "${modelId}" (vendor ${entry.vendor}, ` +
          `slug ${slug}): ${candidates.map((c) => c.tag).join(", ")}. A human decides — ` +
          `record the exact slug in data/vendor-mapping.json.`,
      );
    }
    const match = candidates[0];
    if (!match) {
      warnings.push(
        `No consumer endpoint matched slug ${slug} for "${modelId}"; omitted ` +
          `(blank in the UI).${previously(modelId)}`,
      );
      continue;
    }
    const p50 = match.throughput_last_30m?.p50;
    if (p50 == null) {
      warnings.push(
        `Consumer endpoint ${match.tag} for "${modelId}" has no 30-minute throughput; ` +
          `omitted (blank in the UI).${previously(modelId)}`,
      );
      continue;
    }
    if (match.status !== 0) {
      warnings.push(
        `Consumer endpoint ${match.tag} for "${modelId}" reports status ${match.status} ` +
          `(demoted by OpenRouter); captured anyway.`,
      );
    }

    models[modelId] = { consumerP50: p50 };
  }

  // Catch-all for ADR 0002's disappearance consequence: the per-entry
  // warnings above only reach models still in the mapping, so a model removed
  // from the mapping while present in the old snapshot would vanish silently.
  if (existing) {
    const mappedIds = new Set(mapping.map((entry) => entry.openrouterId));
    for (const [modelId, prior] of Object.entries(existing.models)) {
      if (modelId in models || mappedIds.has(modelId)) continue;
      warnings.push(
        `"${modelId}" is no longer in the mapping; dropped from the snapshot ` +
          `(was ${prior.consumerP50} tok/s at the last capture, ${existing.capturedAt}).`,
      );
    }
  }

  return {
    snapshot: { source: "OpenRouter", sourceUrl: origin, capturedAt, models },
    warnings,
  };
}

// The Refresh PR body's summary (ADR 0004): the snapshot has no load-time
// invariants, so the reviewer's count acknowledgement, and any omission or
// disappearance warning whose previous value lives only in the review, must
// reach the PR. The heading names the source because the body also carries
// the DeepSWE summary (automated-refresh ticket 09).
export function summarizeRefresh(
  existing: ThroughputSnapshot | null,
  snapshot: ThroughputSnapshot,
  warnings: string[],
): string {
  const lines = [
    "### OpenRouter data summary",
    "",
    "| Measure | Before | After |",
    "| --- | ---: | ---: |",
    `| Models | ${existing ? Object.keys(existing.models).length : "—"} | ${Object.keys(snapshot.models).length} |`,
    "",
    `Captured at ${snapshot.capturedAt}.`,
  ];
  if (warnings.length > 0) {
    lines.push("", "Warnings:", ...warnings.map((warning) => `- ${warning}`));
  }
  return lines.join("\n");
}
