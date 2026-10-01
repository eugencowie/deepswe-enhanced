# Spec: Continuous deployment

Publishes `main` to GitHub Pages at <https://deepswe.eugen.codes/>. The custom domain is a repository Pages setting, not a file in the repo, so a fork or recreated repo has to set it again. Without it, Pages publishes at the project URL <https://eugencowie.github.io/deepswe-enhanced/>, where the site's root-absolute URLs 404.

- Pushes to `main` (and manual `workflow_dispatch` runs, for redeploying after a Pages settings change) build and deploy via `actions/upload-pages-artifact` and `actions/deploy-pages`, gated by the `ci` check that [continuous integration](../continuous-integration/spec.md) requires before merging. Pages uses "GitHub Actions" as the source.
- The site is built for the root path, which is where the custom domain serves it. The base path used to be derived from `actions/configure-pages`; [continuous-integration ticket 01](../continuous-integration/tickets/01-template-ci-shape.md) dropped it.
- The deploy job also passes the site's absolute URL to the build as `VITE_SITE_URL`: the `base_url` that `actions/configure-pages` reports, plus a trailing slash. [Site metadata](../site-metadata/spec.md) stamps it into the canonical link and its companions. It is derived, never hardcoded.

## Acceptance criteria

- A push to `main` that passes the gate deploys the site at <https://deepswe.eugen.codes/>.
- <https://eugencowie.github.io/deepswe-enhanced/> redirects to the custom domain.

## Tickets

Initial deploy built in [project-structure ticket 01](../project-structure/tickets/01-scaffold-and-deploy-foundation.md).

- [01: Custom domain](tickets/01-custom-domain.md)
