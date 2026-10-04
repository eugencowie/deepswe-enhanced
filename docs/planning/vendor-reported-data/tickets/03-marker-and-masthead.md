# 03: Vendor-reported marker and masthead source

Type: task
Status: ready-for-agent
Blocked by: 02

## What to build

- **Marker.** A vendor-reported row shows a "vendor-reported" marker in its Model cell, in the enhancement colour (purple, as "enhanced" in the title). Its tooltip gives the source (linked), its publication date, the harness and trials when stated, and "read from a chart" when the figure came from a chart. DeepSWE rows are unchanged.
- **Masthead.** The Sources line gains a fourth item, "vendor-reported scores", unlinked and dated by the newest entry's `publishedAt` in the same date format as the others. Keep the comment in `src/App.tsx` saying every figure traces to these sources accurate. Leave the item out while the file has no entries.

See the [spec](../spec.md#app).

## Acceptance criteria

- [ ] Fixture-driven component test: marker present on vendor-reported rows only, tooltip content per provenance field, "read from a chart" only for chart figures
- [ ] Masthead shows the fourth source with the newest date when entries exist, and omits it when there are none
- [ ] e2e smoke still passes; the marker reads in light and dark themes
- [ ] `vp check` and `vp test` pass
