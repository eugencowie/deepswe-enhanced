# 01: Adopt the template's CI shape

Type: task
Status: resolved
Blocked by: none

## What to do

Make this repo's checks follow the same pattern as the astro template, so this repo and the portfolio validate the same way. It comes before moving the deploy to Cloudflare Workers Builds, which follows separately, and changes nothing about what is deployed.

1. **Scripts** (`package.json`, `mise.toml`): `ready` becomes `validate`, running `vp build`, `vp check`, `vp test` and `vp run e2e` in that order. `validate:fix` runs `vp check --fix`, then `validate`. The `e2e` mise task builds first, since the e2e suite serves the existing build. `e2e:install` goes.
2. **Chromium** (`package.json`, `pnpm-workspace.yaml`): a `@playwright/browser-chromium` devDependency, allowed to run its install script, so `vp install` brings the browser.
3. **Playwright** (`playwright.config.ts`): the web server is `vp preview` of the existing `dist` at `/`, on a port that does not clash with a developer's own preview. No sentinel base and no build of its own.
4. **Site URL fallback** (`vite.config.ts`, `e2e/metadata.test.ts`): `VITE_SITE_URL` defaults to `/` when unset, so a build nobody configured carries a relative canonical rather than the literal placeholder. The metadata test asserts the three URL fields carry one value and the placeholder is gone, not a pinned URL.
5. **Base path** (`.github/workflows/deploy.yml`, `src/App.tsx`): the deploy builds at `/` without a derived `--base`, which is what the custom domain already serves. The header's logo mark uses a plain `/favicon.svg#mark`.
6. **CI** (`.github/workflows/ci.yml`): one job named `ci`, one step per `validate` command, still uploading the Playwright report.
7. **Docs**: [ADR 0001](../../../architecture/0001-toolchain-conventions.md) loses the base-path and smoke paragraphs and gains the `validate` convention; this spec, the continuous-deployment and site-metadata specs, and the specs that name `vp run ready` follow.

### Manual step: required checks

The default-branch ruleset requires the `ready` and `e2e` checks, which this change replaces with `ci`. Switch the ruleset to require `ci` just before merging, not earlier: every other open pull request still reports the old names until it is rebased. The ruleset is managed in Terraform in the infrastructure repo (`repos/repositories.tf`, `required_status_checks`), not in the GitHub settings page.

## Acceptance criteria

- [x] `vp run validate` passes locally after a fresh `vp install`, with no separate browser install
- [x] A build without `VITE_SITE_URL` stamps `/` into the canonical link, `og:url` and the JSON-LD `url`, without a warning
- [x] A build given `VITE_SITE_URL` stamps that URL instead
- [x] The CI run on the pull request shows one `ci` job with a step per command
- [x] The ruleset requires `ci` instead of `ready` and `e2e`

## Comments

**2026-10-01**. Implemented. A relative `/` in the canonical link broke the build, because Vite reads a relative `<link href>` as an asset to bundle. The canonical link is therefore marked `vite-ignore`, which Vite strips from the output. An empty `VITE_SITE_URL` falls back too. Verified locally: `vp run validate` passes after deleting `node_modules` and pointing Playwright at an empty browser cache, so a cached pnpm store still downloads Chromium. Builds without the variable, with it empty, and with it set all stamp the expected URL without warnings, and so does `vp dev`. Remaining: the ruleset switch just before merging.

**2026-10-01**. The `ci` job passed on [#85](https://github.com/eugencowie/deepswe-enhanced/pull/85), with one step each for build, check, test and e2e. Chromium came from the dependency install alone.

**2026-10-01**. The ruleset now requires `ci`, applied from [infrastructure#30](https://github.com/eugencowie/infrastructure/pull/30). #85 was the only open pull request at the time, so no other pull request was left waiting on the old checks.
