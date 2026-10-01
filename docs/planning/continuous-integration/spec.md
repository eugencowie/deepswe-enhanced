# Spec: Continuous integration

The check gate every change passes before it reaches `main` and production. Preview deploys of other branches do not wait for it.

- `vp run validate` is the gate: `vp build`, `vp check`, `vp test`, the Playwright e2e suite against `vp preview` of that build, then a Wrangler dry-run deploy. `vp run validate:fix` fixes formatting and lint first. The shape matches the astro template and the portfolio ([ADR 0001](../../architecture/0001-toolchain-conventions.md)).
- `.github/workflows/ci.yml` runs on pull requests: one `ci` job with a step per `validate` command, which uploads the Playwright report. The default-branch ruleset requires the `ci` check, so nothing reaches `main`, and from there the [deployed site](../continuous-deployment/spec.md), without passing it.

## Acceptance criteria

- `vp run validate` passes after a fresh install, with no separate browser install.
- The default-branch ruleset requires the `ci` check.
- The Playwright smoke passes: the build renders the table with no failed requests.

## Tickets

The gate was first built in [project-structure ticket 01](../project-structure/tickets/01-scaffold-and-deploy-foundation.md) and the e2e job in [leaderboard-table ticket 01](../leaderboard-table/tickets/01-base-api-rows-table.md).

- [01: Adopt the template's CI shape](tickets/01-template-ci-shape.md)
