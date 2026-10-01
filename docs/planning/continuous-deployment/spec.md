# Spec: Continuous deployment

Publishes `main` from a Cloudflare Worker at <https://deepswe.eugen.codes/>, built and deployed by Workers Builds, as the portfolio is. The custom domain is a setting on the Worker, not a file in the repo, so a fork or recreated Worker has to set it again. Without it, the site serves only at the Worker's `workers.dev` URL.

- **Builds**: Cloudflare's GitHub app builds every push. `main` runs the deploy command and goes to production. Other branches run the preview command, which gives the branch its own preview URL and comments it on the pull request. The settings live in the Cloudflare dashboard and are listed in the header of `wrangler.jsonc`; [ticket 02](tickets/02-cloudflare-workers-builds.md) has the setup steps.
- **Gate**: Workers Builds does not wait for GitHub checks. Merging to `main` needs the `ci` check from [continuous integration](../continuous-integration/spec.md), which ends with a Wrangler dry-run deploy, so a broken config fails before it reaches the Worker. Cloudflare's own check on a pull request is informational and not required.
- **Worker**: assets only, serving `dist` at the root path. Unknown paths get an empty 404, Cloudflare's default. The `workers.dev` URL stays live beside the custom domain, and the canonical link points crawlers at the domain.
- **Site URL**: `VITE_SITE_URL` is a build variable in the dashboard: the custom domain with a trailing slash. [Site metadata](../site-metadata/spec.md) stamps it into the canonical link and its companions.
- **Versions**: Workers Builds reads neither `devEngines` nor the lockfile, so the `NODE_VERSION` and `PNPM_VERSION` build variables are kept in step with `devEngines` in `package.json` by hand.
- **Manual deploy**: `mise run deploy` validates, then deploys from a machine logged in with `wrangler login`. It refuses to run without `VITE_SITE_URL` in the environment, which would ship the relative fallback. It is the fallback if Workers Builds is unavailable.

## Acceptance criteria

- A push to `main` that passes the gate deploys the site at <https://deepswe.eugen.codes/>.
- A pull request gets a preview URL from Cloudflare.
- A broken `wrangler.jsonc` fails `vp run validate`.

## Tickets

The initial deploy, to GitHub Pages, was built in [project-structure ticket 01](../project-structure/tickets/01-scaffold-and-deploy-foundation.md).

- [01: Custom domain](tickets/01-custom-domain.md), on GitHub Pages
- [02: Deploy from Cloudflare Workers Builds](tickets/02-cloudflare-workers-builds.md)
