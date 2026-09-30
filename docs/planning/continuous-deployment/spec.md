# Spec: Continuous deployment

Publishes `main` to GitHub Pages at <https://deepswe.eugen.codes/>. The custom domain is a repository Pages setting, not a file in the repo, so a fork or recreated repo has to set it again; without it the site serves at the project URL <https://eugencowie.github.io/deepswe-enhanced/>.

- Pushes to `main` (and manual `workflow_dispatch` runs, for redeploying after a Pages settings change) build and deploy via `actions/upload-pages-artifact` and `actions/deploy-pages`, gated by the ready job from [continuous integration](../continuous-integration/spec.md). Pages uses "GitHub Actions" as the source.
- The deploy job derives the base path from `actions/configure-pages` and passes it to `vp build --base`. With the custom domain set this is `/`; without it, `/deepswe-enhanced/`. Nothing hardcodes either; local builds use `/`. The Playwright e2e smoke (leaderboard-table ticket 01, [ADR 0001](../../architecture/0001-toolchain-conventions.md)) guards the root-absolute-URL gap this leaves.
- The deploy job also passes the site's absolute URL to the build as `VITE_SITE_URL`: the `base_url` that `actions/configure-pages` reports, plus a trailing slash. [Site metadata](../site-metadata/spec.md) stamps it into the canonical link and its companions. Like the base path, it is derived, never hardcoded.

## Acceptance criteria

- A push to `main` that passes the gate deploys the site at <https://deepswe.eugen.codes/> with the correct base path.
- <https://eugencowie.github.io/deepswe-enhanced/> redirects to the custom domain.

## Tickets

Initial deploy built in [project-structure ticket 01](../project-structure/tickets/01-scaffold-and-deploy-foundation.md).

- [01: Custom domain](tickets/01-custom-domain.md)
