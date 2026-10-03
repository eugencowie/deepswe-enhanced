# Spec: Continuous deployment

Publishes `main` from a Cloudflare Worker at <https://deepswe.eugen.codes/>, built and deployed by GitHub Actions, as the portfolio is. The custom domain is a setting on the Worker, not a file in the repo, so a fork or recreated Worker has to set it again. Without it, the site serves only at the Worker's `workers.dev` URL.

- **Deploy**: `deploy.yml` runs on every push to `main`: it builds, then `wrangler deploy` uploads the build through `cloudflare/wrangler-action`. Deploys queue in one concurrency group, so two quick merges cannot go live out of order. The action records no GitHub Deployment for `wrangler deploy`, only for previews, so the workflow passes it no GitHub token. [Ticket 04](tickets/04-github-actions-deploy.md) has the setup steps.
- **Preview**: `preview.yml` runs on every pull request: the same build, then `wrangler preview`, which gives the branch its own preview URL. The action records a GitHub Deployment carrying the URL, so it shows on the pull request. A newer push cancels the in-flight run. Previews stay after the pull request closes, so old pull requests remain browsable; Cloudflare evicts the least recently deployed preview itself once a Worker has 100. A pull request from a fork fails at the Wrangler step, because GitHub withholds secrets from fork runs; Renovate's branches are in this repository, so none is expected.
- **Gate**: the workflows run no checks of their own. Merging to `main` needs the `validate` check from [continuous integration](../continuous-integration/spec.md), which ends with a Wrangler dry-run deploy, so a broken config fails before it reaches the Worker. A preview still builds for a pull request whose checks fail; it is a preview, not production.
- **Credentials**: the account ID and a user API token are the `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN` repository secrets. Each workflow's header lists the token's permissions. Nothing in the repo names the account.
- **Worker**: assets only, serving `dist` at the root path. Unknown paths get an empty 404, Cloudflare's default. The `workers.dev` URL stays live beside the custom domain, and the canonical link points crawlers at the domain.
- **Site URL**: the `SITE_URL` repository variable is the custom domain, named and shaped as the portfolio's is. Both workflows pass it to the build as `VITE_SITE_URL`, which parses it and adds the trailing slash the root is served at, so the slash is not a setting. An unset variable reaches the build as an empty string and fails it, as the portfolio's does, rather than shipping the relative fallback to production. [Site metadata](../site-metadata/spec.md) stamps it into the canonical link and its companions.
- **Versions**: the workflows install with `setup-vp`, as `validate.yml` does, so Vite+ reads the Node and pnpm versions from `devEngines` and nothing is kept in step by hand. The install skips Chromium, which only the e2e suite needs.
- **Manual deploy**: none. The `deploy` and `deploy:preview` scripts went with Workers Builds, their only caller, and the `deploy` mise task that wrapped the script went with them. A machine logged in with `wrangler login` can still build with `VITE_SITE_URL` set and run `vp exec wrangler deploy` by hand if Actions is unavailable.

## Acceptance criteria

- A push to `main` that passes the gate deploys the site at <https://deepswe.eugen.codes/>.
- A pull request gets a preview URL as a GitHub Deployment.
- A broken `wrangler.jsonc` fails `vp run validate`.

## Tickets

The initial deploy, to GitHub Pages, was built in [project-structure ticket 01](../project-structure/tickets/01-scaffold-and-deploy-foundation.md).

- [01: Custom domain](tickets/01-custom-domain.md), on GitHub Pages
- [02: Deploy from Cloudflare Workers Builds](tickets/02-cloudflare-workers-builds.md)
- [03: Make preview builds work with Worker Previews](tickets/03-worker-previews.md)
- [04: Deploy from GitHub Actions](tickets/04-github-actions-deploy.md)
