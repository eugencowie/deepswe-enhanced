# 06: Rows carry their Best-entry status

Type: task
Status: resolved
Blocked by: none (can start immediately)

## What to build

The Best entry (docs/glossary.md) is chosen per model and is independent of access route, yet the visible-rows filter recomputes a best-per-model map on every call and then needs a guarded closure to avoid matching a missing model's default-effort rows. Decide bestness once, at row derivation, and store it on the row as a boolean. The visible-rows filter becomes a single predicate over model selection, family route and effort view, and the per-call map, the guarded closure and its comment disappear.

Best-view behaviour is unchanged: highest Pass@1 on the raw fraction, higher effort level wins an exact tie, the same entry is best on every access route.

## Acceptance criteria

- [x] Each leaderboard row states whether it is its model's best entry; the value is identical across the model's access routes.
- [x] The visible-rows filter is one predicate with no per-call intermediate state.
- [x] Existing visible-rows tests (tie-break, same entry per route, single default-effort entry) pass without weakening.
- [x] The e2e effort-toggle test passes unchanged; `vp check` and `vp test` are green.

## Decisions (grilled 2026-09-11)

- Field: `isBestEntry: boolean`, required on every row, named for the glossary term. Not a per-row `bestEffort` string compared against `row.effort`; that would bring back the undefined-against-undefined case.
- Decided over snapshot entries inside `deriveRows`, before the per-route fan-out, so every route of an entry gets the same flag by construction. The comparator compares entries, not rows; a model missing from the best map cannot occur because the map is built from the entries being iterated.
- The DeepSWE rule comment (highest raw Pass@1, higher effort on a tie, Fable 5 picks xhigh over max) lives once on the best-entry computation. The filter predicate carries no comment.
- One new test under `rows` asserts the flag: exactly the expected effort's rows are flagged per model and every route of that entry agrees. `bestFixture` is hoisted so `rows` and `visibleRows` share it, and one of its models joins the Claude family so the route assertion has tier rows to check; the visibleRows tests stay untouched.
- `filterRows` goes; the predicate is inlined into the `visibleRows` closure in `createLeaderboard`.
- No ADR: easy to reverse and not surprising. The glossary already defines Best entry and needs no edit.

## Answer

Built in commit `beb6230` and the review follow-up on this branch. `deriveRows` decides each model's best entry over the snapshot entries and stamps `isBestEntry` on every row of that entry; `visibleRows` is one inlined predicate. Review findings applied: the flag is computed once per entry above the per-route row factory, `effortRank` accepts the snapshot's null directly, and the new test asserts the set of flagged efforts per model so a second flagged effort cannot hide.
