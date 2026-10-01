# 02: Deploy from Cloudflare Workers Builds

Type: task
Status: resolved
Blocked by: none

## What to do

Serve the site from a Cloudflare Worker that Workers Builds builds and deploys, instead of from GitHub Pages, as the portfolio does. Every branch then gets a preview URL, and the deploy needs no workflow. The custom domain and the site URL stay out of the repo, as dashboard settings.

### In the repo

1. **Wrangler** (`wrangler.jsonc`, `package.json`, `pnpm-workspace.yaml`): an assets-only Worker named `deepswe-enhanced` serving `./dist`, with defaults for unknown paths (a 404) and the `workers.dev` URL (on). A header comment lists the dashboard settings below, since Wrangler config cannot hold them. `wrangler` is an exact-pinned devDependency, so Workers Builds uses that version.
2. **Scripts** (`package.json`, `mise.toml`): `build` (`vp build`, for the dashboard's build command), `deploy` (`wrangler deploy`), `deploy:dry-run` and `deploy:preview` (`wrangler preview`). The `deploy` mise task runs `validate` first; the dry-run and preview tasks build first.
3. **Gate** (`package.json`, `.github/workflows/ci.yml`): `validate` and the `ci` job end with `deploy:dry-run`, so a broken Wrangler config fails before merge.
4. **Pages** (`.github/workflows/deploy.yml`, `.gitignore`): delete the deploy workflow; ignore `.wrangler/`.
5. **Docs**: the [spec](../spec.md), [ADR 0001](../../../architecture/0001-toolchain-conventions.md)'s deploy paragraph, and the specs that name GitHub Pages.

### Dashboard settings

Workers & Pages › Create application › Import a repository › `eugencowie/deepswe-enhanced`. Keep the Worker name `deepswe-enhanced`, the `name` in `wrangler.jsonc`; a different name fails the build. Enter these in the import form, which also holds the build variables under its advanced settings. They live under the Worker's Settings › Build afterwards.

| Setting                            | Value                                                     |
| ---------------------------------- | --------------------------------------------------------- |
| Build command                      | `pnpm run build`                                          |
| Deploy command                     | `pnpm run deploy`                                         |
| Preview command                    | `pnpm run deploy:preview`                                 |
| Root directory                     | `/`                                                       |
| Build watch paths                  | The default, include `*`, so every push builds            |
| Production branch                  | `main`                                                    |
| Preview builds                     | Enabled                                                   |
| `NODE_VERSION`                     | `devEngines.runtime.version` in `package.json`, `26.7.0`  |
| `PNPM_VERSION`                     | `devEngines.packageManager.version`, `11.22.0`            |
| `VITE_SITE_URL`                    | `https://deepswe.eugen.codes/`                            |
| `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` | `1`                                                       |

The last four are build variables, which `wrangler.jsonc` also lists. Workers Builds reads neither `devEngines` nor the lockfile for versions, so the two version variables follow `devEngines` by hand when `mise run upgrade` bumps it. Without the last one, every build's install downloads Chromium for the e2e suite, which the build never runs.

`wrangler preview` is in open beta. If it misbehaves, a Preview command of `pnpm exec wrangler versions upload`, as the portfolio uses, gives each branch a version URL instead.

### Cutover order

Merging this ticket's pull request deletes the Pages deploy. The site stays on its last Pages deployment until step 4, so nothing breaks in between, but merges in that window do not reach it.

1. Merge the pull request.
2. Cloudflare: create the Worker from the repository with the settings above. The first build deploys `main` to `deepswe-enhanced.<subdomain>.workers.dev`. Saved settings apply from the next build, so if any were added after the import, retry the first build.
3. Verify on the `workers.dev` URL: the table renders, and the page source carries the site URL in the canonical link. If the first build fails in the install step, check the `prepare` script (`vp config`) first.
4. Cloudflare DNS for `eugen.codes`: delete the `deepswe` CNAME to `eugencowie.github.io`. Cloudflare will not add a custom domain over an existing CNAME. Then, in the Worker's Settings › Domains & Routes, add the custom domain `deepswe.eugen.codes`. Cloudflare creates the record and the certificate.
5. Verify `https://deepswe.eugen.codes/` serves the Worker: `curl -sI` shows no `x-github-request-id` header.
6. GitHub: delete the Pages site, which drops its custom domain too, and the `github-pages` environment. The account-level `eugen.codes` verification stays, so no other account can claim its subdomains for Pages.
   ```sh
   gh api -X DELETE repos/eugencowie/deepswe-enhanced/pages
   gh api -X DELETE repos/eugencowie/deepswe-enhanced/environments/github-pages
   ```
7. Open a test pull request and check Cloudflare comments a preview URL on it. Its `Workers Builds: deepswe-enhanced` check stays informational; do not add it to the ruleset's required checks.

## Acceptance criteria

- [x] `vp run validate` runs a Wrangler dry-run deploy and fails on a broken Wrangler config
- [ ] A push to `main` deploys the site at <https://deepswe.eugen.codes/> from the Worker
- [ ] A pull request gets a preview URL from Cloudflare
- [ ] Pages is unpublished, and `deploy.yml` and the `github-pages` environment are gone

## Comments

**2026-10-01**. Resolved with the pull request rather than after the cutover, so closing it needs no second pull request. The cutover steps above follow the merge, and the three unticked criteria are checked during them. A problem found there becomes a new ticket. The dry-run fails on a missing assets directory and on a misspelt `assets` key. A scratch copy of the repo went through what Workers Builds runs, using plain Node `26.7.0` and pnpm `11.22.0` with no global `vp`: `pnpm install --frozen-lockfile`, `pnpm run build` with `VITE_SITE_URL` set, and `pnpm run deploy:dry-run`. All three passed. The `prepare` script needs `git`, which the build image has, since it clones the repository. The canonical link carried the given URL. `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` skipped the Chromium download in that install. `mise run deploy` refuses to start without `VITE_SITE_URL`, because a manual deploy would otherwise ship the relative fallback.
