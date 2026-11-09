# 02: Best view picks the best Pass@1, not the highest effort

Type: task
Status: resolved

## What to build

Change the Best view to keep each model's **best entry**: the entry with the highest Pass@1 on the raw fraction, with the higher effort level winning an exact tie. This supersedes the Best paragraph in [ticket 01](./01-filters-default-view.md), which claimed the DeepSWE site keeps the highest effort. It does not. The site's deployed bundle groups rows by model and picks with:

```js
[...s].sort((n, a) => a.pass_rate - n.pass_rate || V(a.reasoning_effort) - V(n.reasoning_effort))[0]
```

where `V` ranks effort as none < minimal < low < medium < high < xhigh < max (checked 2026-09-05 against `assets/live-leaderboard-*.js` at deepswe.datacurve.ai).

In the current snapshot this moves four models: gpt-6-astra to xhigh, claude-fable-5 to xhigh, grok-4-6 to medium, gemini-3-7-flash to medium. Exact ties occur in the data (gpt-6-astra scores identically at high and max) though none currently decides a pick, since astra's xhigh is higher still.

Implementation notes:

- `filterRows` in `src/data/leaderboard.ts` keeps the per-model, route-independent shape; only the pick changes from highest `effortRank` to highest `pass_at_1`, then `effortRank`.
- Add `minimal` to `EFFORT_ORDER` between default and `low` for parity with the site. No entry uses it today.
- Rewrite the "Best keeps the highest effort" unit test and the fable expectation in `e2e/filters.test.ts` (should be `Claude Fable 5 [xhigh]`). Add a tie case to the fixture.
- Fix the stale comment above `filterRows`.

Vocabulary: Best entry in [docs/glossary.md](../../../glossary.md), replacing "Best effort level".

## Acceptance criteria

- [x] Best shows each model's highest-Pass@1 entry; the four models above match the DeepSWE site's Best view.
- [x] An exact Pass@1 tie resolves to the higher effort level, covered by a unit test.
- [x] A single-entry model still keeps its entry.
- [x] `vp run ready` passes.

## Comments

Implemented 2026-09-05. `filterRows` in `src/data/leaderboard.ts` tracks the best Pass@1 per model and the effort that holds it; `EFFORT_ORDER` gained `minimal`. Unit tests cover the inverted, ordinary, tied and single-entry cases; `e2e/filters.test.ts` now expects `Claude Fable 5 [xhigh]`. The e2e suite could not run on the implementing machine (Chromium fails to load libglib), so the browser expectation is unverified there; the live-snapshot picks were checked through `visibleRows` instead and match the site for gpt-6-astra, claude-fable-5, grok-4-6 and gemini-3-7-flash.
