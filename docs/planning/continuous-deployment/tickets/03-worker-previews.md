# 03: Make preview builds work with Worker Previews

Type: task
Status: resolved
Blocked by: none

## What to do

Step 7 of [ticket 02](02-cloudflare-workers-builds.md)'s cutover failed: a test pull request got no Cloudflare build at all. The Worker's build settings showed three causes.

1. **Disconnected repository.** The settings page said the project was disconnected from the Git account, so no push reached Cloudflare. That is fixed in the dashboard: Settings › Build › Git repository › Manage opens the "Cloudflare Workers and Pages" GitHub app, whose repository access must include `deepswe-enhanced`. If it already does, Cloudflare's documented fix is to uninstall and reinstall the app, then reconnect each project.
2. **The older preview model.** The Worker came up with a "Version command" and a "Set up Worker Previews" banner, the model that predates `wrangler preview`. Switching is a one-time dialog that cannot be undone. Its default command is `npx wrangler preview`, which fails here: npm rejects `npx` in this repo because `devEngines` names pnpm. Enter `pnpm run deploy:preview` instead. If the dialog insists on a literal `wrangler preview`, enter `pnpm exec wrangler preview`.
3. **No `previews` block** (`wrangler.jsonc`). `wrangler preview` requires one, even an empty one, because previews inherit nothing from the top level. This Worker has no variables, secrets or bindings, so the block is empty, and the dialog's "I have configured my Preview settings" can be ticked.

The header of `wrangler.jsonc` now names the dashboard's own label for preview builds, and warns against `npx`.

## Acceptance criteria

- The pull request for this ticket gets a `Workers Builds: deepswe-enhanced` check and a Cloudflare comment with a preview URL
- The preview URL serves the site

## Comments

**2026-10-01**. The dashboard fixes are done: the repository is reconnected to the GitHub app, and the Worker uses Worker Previews.
