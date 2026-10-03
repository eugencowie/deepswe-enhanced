# 04: Deploy from GitHub Actions

Type: task
Status: resolved
Blocked by: none

## What to do

Deploy the Worker from GitHub Actions instead of Cloudflare Workers Builds, as the portfolio now does. The repository then holds the whole deploy: two workflows, and the secrets and variable they read. Workers Builds kept its settings in the dashboard, listed by hand in a `wrangler.jsonc` header, and needed the Node and pnpm versions copied over on every upgrade.

### In the repo

1. **Deploy** (`.github/workflows/deploy.yml`): on every push to `main`, build with `VITE_SITE_URL` from the `SITE_URL` repository variable, then `cloudflare/wrangler-action` runs `wrangler deploy`. One `deploy` concurrency group queues runs, so two quick merges cannot go live out of order.
2. **Preview** (`.github/workflows/preview.yml`): on every pull request, the same build, then `wrangler preview`. Wrangler names the preview after the branch, from `GITHUB_HEAD_REF`. A newer push cancels the in-flight run. The action's `gitHubToken` lets it record a GitHub Deployment carrying the preview URL, which shows on the pull request.
3. **Install** (both workflows): `setup-vp` installs dependencies as `validate.yml` does, with `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD` set, since neither workflow runs the e2e suite. Vite+ reads the Node and pnpm versions from `devEngines`, so nothing is copied by hand.
4. **Scripts** (`package.json`, `mise.toml`): drop `deploy` and `deploy:preview`, which only Workers Builds called; the workflows run Wrangler through the action. `deploy:dry-run` stays, because `validate` runs it, and names `wrangler` directly now that `deploy` is gone.
5. **Wrangler** (`wrangler.jsonc`): drop the header of dashboard settings. Each workflow's header lists the secrets and variable it needs instead.
6. **Site URL** (`vite.config.ts`): the build parses `VITE_SITE_URL` as a URL and gives it a trailing slash, since that is how the root is served, so the variable can be set with or without one, as the portfolio's is. A malformed value fails the build.
7. **Docs**: the [spec](../spec.md), [ADR 0001](../../../architecture/0001-toolchain-conventions.md)'s deploy and mise-task paragraphs, and the specs that name Workers Builds.

### Repository settings

| Setting                        | Value                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------- |
| Secret `CLOUDFLARE_ACCOUNT_ID` | The account that owns the Worker, shown on the dashboard's Workers & Pages overview       |
| Secret `CLOUDFLARE_API_TOKEN`  | A user API token with Account Settings: Read, Workers Scripts: Edit, User Details: Read   |
| Variable `SITE_URL`            | `https://deepswe.eugen.codes`, the custom domain; the build adds the trailing slash        |

The portfolio's token has the same permissions and is scoped to the account, not to a Worker, so it can be reused here.

```sh
gh secret set CLOUDFLARE_ACCOUNT_ID
gh secret set CLOUDFLARE_API_TOKEN
gh variable set SITE_URL --body https://deepswe.eugen.codes
```

### Cutover order

Both paths deploy the same Worker, so the order only avoids building twice. Nothing goes dark between steps.

1. Set the two secrets. The variable was set with this ticket.
2. Cloudflare, the Worker's Settings › Build › Git repository: disconnect the repository. Workers Builds then stops building pushes. The Worker, its custom domain and its deployments stay.
3. Merge the pull request. The push to `main` runs Deploy.
4. Verify: the Worker's Deployments tab shows a deployment from Wrangler rather than Workers Builds, <https://deepswe.eugen.codes/> renders the table, and the page source carries the site URL in the canonical link.
5. Open a test pull request and check Preview records a Deployment whose URL serves the site.
6. GitHub, Settings › Integrations › GitHub Apps › Cloudflare Workers and Pages: remove `deepswe-enhanced` from the app's repository access, so Cloudflare no longer sees pushes it has nothing to do with.

## Acceptance criteria

- A push to `main` deploys the site at <https://deepswe.eugen.codes> from the Deploy workflow
- A pull request gets a preview URL from the Preview workflow, as a GitHub Deployment
- The `Workers Builds: deepswe-enhanced` check no longer appears on pull requests
- `vp run validate` still runs the Wrangler dry-run deploy
