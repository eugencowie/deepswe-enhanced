# Spec: Effort filter

Picks whether the [leaderboard table](../leaderboard-table/spec.md) shows all effort levels or only each model's best entry. Vocabulary: effort level, best entry in [docs/glossary.md](../../glossary.md).

- **Best / All effort levels** toggle in the toolbar, defaulting to Best. Best = each model's best entry: highest Pass@1 on the raw fraction, higher effort level on an exact tie (effort order default → minimal → low → medium → high → xhigh → max; a single-entry model always keeps its entry). Route-independent, since tier rows share their entry's Pass@1. This matches the DeepSWE site's Best view; the earlier "highest effort" rule was corrected in ticket 02.
- Default view: **Best** entries — 25 rows, one per model; other effort levels are opt-in via the toolbar.
- Semantics shared with the other filters: intersection across controls; filters compose with sorting and never reset it. Filter state is in-memory only — URL persistence, a reset button, and a row counter were considered and deliberately left out of ticket 01.

## Acceptance criteria

- The default view shows the 25 best-entry rows, one per model.

## Tickets

- [01: Filters and default view](tickets/01-filters-default-view.md)
- [02: Best view picks the best Pass@1, not the highest effort](tickets/02-best-view-picks-best-pass-at-1.md)
