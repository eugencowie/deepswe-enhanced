# Spec: Site metadata

What the site says about itself in the HTML it serves, before any JavaScript runs.

Web-filter classifiers, and the analysts who review a disputed category, often read a page without running its scripts. The served HTML used to be a title and an empty `#root`, so the site had nothing of its own to be judged by and took the category of its parent domain: OpenDNS files `eugen.codes` under Games and applies that to every subdomain, which blocks the site on filtered work networks. The category to read as is Talos's Computers and Internet. These changes cannot lift the block on their own, because the category is inherited; they give a dispute something to decide on.

Decisions (grilling, 2026-09-30):

- **Hostname**: the site stays at `deepswe.eugen.codes`. Moving it off the parent domain was considered and rejected.
- **One description sentence**: "DeepSWE's coding agent leaderboard, plus what it doesn't report: cost per solved task, time at the consumer API throughput, and the effective cost on a Claude or ChatGPT subscription." It is the meta description, the Open Graph description, the JSON-LD description and the fallback paragraph. It is the masthead sentence, which lost the hyphen in "coding-agent" so the two are identical. Leaving "Claude or ChatGPT" out of the static HTML was considered, to stay clear of Talos's Generative AI category, and rejected: the user's workplace uses these tools, and the site exists to help coworkers choose models for work, so the wording stays consistent throughout.
- **Title**: unchanged. The description carries the explanation.
- **Fallback**: `index.html` holds a static copy of the masthead inside `#root` (logo mark, heading, description sentence) with the masthead's classes and an empty box in the mode toggle's place, so every parser sees text and the mount does not shift the layout. React replaces it on mount. It leaves out the provenance line, whose dates come from the data files. The copy is kept in step by a comment on both sides, like the theme script. Prerendering the app was rejected: it adds a build step, and would put a table of model names into the HTML.
- **Open Graph**: text only (`og:type`, `og:title`, `og:description`, `og:url`, and `twitter:card` as `summary`). No preview image, and no `og:site_name`, which would repeat the title.
- **JSON-LD**: one `WebApplication` block: `name`, `description`, `url`, `applicationCategory` as `DeveloperApplication`, and `isAccessibleForFree` as true.
- **Site URL**: the canonical link, `og:url` and the JSON-LD `url` need the site's absolute URL, and nothing in the repo names the domain ([continuous deployment](../continuous-deployment/spec.md)). `index.html` carries a `%VITE_SITE_URL%` placeholder, which Vite fills from the environment; the deploy and preview workflows pass it from a repository variable. A build without the variable falls back to a relative `/` ([continuous-integration ticket 01](../continuous-integration/tickets/01-template-ci-shape.md)), so local and e2e builds carry no literal placeholder. An empty or malformed value fails the build ([continuous-deployment ticket 04](../continuous-deployment/tickets/04-github-actions-deploy.md)). The canonical link is marked `vite-ignore`, because Vite would otherwise read a relative `href` as an asset to bundle.
- **Not added**: `sitemap.xml`, a `robots.txt`, `favicon.ico`. One page needs no sitemap, no `robots.txt` allows everything, and the SVG icon is declared in the head.
- **Tests**: the e2e suite reads the page with JavaScript disabled, so it asserts on what a crawler is served. It serves a build without a site URL, so it checks that the placeholder is filled the same way in all three places rather than pinning a value. A given URL is checked on the deployed site.

## Acceptance criteria

- With JavaScript disabled, the page shows the heading and the description sentence, and the head carries the description, the Open Graph tags and the JSON-LD block.
- A build given a site URL stamps it into the canonical link, `og:url` and the JSON-LD `url`. A build without one stamps a relative `/` there instead.
- The deployed HTML at <https://deepswe.eugen.codes/> carries all of the above with that URL.

## Tickets

- [01: Describe the site in the static HTML](tickets/01-describe-site-in-static-html.md)
