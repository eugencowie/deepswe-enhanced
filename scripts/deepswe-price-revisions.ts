// Pure core for the DeepSWE site's price revisions: the per-entry cost
// adjustment factor, bundle extraction, and version resolution. The refresh
// shell does the fetching (ADR 0006).

import { z } from "zod";
import { type PriceRevision, type TokenRates, priceRevisionSchema } from "../src/data/schema.ts";

// An entry's mean token counts; cached is the subset of input served from cache.
export type TokenMix = { input: number; cached: number; output: number };

// The site's arithmetic verbatim: cached tokens are billed at the cached rate
// and removed from the input amount.
function weighted(rates: TokenRates, tokens: TokenMix): number {
  return (
    (tokens.input - tokens.cached) * rates.input +
    tokens.cached * rates.cached +
    tokens.output * rates.output
  );
}

export function costAdjustmentFactor(revision: PriceRevision, tokens: TokenMix): number {
  const before = weighted(revision.from, tokens);
  if (before <= 0) {
    // The site silently leaves such a row unadjusted; we refuse to guess.
    throw new Error(
      `Cannot derive a cost adjustment factor for a token mix that costs nothing at the old rates.`,
    );
  }
  return weighted(revision.to, tokens) / before;
}

// The bundle's table: a flat revision applies to every benchmark version;
// otherwise the entry is keyed by version id (deepseek-v4-pro today).
const nonEmpty = (record: Record<string, unknown>) => Object.keys(record).length > 0;

const versionedRevisionsSchema = z
  .record(z.string().min(1), priceRevisionSchema)
  .refine(nonEmpty, { message: "empty version map" });

export const bundlePriceTableSchema = z
  .record(z.string().min(1), z.union([priceRevisionSchema, versionedRevisionsSchema]))
  .refine(nonEmpty, { message: "empty price table" });

export type BundlePriceTable = z.infer<typeof bundlePriceTableSchema>;

export function resolvePriceRevisions(
  table: BundlePriceTable,
  version: string,
): Record<string, PriceRevision> {
  const resolved: Record<string, PriceRevision> = {};
  for (const [model, entry] of Object.entries(table)) {
    const flat = priceRevisionSchema.safeParse(entry);
    const revision = flat.success ? flat.data : versionedRevisionsSchema.parse(entry)[version];
    if (revision) resolved[model] = revision;
  }
  return resolved;
}

// Every index-*.js the site's index page references; the table has lived in
// one of them, and which one changes with each deploy.
export function indexBundlePaths(indexHtml: string): string[] {
  return [...new Set(indexHtml.match(/\/assets\/index-[\w-]+\.js/g) ?? [])];
}

// Object literals in a minified bundle assign as `NAME={"key":{`. Each such
// start is brace-matched and tried against the table schema; the extractor
// keys on the data shape because minified names change every deploy. The
// literal is not JSON (bare keys, `.15` decimals), hence the conversion.
const literalStart = /=\{"/g;
const maxLiteralLength = 20_000;

function balancedLiteral(source: string, start: number): string | null {
  let depth = 0;
  for (let i = start; i < source.length && i - start < maxLiteralLength; i++) {
    const char = source[i];
    if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (depth === 0) return source.slice(start, i + 1);
    } else if (char === '"' || char === "'" || char === "`") {
      // Skip a string so a brace inside it is not counted.
      let close = i + 1;
      while (close < source.length && source[close] !== char) {
        close += source[close] === "\\" ? 2 : 1;
      }
      if (close >= source.length) return null;
      i = close;
    }
  }
  return null;
}

function literalToJson(literal: string): string {
  return literal
    .replace(/([{,])([A-Za-z_$][\w$]*):/g, '$1"$2":')
    .replace(/([:[,])(-?)\.(\d)/g, "$1$20.$3");
}

function parseTable(literal: string): BundlePriceTable | null {
  try {
    const result = bundlePriceTableSchema.safeParse(JSON.parse(literalToJson(literal)));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

export function extractBundlePriceTable(bundleSources: string[]): BundlePriceTable {
  const found: BundlePriceTable[] = [];
  for (const source of bundleSources) {
    for (const match of source.matchAll(literalStart)) {
      const literal = balancedLiteral(source, match.index + 1);
      const table = literal ? parseTable(literal) : null;
      if (table) found.push(table);
    }
  }
  if (found.length !== 1) {
    throw new Error(
      found.length === 0
        ? `No price table found in ${bundleSources.length} bundle(s) from the DeepSWE site; ` +
            "the bundle's shape may have changed, or the site dropped its price revisions."
        : `Found ${found.length} price tables across the DeepSWE site's bundles; expected exactly one.`,
    );
  }
  return found[0]!;
}
