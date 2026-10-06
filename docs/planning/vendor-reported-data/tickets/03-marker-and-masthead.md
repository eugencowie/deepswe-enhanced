# 03: Vendor-reported marker and masthead source

Type: task
Status: resolved
Blocked by: 02

## What to build

- **Marker.** A vendor-reported row shows a "vendor-reported" marker in its Model cell, in the enhancement colour (purple, as "enhanced" in the title). Its tooltip gives the source (linked), its publication date, the harness and trials when stated, and "read from a chart" when the figure came from a chart. DeepSWE rows are unchanged.
- **Masthead.** The Sources line gains a fourth item, "vendor-reported scores", unlinked and dated by the newest entry's `publishedAt` in the same date format as the others. Keep the comment in `src/App.tsx` saying every figure traces to these sources accurate. Leave the item out while the file has no entries.

See the [spec](../spec.md#app).

## Acceptance criteria

- [x] Fixture-driven component test: marker present on vendor-reported rows only, tooltip content per provenance field, "read from a chart" only for chart figures
- [x] Masthead shows the fourth source with the newest date when entries exist, and omits it when there are none
- [x] e2e smoke still passes; the marker reads in light and dark themes
- [x] `vp check` and `vp test` pass

## Comments

**Implementation notes (2026-10-04):**

- The marker is an outline badge in the brand colour, placed after the effort and before any access tag. The badge is itself the link to the vendor's source (same tab, like the masthead's sources), so the source is reachable without hovering; the spec's App section is revised to match. The tooltip carries the citation as text, built by `vendorReportedNote` in `src/components/vendor-reported-note.ts`, and the link's accessible name carries the same note for readers who can't hover.
- Review follow-up: `publishedAt` is now an ISO date in the schema, so a malformed date fails at parse rather than in the masthead.
- Unit tests run without a DOM, so the tooltip text is tested through `vendorReportedNote` and the marker through the Model cell's markup. `e2e/provenance.test.ts` derives the masthead's expected text from the data file, so it holds both before and after ticket 05.
- Verified with two temporary entries (one text, one chart): the e2e suite passed, and screenshots showed the marker and tooltip legible in light and dark themes. The data was restored afterwards.
