# 01: Custom domain `deepswe.eugen.codes`

Type: task
Status: resolved
Blocked by: none

## What to do

Serve the site at <https://deepswe.eugen.codes/> instead of the project URL. The domain is a repository Pages setting only: no `CNAME` file, so forks do not carry it. DNS is on Cloudflare. The record is DNS only (grey cloud) for the cutover, because GitHub may not issue its certificate while the name resolves to addresses other than its own; whether to proxy it afterwards is the operator's choice. `eugen.codes` is verified on the `eugencowie` account so no other account can claim its subdomains for Pages. The deploy workflow gains `workflow_dispatch` so a redeploy can be triggered without a code change.

### Records

Fill in the TXT value once GitHub shows it.

| Type  | Name                                          | Target / value            | Proxy at cutover |
| ----- | --------------------------------------------- | ------------------------- | ---------------- |
| CNAME | `deepswe.eugen.codes`                         | `eugencowie.github.io`    | DNS only         |
| TXT   | `_github-pages-challenge-eugencowie.eugen.codes` | _(from GitHub, step 2)_ | DNS only         |

### Cutover order

The deployed artifact is built with the base path GitHub reports at build time. Until a fresh deploy runs after the domain is set, the live build references `/deepswe-enhanced/...` assets, which 404 on the custom domain. Merging this ticket's PR last triggers that deploy.

1. Cloudflare: add the CNAME record above.
2. GitHub, Settings › Pages (account level) › Add a domain: enter `eugen.codes`, copy the TXT record it shows, add it in Cloudflare, then Verify.
3. GitHub, repo Settings › Pages › Custom domain: enter `deepswe.eugen.codes` and Save. Wait for the DNS check to pass.
4. Merge this PR. The push to `main` deploys with base path `/`.
5. Once GitHub has issued the certificate (a few minutes up to an hour), tick Enforce HTTPS; the setting is cleared when the domain changes.
6. Verify: `https://deepswe.eugen.codes/` loads with assets, `curl -I https://eugencowie.github.io/deepswe-enhanced/` returns a 301 to the custom domain, `http://deepswe.eugen.codes/` redirects to https.

## Acceptance criteria

- <https://deepswe.eugen.codes/> serves the site over HTTPS with a valid certificate and Enforce HTTPS on.
- <https://eugencowie.github.io/deepswe-enhanced/> redirects to the custom domain.
- `eugen.codes` shows as verified under the account's Pages domains.
- The deploy workflow can be run from the Actions tab.

## Comments

**2026-09-30**. Reworded so DNS only reads as a cutover step, not a standing rule. The record has since been switched to proxied, and the site is served through Cloudflare.

**2026-10-01**. Superseded by [ticket 02](02-cloudflare-workers-builds.md). The site moves to a Cloudflare Worker, and the domain becomes a custom domain on the Worker. The Pages custom domain and the CNAME to `eugencowie.github.io` go in its cutover.
