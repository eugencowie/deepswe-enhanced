# 04: One schema module owns every checked-in data file

Type: task
Status: resolved
Blocked by: none (can start immediately)

## What to build

Every checked-in data file (the DeepSWE snapshot, model mapping, vendor mapping, price revisions, throughput snapshot, tiers) has exactly one zod schema, and its TypeScript type is inferred from that schema rather than written by hand beside it. Today the shapes are declared twice (hand-written types plus unbound zod objects) and the schemas are scattered across the app's schema module and two refresh-script modules, so the shapes can drift silently and the refresh shells fall back to bare casts when reading files the app already validates.

Move every file schema into a single module in the data layer, keep the field-level comments on the schema fields, and shrink the shared types module to the UI-only types that no file carries (tier ids, access routes, subscription families). The app loads all six files through the schemas; the two hand-maintained files stop being plain casts, and the comment claiming refresh-written files are parsed becomes true. Both refresh shells read the model mapping through the same schema; the vendor-mapping and price-revisions schemas move out of the scripts into the module too. The load-time invariants (duplicate identities, mapping coverage, one vendor per family) stay where they are.

This is the prefactor for ticket 05.

## Decisions (grilled 2026-09-11)

- The module is `src/data/schema.ts`, as today; ADR 0004 already names it and the scripts already import from `src/data`. `types.ts` is deleted: tier ids, families and the version literals become `z.enum`/`z.literal` with inferred types, and `AccessRoute`, the only type no file carries, moves to `leaderboard.ts`.
- The app parses the four files it imports. Price revisions and the vendor mapping have no app consumer, so the refresh shells parse them through the same module and a schema test parses all six committed files on every run. The original "app parses all six" criterion is replaced below.
- Every file schema is a `strictObject` with uniform value constraints: non-empty identifier strings, non-negative money and token counts, `pass_at_1` in 0..1, `z.url()` on every `sourceUrl`. No timestamp format checks (the DeepSWE file carries microsecond precision with an offset; the others use `Z`). Current data passes.
- A shared `provenance` object is extended into each file schema. The shared `priceRevisionSchema` lives in the module; the bundle-table schema in the script imports it. Upstream fetch schemas (version manifest, leaderboard artifact, OpenRouter endpoints and listings) stay in the scripts: they describe fetched data, not data files.
- Existing-snapshot reads in both shells go through the schema instead of a cast, but the DeepSWE shell's "any read error means first run" catch-all is left for ticket 05, whose whole point is that policy.
- Each shell parses the snapshot it built through the file schema before writing, so the refresh can never commit a file the app rejects.
- Field comments stay as `//` comments beside schema fields, not `.describe()`.
- Glossary gains "Data file"; the refresh-written/hand-maintained split is retired. No ADR: one sentence appended to ADR 0004 records that the schema module owns every data-file shape and the scripts import it.

## Acceptance criteria

- [x] One module exports a schema and an inferred type for each of the six data files; no hand-written duplicate of a file shape remains, and `types.ts` is gone.
- [x] Neither refresh shell casts a JSON file; every read goes through a schema, and each shell parses its output through the file schema before writing.
- [x] The app parses the four files it imports; a schema test parses all six committed data files.
- [x] The DeepSWE snapshot, mapping and price-revision schema tests still pass, and `vp check`, `vp test` and the e2e suite are green.
- [x] docs/glossary.md and any ADR that names the old type module are updated if they point at moved symbols.

## Answer

Built in one commit. `src/data/schema.ts` owns six strict file schemas with inferred types; `types.ts` is deleted and `AccessRoute` lives in `leaderboard.ts`. The app parses its four files in `sources.ts`; `schema.test.ts` parses all six committed files and pins strictness (unknown key, pass rate above 1, empty slug). Both shells parse every data file they read and validate the snapshot (and the grown mapping) against the schema before writing.

One finding during the build: zod's parse returns a copy in schema key order, not file order. The shells therefore validate and then write the object the builder produced, and `hasMeaningfulChange` now compares with `isDeepStrictEqual` instead of serialised JSON, with a test pinning key-order insensitivity; without that, every DeepSWE refresh would have reported a change. Existing-snapshot error policy in the DeepSWE shell is untouched for ticket 05. `vp check` green, 155 tests pass, e2e 11 pass, build clean.
