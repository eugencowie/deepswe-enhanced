# 01: Describe the site in the static HTML

Type: task
Status: ready-for-human

## What to build

Give the served HTML enough text and metadata to be categorised on its own, per the [spec](../spec.md):

1. **Head** (`index.html`): a meta description, `og:type`, `og:title`, `og:description`, `twitter:card`, and a `WebApplication` JSON-LD block. The title stays as it is.
2. **Site URL** (`index.html`, `.github/workflows/deploy.yml`): a canonical link, `og:url` and the JSON-LD `url`, all from a `%VITE_SITE_URL%` placeholder. The deploy job sets `VITE_SITE_URL` to the `base_url` that `actions/configure-pages` reports, plus a trailing slash.
3. **Fallback** (`index.html`): a static copy of the masthead inside `#root` (logo mark, heading, description sentence) with the masthead's classes. A comment on both sides points at the other.
4. **Masthead** (`src/App.tsx`): "coding-agent" becomes "coding agent".
5. **Tests** (`e2e/metadata.test.ts`, `playwright.config.ts`): the e2e build gets a stand-in site URL; the tests load the page with JavaScript disabled.

## Acceptance criteria

- [x] With JavaScript disabled, the heading and the description sentence are visible and no request fails at a non-root base
- [x] The head carries the description, the Open Graph tags and `twitter:card`
- [x] A build given `VITE_SITE_URL` stamps it into the canonical link, `og:url` and the JSON-LD `url`
- [x] The fallback and the mounted masthead put the logo, heading and sentence at the same position
- [x] `vp run ready` and the e2e task pass
- [ ] After the deploy, `curl https://deepswe.eugen.codes/` returns the description, the fallback text and `https://deepswe.eugen.codes/` as the canonical URL

## Comments

**2026-09-30**. Implemented. The tests disable JavaScript in the browser context rather than fetching the response as text, so they assert on the parsed document and are not sensitive to how the HTML is wrapped. Position check: at 1100px wide, the heading, logo and sentence have identical bounding boxes before and after mount, in light and dark. With JavaScript disabled the theme script does not run either, so the fallback always renders light; with it enabled, the script sets the theme before the fallback paints. Status is `ready-for-human` until the deployed HTML is checked.
